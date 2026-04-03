const Craving = require('../models/Craving.model')
const { validateCravingBody } = require('../utils/validate')

const logCraving = async (req, res) => {
  const errors = validateCravingBody(req.body)
  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors })
  }

  const { trigger, outcome, timestamp } = req.body

  await Craving.create({
    userId: req.user._id,
    cravingCategory: trigger,
    outcome,
    timestamp: new Date(timestamp) || new Date(),
  })

  res.status(201).json({ message: 'Craving logged' })
}

const getRecentCravings = async (req, res) => {
  const cravings = await Craving.find({ userId: req.user._id })
    .sort({ timestamp: -1 })
    .limit(10)
    .select('cravingCategory outcome timestamp')
    .lean()

  const relativeTime = (date) => {
    const diffMs = Date.now() - new Date(date).getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins} minutes ago`
    const diffHrs = Math.floor(diffMins / 60)
    if (diffHrs < 24) return `${diffHrs} hour${diffHrs > 1 ? 's' : ''} ago`
    const diffDays = Math.floor(diffHrs / 24)
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  }

  const total = await Craving.countDocuments({ userId: req.user._id })

  res.status(200).json({
    cravings: cravings.map(c => ({
      id: c._id,
      trigger: c.cravingCategory,
      outcome: c.outcome,
      timestamp: c.timestamp,
      relativeTime: relativeTime(c.timestamp),
    })),
    total,
  })
}

const getCravingStats = async (req, res) => {
  const stats = await Craving.aggregate([
    { $match: { userId: req.user._id } },
    { $group: {
        _id: null,
        total: { $sum: 1 },
        resisted: { 
          $sum: { $cond: [{ $eq: ['$outcome', 'resisted'] }, 1, 0] }
        },
        partial: { 
          $sum: { $cond: [{ $eq: ['$outcome', 'partial'] }, 1, 0] }
        },
        gaveIn: { 
          $sum: { $cond: [{ $eq: ['$outcome', 'gave_in'] }, 1, 0] }
        },
        triggers: { $push: '$cravingCategory' },
    }}
  ])

  const triggers = stats[0] ? stats[0].triggers : []
  const triggerCounts = triggers.reduce((acc, t) => {
    acc[t] = (acc[t] || 0) + 1
    return acc
  }, {})
  
  const mostCommonTrigger = Object.keys(triggerCounts).length > 0
    ? Object.keys(triggerCounts).sort((a, b) => triggerCounts[b] - triggerCounts[a])[0]
    : null

  const startOfWeek = new Date()
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  
  const thisWeek = await Craving.countDocuments({
    userId: req.user._id,
    timestamp: { $gte: startOfWeek }
  })

  res.status(200).json({
    total: stats[0] ? stats[0].total : 0,
    resistanceRate: stats[0] && stats[0].total > 0
      ? Math.round((stats[0].resisted / stats[0].total) * 100)
      : null,
    outcomes: {
      resisted: stats[0] ? stats[0].resisted : 0,
      partial: stats[0] ? stats[0].partial : 0,
      gaveIn: stats[0] ? stats[0].gaveIn : 0,
    },
    mostCommonTrigger,
    triggerBreakdown: triggerCounts,
    thisWeek,
  })
}

module.exports = {
  logCraving,
  getRecentCravings,
  getCravingStats,
}