const Session = require('../models/Session.model')
const Intention = require('../models/Intention.model')
const { validateIntentionCategory, validateSessionBody } = require('../utils/validate')
const { calculateMoodDurationInsight, updateBehaviorWeek } = require('../services/insights.service')

const logIntention = async (req, res) => {
  const { intentionCategory, timestamp, type } = req.body

  if (!validateIntentionCategory(intentionCategory)) {
    return res.status(400).json({ error: 'Invalid intention category' })
  }

  const today = new Date().toISOString().split('T')[0]

  await Intention.findOneAndUpdate(
    { userId: req.user._id, date: today },
    { 
      userId: req.user._id,
      date: today,
      intentionCategory,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      type: type || 'daily',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  res.status(200).json({ message: 'Intention saved', intention: { intentionCategory, date: today } })
}

const logSession = async (req, res) => {
  const errors = validateSessionBody(req.body)

  if (req.body.intentionCategory && !validateIntentionCategory(req.body.intentionCategory)) {
    errors.push('intentionCategory is invalid')
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors })
  }

  const { durationMinutes, moodRating, platform, timestamp, intentionCategory } = req.body

  const session = await Session.create({
    userId: req.user._id,
    platform,
    startTime: new Date(timestamp),
    durationMinutes: Math.round(durationMinutes),
    intentionCategory: intentionCategory || 'unset',
    moodRating: Math.round(moodRating),
  })

  updateBehaviorWeek(req.user._id).catch(err => 
    console.error('BehaviorWeek update failed:', err)
  )

  res.status(201).json({ message: 'Session logged', sessionId: session._id })
}

const getTodaySessions = async (req, res) => {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date()
  endOfDay.setHours(23, 59, 59, 999)

  const sessions = await Session.find({
    userId: req.user._id,
    startTime: { $gte: startOfDay, $lte: endOfDay }
  }).sort({ startTime: 1 })

  const today = new Date().toISOString().split('T')[0]
  const intention = await Intention.findOne({ 
    userId: req.user._id, date: today 
  })

  const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0)
  const averageMood = sessions.length > 0
    ? (sessions.reduce((sum, s) => sum + s.moodRating, 0) / sessions.length).toFixed(1)
    : null
  const platformBreakdown = sessions.reduce((acc, s) => {
    acc[s.platform] = (acc[s.platform] || 0) + s.durationMinutes
    return acc
  }, {})

  res.status(200).json({
    sessions: sessions.map(s => ({
      id: s._id,
      durationMinutes: s.durationMinutes,
      moodRating: s.moodRating,
      platform: s.platform,
      startTime: s.startTime,
    })),
    summary: {
      count: sessions.length,
      totalMinutes,
      averageMood,
      platformBreakdown,
    },
    todayIntention: intention 
      ? { intentionCategory: intention.intentionCategory, date: intention.date }
      : null,
  })
}

const getSessionStats = async (req, res) => {
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const weekStats = await Session.aggregate([
    { $match: { 
        userId: req.user._id, 
        startTime: { $gte: startOfWeek } 
    }},
    { $group: {
        _id: null,
        totalMinutes: { $sum: '$durationMinutes' },
        avgMood: { $avg: '$moodRating' },
        avgDuration: { $avg: '$durationMinutes' },
        sessionCount: { $sum: 1 },
        hours: { $push: { $hour: '$startTime' } }
    }}
  ])

  const allTimeStats = await Session.aggregate([
    { $match: { userId: req.user._id }},
    { $group: {
        _id: null,
        totalMinutes: { $sum: '$durationMinutes' },
        totalSessions: { $sum: 1 },
        avgMood: { $avg: '$moodRating' },
        avgDuration: { $avg: '$durationMinutes' },
    }}
  ])

  const allSessions = await Session.find({ userId: req.user._id })
    .select('durationMinutes moodRating')
    .lean()
  const moodInsight = calculateMoodDurationInsight(allSessions)

  const hours = weekStats[0] ? weekStats[0].hours : []
  const hourCounts = hours.reduce((acc, h) => {
    acc[h] = (acc[h] || 0) + 1; return acc
  }, {})
  const peakHour = Object.keys(hourCounts).length > 0
    ? Object.keys(hourCounts).sort((a, b) => hourCounts[b] - hourCounts[a])[0]
    : null

  res.status(200).json({
    week: {
      totalMinutes: weekStats[0] ? weekStats[0].totalMinutes : 0,
      avgMood: weekStats[0] && weekStats[0].avgMood 
        ? parseFloat(weekStats[0].avgMood.toFixed(1)) : null,
      avgDuration: weekStats[0] && weekStats[0].avgDuration 
        ? Math.round(weekStats[0].avgDuration) : null,
      sessionCount: weekStats[0] ? weekStats[0].sessionCount : 0,
      peakHour: peakHour !== null ? parseInt(peakHour) : null,
    },
    allTime: {
      totalMinutes: allTimeStats[0] ? allTimeStats[0].totalMinutes : 0,
      totalSessions: allTimeStats[0] ? allTimeStats[0].totalSessions : 0,
      avgMood: allTimeStats[0] && allTimeStats[0].avgMood 
        ? parseFloat(allTimeStats[0].avgMood.toFixed(1)) : null,
    },
    moodInsight,
    dailyLimitMinutes: req.user.dailyLimitMinutes || 90,
  })
}

module.exports = {
  logIntention,
  logSession,
  getTodaySessions,
  getSessionStats,
}