const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User.model');
const BehaviorWeek = require('../models/BehaviorWeek.model');
const BehaviorDay = require('../models/BehaviorDay.model');
const Session = require('../models/Session.model');

/**
 * GET /api/insights/dashboard
 * Master endpoint — returns ALL data needed by useYouTubeData hook.
 * One call replaces all individual feature calls on page load.
 */
const getDashboard = async (req, res) => {
  // Guard: onboarding must be done before dashboard makes sense
  if (!req.user.onboardingComplete) {
    return res.status(200).json({
      isConnected: false,
      isLoading: false,
      isClassifying: false,
      onboardingRequired: true,
      weeklyBreakdown: [],
      currentWeek: {
        goal: 0, interest: 0, junk: 100,
        totalMinutes: 0, totalVideos: 0,
        changeVsLastWeek: null,
        hasEnoughDataForTrend: false,
        weeksOfData: 0,
      },
      goalScoreHistory: [],
      topChannels: [],
      contentSuggestions: [],
      interests: [],
      checkin: { available: false, sessionsLogged: 0 },
    });
  }

  // 1. Get last 7 BehaviorWeek documents
  const behaviorWeeks = await BehaviorWeek.find({ userId: req.user._id })
    .sort({ weekStart: -1 })
    .limit(7)
    .lean();

  const weeks = behaviorWeeks.reverse(); // oldest first for charts

  // 2. Build weeklyBreakdown array (matches mock data shape)
  const weeklyBreakdown = weeks.map((w, i) => ({
    week: `W${i + 1}`,
    weekStart: w.weekStart.toISOString().split('T')[0],
    goal: Math.round(w.careerRelevantPercent),
    interest: Math.round(w.interestPercent),
    junk: Math.round(w.junkPercent),
    totalMinutes: w.totalScrollMinutes,
  }));

  // 3. Get current week stats
  const currentWeekDoc = weeks[weeks.length - 1] || null;
  const prevWeekDoc = weeks[weeks.length - 2] || null;

  const currentWeek = currentWeekDoc
    ? {
        goal: Math.round(currentWeekDoc.careerRelevantPercent),
        interest: Math.round(currentWeekDoc.interestPercent),
        junk: Math.round(currentWeekDoc.junkPercent),
        totalMinutes: currentWeekDoc.totalScrollMinutes,
        totalVideos: currentWeekDoc.sessionsCount || 0,
        changeVsLastWeek: prevWeekDoc
          ? {
              goal: Math.round(
                currentWeekDoc.careerRelevantPercent -
                  prevWeekDoc.careerRelevantPercent
              ),
              interest: Math.round(
                currentWeekDoc.interestPercent - prevWeekDoc.interestPercent
              ),
              junk: Math.round(
                currentWeekDoc.junkPercent - prevWeekDoc.junkPercent
              ),
              totalMinutes:
                currentWeekDoc.totalScrollMinutes -
                prevWeekDoc.totalScrollMinutes,
            }
          : null,
        hasEnoughDataForTrend: weeks.length >= 2,
        weeksOfData: weeks.length,
      }
    : {
        goal: 0,
        interest: 0,
        junk: 100,
        totalMinutes: 0,
        totalVideos: 0,
        changeVsLastWeek: null,
        hasEnoughDataForTrend: false,
        weeksOfData: 0,
      };

  // 4. Build goalScoreHistory
  const goalScoreHistory = weeks.map((w, i) => ({
    week: `W${i + 1}`,
    score: Math.round(w.careerRelevantPercent),
  }));

  // 5. Get today's tracking from BehaviorDay (and optionally sessions fallback)
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const todayBehavior = await BehaviorDay.findOne({
    userId: req.user._id,
    date: { $gte: startOfDay },
  }).lean();

  const ytMinutes = todayBehavior ? todayBehavior.youtubeMinutes : 0;
  const igMinutes = todayBehavior ? todayBehavior.instagramMinutes : 0;

  // 6. Build interests with consumption data from BehaviorWeek breakdown or BehaviorDay
  const interests = (req.user.interests || []).map((interest) => {
    // Exact daily reading from today's BehaviorDay
    let consumed = todayBehavior?.youtubeInterestMinutes?.[interest.label] || 0;
    const weeklyAvg = currentWeekDoc
      ? Math.round(
          (currentWeekDoc.totalScrollMinutes *
            (currentWeekDoc.interestPercent / 100)) /
            Math.max(req.user.interests.length, 1) /
            7
        )
      : 0;
    
    const finalConsumed = consumed || weeklyAvg;
    const budget = interest.dailyMinutes;

    let status = 'on_track';
    if (finalConsumed >= budget) status = 'over';
    else if (finalConsumed >= budget * 0.8) status = 'near_limit';

    return {
      id: interest.id,
      label: interest.label,
      dailyBudgetMinutes: budget,
      consumedMinutes: finalConsumed,
      weeklyAvgMinutes: finalConsumed, // keeping consistent
      status,
    };
  });

  // 7. Get top channels from user document
  const userWithChannels = await User.findById(req.user._id)
    .select('topChannels')
    .lean();

  // 8. Return complete dashboard payload
  return res.status(200).json({
    isConnected: req.user.youtubeConnected,
    isLoading: false,
    isClassifying: false, // set by youtube/status endpoint separately
    weeklyBreakdown,
    currentWeek,
    goalScoreHistory,
    topChannels: userWithChannels?.topChannels || [],
    contentSuggestions: [],
    interests,
    platformBreakdown: {
      youtube: ytMinutes,
      instagram: igMinutes,
    },
    userContext: {
      careerPath: req.user.careerPath,
      careerPathPreset: req.user.careerPathPreset,
      dailyLimitMinutes: req.user.dailyLimitMinutes,
    },
  });
};

