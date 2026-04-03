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
      userId,
      weekStart,
      totalScrollMinutes,
      sessionsCount,
      averageMoodRating,
      peakScrollHour,
      dominantCategory,
      triggerPatterns,
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

module.exports = { 
  calculateMoodDurationInsight,
  updateBehaviorWeek,
  calculateWeeklyStats,
}