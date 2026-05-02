function calculateMoodDurationInsight(sessions) {
  if (!sessions || sessions.length < 7) {
    return { threshold: null, worsePercent: null, hasEnoughData: false }
  }

  sessions.sort((a, b) => a.durationMinutes - b.durationMinutes)

  for (let threshold = 15; threshold <= 120; threshold += 15) {
    const sessionsOverT = sessions.filter(s => s.durationMinutes > threshold)
    if (sessionsOverT.length < 3) continue

    const worseCount = sessionsOverT.filter(s => s.moodRating <= 2).length
    const worsePercent = (worseCount / sessionsOverT.length) * 100

    if (worsePercent >= 50) {
      return { threshold, worsePercent: Math.round(worsePercent), hasEnoughData: true }
    }
  }

  return { threshold: null, worsePercent: null, hasEnoughData: true }
}

async function updateBehaviorWeek(userId) {
  const Session = require('../models/Session.model')
  const Intention = require('../models/Intention.model')
  const BehaviorWeek = require('../models/BehaviorWeek.model')

  const now = new Date()
  const dayOfWeek = now.getUTCDay()
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const weekStart = new Date(now)
  weekStart.setUTCDate(now.getUTCDate() - daysToMonday)
  weekStart.setUTCHours(0, 0, 0, 0)

  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6)
  weekEnd.setUTCHours(23, 59, 59, 999)

  const sessions = await Session.find({
    userId,
    startTime: { $gte: weekStart, $lte: weekEnd }
  }).lean()

  const totalScrollMinutes = sessions.reduce((s, x) => s + x.durationMinutes, 0)
  const sessionsCount = sessions.length
  const averageMoodRating = sessionsCount > 0
    ? sessions.reduce((s, x) => s + x.moodRating, 0) / sessionsCount
    : null

  const hourCounts = {}
  sessions.forEach(s => {
    const h = new Date(s.startTime).getUTCHours()
    hourCounts[h] = (hourCounts[h] || 0) + 1
  })
  const peakScrollHour = Object.keys(hourCounts).length > 0
    ? parseInt(Object.keys(hourCounts).sort((a, b) => hourCounts[b] - hourCounts[a])[0])
    : null

  const platformCounts = {}
  sessions.forEach(s => {
    platformCounts[s.platform] = (platformCounts[s.platform] || 0) + 1
  })
  const dominantCategory = Object.keys(platformCounts).length > 0
    ? Object.keys(platformCounts).sort((a, b) => platformCounts[b] - platformCounts[a])[0]
    : null

  const intentions = await Intention.find({
    userId,
    timestamp: { $gte: weekStart, $lte: weekEnd }
  }).lean()
  const triggerPatterns = [...new Set(intentions.map(i => i.intentionCategory))]

  await BehaviorWeek.findOneAndUpdate(
    { userId, weekStart },
    {
      $set: {
        userId,
        weekStart,
        sessionsCount,
        averageMoodRating,
        peakScrollHour,
        dominantCategory,
        triggerPatterns,
      },
      $max: {
        totalScrollMinutes,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
}

function calculateWeeklyStats(sessions) {
  const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0)
  const sessionCount = sessions.length
  const avgDuration = sessionCount > 0 ? totalMinutes / sessionCount : null
  const avgMood = sessionCount > 0 ? sessions.reduce((sum, s) => sum + s.moodRating, 0) / sessionCount : null

  const dayCounts = {}
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  sessions.forEach(s => {
    const dayName = days[new Date(s.startTime).getDay()]
    dayCounts[dayName] = (dayCounts[dayName] || 0) + 1
  })

  let mostActiveDay = null
  let maxCount = 0
  for (const [day, count] of Object.entries(dayCounts)) {
    if (count > maxCount) {
      maxCount = count
      mostActiveDay = day
    }
  }

  const intentionBreakdown = {}
  sessions.forEach(s => {
    if (s.intentionCategory) {
      intentionBreakdown[s.intentionCategory] = (intentionBreakdown[s.intentionCategory] || 0) + 1
    }
  })

  return {
    totalMinutes,
    sessionCount,
    avgDuration,
    avgMood,
    mostActiveDay,
    intentionBreakdown,
  }
}

/**
 * Recalculate BehaviorWeek.totalScrollMinutes from BehaviorDay data
 * for all weeks in the given date range.
 * Called after Instagram upload so combined platform minutes are reflected
 * in BehaviorWeek — which drives bar charts, progress, and trend graphs.
 *
 * Does NOT touch careerRelevantPercent or interestPercent — those come
 * from YouTube classification and are not affected by Instagram.
 */
async function recalculateBehaviorWeeksFromDays(userId, startDateStr, endDateStr) {
  const BehaviorDay = require('../models/BehaviorDay.model')
  const BehaviorWeek = require('../models/BehaviorWeek.model')

  // Fetch all BehaviorDay records in the date range
  const days = await BehaviorDay.find({
    userId,
    date: { $gte: startDateStr, $lte: endDateStr },
  }).lean()

  if (days.length === 0) return { weeksUpdated: 0 }

  // Group days by ISO week (Monday start)
  const weekBuckets = {}
  days.forEach(d => {
    const dDate = new Date(d.date + 'T00:00:00Z')
    const utcDay = dDate.getUTCDay()
    const daysToMon = utcDay === 0 ? 6 : utcDay - 1
    const weekMonday = new Date(dDate)
    weekMonday.setUTCDate(dDate.getUTCDate() - daysToMon)
    weekMonday.setUTCHours(0, 0, 0, 0)
    const weekKey = weekMonday.toISOString().split('T')[0]

    if (!weekBuckets[weekKey]) {
      weekBuckets[weekKey] = { weekStart: weekMonday, days: [] }
    }
    weekBuckets[weekKey].days.push(d)
  })

  let weeksUpdated = 0

  for (const [weekKey, bucket] of Object.entries(weekBuckets)) {
    // Sum combined minutes from BehaviorDay
    const combinedMinutes = bucket.days.reduce((sum, d) => {
      return sum + (d.youtubeMinutes || 0) + (d.instagramMinutes || 0)
    }, 0)

    // Build combined interest minutes from Instagram (YouTube interests
    // are already in BehaviorWeek from classification — only update IG portion)
    const igInterestMinutes = {}
    bucket.days.forEach(d => {
      if (d.instagramInterestMinutes) {
        const obj = d.instagramInterestMinutes instanceof Map
          ? Object.fromEntries(d.instagramInterestMinutes)
          : d.instagramInterestMinutes
        Object.entries(obj).forEach(([k, v]) => {
          igInterestMinutes[k] = (igInterestMinutes[k] || 0) + (Number(v) || 0)
        })
      }
    })

    // Check if any day has Instagram data
    const hasInstagram = bucket.days.some(d => (d.instagramMinutes || 0) > 0)

    // Only update totalScrollMinutes — leave classification percentages intact
    const updateFields = {
      totalScrollMinutes: combinedMinutes,
    }

    // Merge Instagram interest minutes into dailyInterestMinutes
    // (YouTube interests are already there from classification)
    if (hasInstagram && Object.keys(igInterestMinutes).length > 0) {
      // Read existing doc to merge
      const existing = await BehaviorWeek.findOne({
        userId,
        weekStart: bucket.weekStart,
      }).select('dailyInterestMinutes').lean()

      if (existing) {
        const existingMins = existing.dailyInterestMinutes instanceof Map
          ? Object.fromEntries(existing.dailyInterestMinutes)
          : (existing.dailyInterestMinutes || {})

        // Merge: add IG interest minutes to existing YT interest minutes
        Object.entries(igInterestMinutes).forEach(([k, v]) => {
          const perDay = Math.round(v / 7)
          existingMins[k] = (existingMins[k] || 0) + perDay
        })
        updateFields.dailyInterestMinutes = existingMins
      }
    }

    await BehaviorWeek.findOneAndUpdate(
      { userId, weekStart: bucket.weekStart },
      { $set: updateFields },
      { upsert: false } // Only update existing weeks — don't create empty ones
    )
    weeksUpdated++
  }

  console.log(`[recalculateBehaviorWeeksFromDays] Updated ${weeksUpdated} weeks for user ${userId}`)
  return { weeksUpdated }
}

module.exports = { 
  calculateMoodDurationInsight,
  updateBehaviorWeek,
  calculateWeeklyStats,
  recalculateBehaviorWeeksFromDays,
}