/**
 * GET /api/insights/interest-budgets
 * Dedicated endpoint for F12 — more accurate interest consumption.
 * Returns live daily consumption per interest.
 */
const getInterestBudgets = async (req, res) => {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const todayBehavior = await BehaviorDay.findOne({
    userId: req.user._id,
    date: { $gte: startOfDay },
  }).lean();

  const totalTodayMinutes = todayBehavior 
    ? (todayBehavior.youtubeMinutes + todayBehavior.instagramMinutes) 
    : 0;

  // Get latest BehaviorWeek for interest percentage estimation
  const latestWeek = await BehaviorWeek.findOne({ userId: req.user._id })
    .sort({ weekStart: -1 })
    .lean();

  const interests = (req.user.interests || []).map((interest) => {
    // Exact daily reading:
    let consumed = todayBehavior?.youtubeInterestMinutes?.[interest.label] || latestWeek?.dailyInterestMinutes?.[interest.label] || 0;
    
    if (!consumed && totalTodayMinutes > 0 && latestWeek?.interestBreakdown?.[interest.label]) {
      // ratio fallback
      const totalInterests = Object.values(latestWeek.interestBreakdown).reduce((a, b) => a + b, 0);
      if (totalInterests > 0) {
         const interestSharePercent = latestWeek.interestPercent * (latestWeek.interestBreakdown[interest.label] / totalInterests);
         consumed = Math.round(totalTodayMinutes * (interestSharePercent / 100));
      }
    } else if (!consumed) {
      // old fallback
      const interestSharePercent = latestWeek ? latestWeek.interestPercent / Math.max(req.user.interests.length, 1) : 0;
      consumed = Math.round(totalTodayMinutes * (interestSharePercent / 100));
    }

    const budget = interest.dailyMinutes;

    let status = 'on_track';
    if (consumed >= budget) status = 'over';
    else if (consumed >= budget * 0.8) status = 'near_limit';

    return {
      id: interest.id,
      label: interest.label,
      dailyBudgetMinutes: budget,
      consumedMinutes: consumed,
      status,
    };
  });

  // Reset at midnight
  const midnight = new Date();
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 0, 0, 0);

  return res.status(200).json({
    interests,
    resetAt: midnight.toISOString(),
  });
};

module.exports = {
  getDashboard: asyncHandler(getDashboard),
  getInterestBudgets: asyncHandler(getInterestBudgets),
};
