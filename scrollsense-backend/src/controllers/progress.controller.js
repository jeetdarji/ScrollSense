const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User.model');
const BehaviorWeek = require('../models/BehaviorWeek.model');
const BehaviorDay = require('../models/BehaviorDay.model');
const Craving = require('../models/Craving.model');
const { getCurrentWeekBounds } = require('../utils/dateUtils');
const {
  calculateTimeRefund,
  calculateBehavioralTrends,
} = require('../services/progress.service');

/**
 * GET /api/progress/time-refund
 * Feature F9 — Time Refund Tracker
 */
const getTimeRefund = async (req, res) => {
  const userId = req.user._id;

  const user = await User.findById(userId)
    .select('goals careerPath careerPathPreset interests dailyLimitMinutes createdAt youtubeConnected instagramUploaded instagramLastUploadAt')
    .lean();

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const behaviorWeeks = await BehaviorWeek.find({ userId })
    .sort({ weekStart: 1 })
    .lean();

  // Current week BehaviorDay documents
  const { weekStartString, weekEndString } = getCurrentWeekBounds();

  const behaviorDaysThisWeek = await BehaviorDay.find({
    userId,
    date: { $gte: weekStartString, $lte: weekEndString },
  }).lean();

  // If zero data and YouTube not connected → signal frontend to prompt connection
  if (behaviorWeeks.length === 0 && !user.youtubeConnected) {
    return res.status(200).json({
      connectYouTube: true,
      totalReclaimedMinutes: 0,
      totalReclaimedHours: 0,
      currentMilestone: null,
      nextMilestone: { hours: 5, label: '5 HOURS' },
      minutesToNextMilestone: 300,
      percentToNextMilestone: 0,
      daysSinceJoining: 0,
      weeksTracked: 0,
      alternatives: [],
      needsGoalSetup: !(user.goals && user.goals.length) && !user.careerPath,
      hasEnoughDataForTrend: false,
      weeklyData: [],
      currentWeekActualMinutes: 0,
      currentWeekProjectedMinutes: 0,
      currentWeekProjectedReclaimed: 0,
      daysElapsedThisWeek: 0,
      baselinePerWeek: (user.dailyLimitMinutes || 141) * 7,
    });
  }

  const result = calculateTimeRefund(user, behaviorWeeks, behaviorDaysThisWeek);

  // Add platform metadata so frontend knows what data sources are included
  const hasInstagram = user.instagramUploaded || false;
  return res.status(200).json({
    ...result,
    platformNote: hasInstagram
      ? 'Includes YouTube + Instagram activity'
      : 'YouTube activity only',
    instagramDataAvailable: hasInstagram,
    instagramLastUploadAt: user.instagramLastUploadAt || null,
  });
};

/**
 * GET /api/progress/trends
 * Feature F15 — Behavioral Trend Graph
 */
const getTrends = async (req, res) => {
  const userId = req.user._id;

  const behaviorWeeks = await BehaviorWeek.find({ userId })
    .sort({ weekStart: 1 })
    .lean();

  // Build cravingsPerWeek map via aggregation
  const cravingsPerWeek = new Map();

  if (behaviorWeeks.length > 0) {
    const earliestWeek = behaviorWeeks[0].weekStart;

    const cravingAgg = await Craving.aggregate([
      {
        $match: {
          userId,
          timestamp: { $gte: new Date(earliestWeek) },
        },
      },
      {
        $addFields: {
          weekMonday: {
            $dateFromParts: {
              isoWeekYear: { $isoWeekYear: '$timestamp' },
              isoWeek: { $isoWeek: '$timestamp' },
              isoDayOfWeek: 1,
            },
          },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$weekMonday' } },
          total: { $sum: 1 },
          resisted: {
            $sum: { $cond: [{ $eq: ['$outcome', 'resisted'] }, 1, 0] },
          },
        },
      },
    ]);

    cravingAgg.forEach(entry => {
      cravingsPerWeek.set(entry._id, {
        total: entry.total,
        resisted: entry.resisted,
      });
    });
  }

  // Load user to check Instagram status
  const user = await User.findById(userId)
    .select('instagramUploaded instagramLastUploadAt')
    .lean();

  const result = calculateBehavioralTrends(behaviorWeeks, cravingsPerWeek, user?.instagramLastUploadAt);

  const hasInstagram = user?.instagramUploaded || false;
  return res.status(200).json({
    ...result,
    platformNote: hasInstagram
      ? 'Trends include YouTube + Instagram activity'
      : 'YouTube activity only',
    instagramDataAvailable: hasInstagram,
  });
};

module.exports = {
  getTimeRefund: asyncHandler(getTimeRefund),
  getTrends: asyncHandler(getTrends),
};
