const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User.model');
const BehaviorWeek = require('../models/BehaviorWeek.model');
const BehaviorDay = require('../models/BehaviorDay.model');
const VideoWatchTime = require('../models/VideoWatchTime.model');
const Session = require('../models/Session.model');
const { shouldGenerateCheckin } = require('../services/digest.service');

/**
 * GET /api/insights/dashboard
 * Master endpoint — returns ALL data needed by useYouTubeData hook.
 * One call replaces all individual feature calls on page load.
 *
 * METRICS (totalMinutes, goal%, videosClassified) = CURRENT WEEK ONLY (Mon-Sun)
 * BAR GRAPH (weeklyBreakdown) = past 6-7 weeks (separate from metrics)
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

  // ── Current week boundaries (Monday 00:00 UTC → Sunday 23:59:59 UTC) ──
  const _now = new Date();
  const _utcDay = _now.getUTCDay();
  const _daysToMon = _utcDay === 0 ? 6 : _utcDay - 1;
  const _weekStartD = new Date(_now);
  _weekStartD.setUTCDate(_now.getUTCDate() - _daysToMon);
  _weekStartD.setUTCHours(0, 0, 0, 0);
  const weekStartStr = _weekStartD.toISOString().split('T')[0];

  const _weekEndD = new Date(_weekStartD);
  _weekEndD.setUTCDate(_weekStartD.getUTCDate() + 6);
  _weekEndD.setUTCHours(23, 59, 59, 999);
  const weekEndStr = _weekEndD.toISOString().split('T')[0];

  // 1. Get last 7 BehaviorWeek documents (for bar graph — ALL weeks)
  const behaviorWeeks = await BehaviorWeek.find({ userId: req.user._id })
    .sort({ weekStart: -1 })
    .limit(7)
    .lean();

  const weeks = behaviorWeeks.reverse(); // oldest first for charts

  // Find the ACTUAL current week doc by matching weekStart to this week's Monday
  const currentWeekDoc = weeks.find(
    w => w.weekStart.toISOString().split('T')[0] === weekStartStr
  ) || null;

  // Previous week = the week immediately before current
  const _prevWeekStartD = new Date(_weekStartD);
  _prevWeekStartD.setUTCDate(_weekStartD.getUTCDate() - 7);
  const prevWeekStartStr = _prevWeekStartD.toISOString().split('T')[0];
  const prevWeekDoc = weeks.find(
    w => w.weekStart.toISOString().split('T')[0] === prevWeekStartStr
  ) || null;

  // Oldest week start shown in the chart (up to 7 weeks back)
  const oldestWeekStart = weeks.length > 0
    ? weeks[0].weekStart.toISOString().split('T')[0]
    : weekStartStr;

  // Fetch ALL BehaviorDay records covering the chart range in one query
  const allChartDays = await BehaviorDay.find({
    userId: req.user._id,
    date: { $gte: oldestWeekStart },
  }).lean();

  // Build a map: weekStartStr → total youtube+instagram minutes from BehaviorDay
  const weekMinutesFromDays = {};
  allChartDays.forEach(d => {
    const dDate = new Date(d.date);
    const dUtcDay = dDate.getUTCDay();
    const dDaysToMon = dUtcDay === 0 ? 6 : dUtcDay - 1;
    const dWeekStart = new Date(dDate);
    dWeekStart.setUTCDate(dDate.getUTCDate() - dDaysToMon);
    dWeekStart.setUTCHours(0, 0, 0, 0);
    const dWeekKey = dWeekStart.toISOString().split('T')[0];
    weekMinutesFromDays[dWeekKey] = (weekMinutesFromDays[dWeekKey] || 0)
      + (d.youtubeMinutes || 0)
      + (d.instagramMinutes || 0);
  });

  // ── Detect cycle: total weeks ever recorded ──
  const totalWeeksEver = await BehaviorWeek.countDocuments({ userId: req.user._id });
  const cycleNumber = totalWeeksEver > 0 ? Math.floor((totalWeeksEver - 1) / 7) + 1 : 1;
  const weekInCycle = totalWeeksEver > 0 ? ((totalWeeksEver - 1) % 7) + 1 : 1;
  const isNewCycle = totalWeeksEver > 7 && weekInCycle === 1;

  // 2. Build weeklyBreakdown for bar graph — past weeks (ALL weeks in the 7-week window)
  const weeklyBreakdown = weeks.map((w, i) => {
    const wKey = w.weekStart.toISOString().split('T')[0];
    const liveMins = weekMinutesFromDays[wKey];
    return {
      week: `W${i + 1}`,
      weekStart: wKey,
      goal: Math.round(w.careerRelevantPercent),
      interest: Math.round(w.interestPercent),
      junk: Math.round(w.junkPercent),
      totalMinutes: liveMins !== undefined ? liveMins : w.totalScrollMinutes,
      isCurrentWeek: wKey === weekStartStr,
    };
  });

  // 3. CURRENT WEEK metrics — strictly from THIS Monday-Sunday only
  const thisWeekDays = allChartDays.filter(d => d.date >= weekStartStr && d.date <= weekEndStr);

  const weekYtMin = thisWeekDays.reduce((s, d) => s + (d.youtubeMinutes || 0), 0);
  const weekIgMin = thisWeekDays.reduce((s, d) => s + (d.instagramMinutes || 0), 0);
  const weekDailyTotal = weekYtMin + weekIgMin;

  // Build interest minutes aggregated from BehaviorDay records THIS WEEK ONLY
  const weekIntMinsMap = {};
  thisWeekDays.forEach(d => {
    // Sum YouTube interest minutes
    if (d.youtubeInterestMinutes) {
      const obj = d.youtubeInterestMinutes instanceof Map
        ? Object.fromEntries(d.youtubeInterestMinutes)
        : d.youtubeInterestMinutes;
      Object.entries(obj).forEach(([k, v]) => {
        weekIntMinsMap[k] = (weekIntMinsMap[k] || 0) + (Number(v) || 0);
      });
    }
    // Sum Instagram interest minutes (from topic matching)
    if (d.instagramInterestMinutes) {
      const igObj = d.instagramInterestMinutes instanceof Map
        ? Object.fromEntries(d.instagramInterestMinutes)
        : d.instagramInterestMinutes;
      Object.entries(igObj).forEach(([k, v]) => {
        weekIntMinsMap[k] = (weekIntMinsMap[k] || 0) + (Number(v) || 0);
      });
    }
  });
  const daysWithYtData = thisWeekDays.filter(d => d.youtubeDataFetched).length || 1;

  // CURRENT WEEK total minutes — ONLY from this week's BehaviorDay records
  const correctedMinutes = weekDailyTotal;
  // Videos classified THIS WEEK only — from the current week's BehaviorWeek doc
  const correctedVideos = currentWeekDoc?.youtubeVideosClassified || 0;

  // Previous week live minutes for comparison
  const prevWeekLiveMinutes = prevWeekDoc
    ? (weekMinutesFromDays[prevWeekStartStr] ?? prevWeekDoc.totalScrollMinutes ?? 0)
    : 0;

  const currentWeek = currentWeekDoc
    ? {
        goal: Math.round(currentWeekDoc.careerRelevantPercent),
        interest: Math.round(currentWeekDoc.interestPercent),
        junk: Math.round(currentWeekDoc.junkPercent),
        totalMinutes: correctedMinutes,
        totalVideos: correctedVideos,
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
              totalMinutes: correctedMinutes - prevWeekLiveMinutes,
            }
          : null,
        hasEnoughDataForTrend: weeks.length >= 2,
        weeksOfData: weeks.length,
      }
    : {
        goal: 0,
        interest: 0,
        junk: 100,
        totalMinutes: correctedMinutes,
        totalVideos: 0,
        changeVsLastWeek: null,
        hasEnoughDataForTrend: false,
        weeksOfData: weeks.length,
      };

  // 4. Build goalScoreHistory
  const goalScoreHistory = weeks.map((w, i) => ({
    week: `W${i + 1}`,
    score: Math.round(w.careerRelevantPercent),
  }));

  // 5. Get today's tracking from BehaviorDay
  const todayStr = new Date().toISOString().split('T')[0];

  const todayBehavior = await BehaviorDay.findOne({
    userId: req.user._id,
    date: todayStr,
  }).lean();

  const ytMinutes = todayBehavior ? todayBehavior.youtubeMinutes : 0;
  const igMinutes = todayBehavior ? todayBehavior.instagramMinutes : 0;

  const interests = (req.user.interests || []).map((interest) => {
    const normalizedLabel = interest.label.toLowerCase();
    let consumed = todayBehavior?.youtubeInterestMinutes instanceof Map
      ? (todayBehavior.youtubeInterestMinutes.get(normalizedLabel) || 0)
      : (todayBehavior?.youtubeInterestMinutes?.[normalizedLabel] || 0);

    // Add Instagram interest minutes to consumed total
    const igConsumed = todayBehavior?.instagramInterestMinutes instanceof Map
      ? (todayBehavior.instagramInterestMinutes.get(normalizedLabel) || 0)
      : (todayBehavior?.instagramInterestMinutes?.[normalizedLabel] || 0);
    consumed += Number(igConsumed) || 0;
    
    // Weekly average from aggregated BehaviorDay records (current week only)
    const weekIntTotal = weekIntMinsMap[normalizedLabel] || 0;
    const avgDailyFromWeek = daysWithYtData > 0 ? Math.round(weekIntTotal / daysWithYtData) : 0;
    
    let weeklyAvgPerDay = avgDailyFromWeek;
    if (!weeklyAvgPerDay && currentWeekDoc?.interestBreakdown) {
      const scrollMins = correctedMinutes || 0;
      const interestPct = currentWeekDoc?.interestPercent || 0;
      const breakdown = currentWeekDoc.interestBreakdown;
      const breakdownObj = breakdown instanceof Map ? Object.fromEntries(breakdown) : breakdown;
      const totalInterestVideos = Object.values(breakdownObj).reduce((a, b) => a + b, 0);
      const thisInterestCount = breakdownObj[normalizedLabel] || 0;
      if (totalInterestVideos > 0 && thisInterestCount > 0) {
        const share = thisInterestCount / totalInterestVideos;
        weeklyAvgPerDay = Math.round((scrollMins * (interestPct / 100) * share) / 7);
      }
    }
    
    const finalConsumed = Number(consumed) || 0;
    const budget = Number(interest.dailyMinutes) || Number(interest.minutes) || 30;

    let status = 'on_track';
    if (finalConsumed >= budget) status = 'over';
    else if (finalConsumed >= budget * 0.8) status = 'near_limit';

    return {
      id: interest.id,
      label: interest.label,
      dailyBudgetMinutes: budget,
      consumedMinutes: finalConsumed,
      weeklyAvgMinutes: weeklyAvgPerDay,
      status,
    };
  });

  // 7. Get top channels from user document (already filtered to current week by classification job)
  const userWithChannels = await User.findById(req.user._id)
    .select('topChannels youtubeDataUnavailable')
    .lean();

  // Enrich top channels with this week's watch duration from VideoWatchTime
  let topChannelsWithDuration = userWithChannels?.topChannels || [];
  if (topChannelsWithDuration.length > 0) {
    // Get all VideoWatchTime records for this week
    const weekWatchTimes = await VideoWatchTime.find({
      userId: req.user._id,
      date: { $gte: weekStartStr, $lte: weekEndStr },
    }).lean();

    // We need ClassifiedVideo to map videoId → channelId
    const ClassifiedVideo = require('../models/ClassifiedVideo.model');
    const videoIds = [...new Set(weekWatchTimes.map(r => r.videoId))];
    const classifiedDocs = await ClassifiedVideo.find({
      userId: req.user._id,
      videoId: { $in: videoIds },
    }).select('videoId channelId channelName').lean();

    const videoToChannel = {};
    classifiedDocs.forEach(d => {
      videoToChannel[d.videoId] = d.channelId;
    });

    // Sum watch seconds per channel for this week
    const channelWatchSeconds = {};
    weekWatchTimes.forEach(r => {
      const chId = videoToChannel[r.videoId];
      if (chId) {
        channelWatchSeconds[chId] = (channelWatchSeconds[chId] || 0) + r.watchedSeconds;
      }
    });

    topChannelsWithDuration = topChannelsWithDuration.map(ch => ({
      ...ch,
      watchMinutes: Math.round((channelWatchSeconds[ch.channelId] || 0) / 60),
    }));
  }

  const checkinResult = await shouldGenerateCheckin(req.user._id);

  // 8. Return complete dashboard payload
  return res.status(200).json({
    isConnected: req.user.youtubeConnected,
    instagramUploaded: req.user.instagramUploaded || false,
    youtubeDataUnavailable: userWithChannels?.youtubeDataUnavailable || false,
    isLoading: false,
    isClassifying: false,
    weeklyBreakdown,
    currentWeek,
    goalScoreHistory,
    topChannels: topChannelsWithDuration,
    contentSuggestions: [],
    interests,
    checkin: {
      available: checkinResult.should,
      sessionsLogged: checkinResult.sessionsLogged,
      sessionsNeeded: Math.max(0, 3 - checkinResult.sessionsLogged),
    },
    platformBreakdown: {
      youtube: ytMinutes,
      instagram: igMinutes,
    },
    // Weekly platform totals for combined stats
    weeklyPlatformBreakdown: {
      youtubeMinutes: weekYtMin,
      instagramMinutes: weekIgMin,
    },
    platformsIncluded: weekIgMin > 0 ? ['youtube', 'instagram'] : ['youtube'],
    instagramDataAvailable: weekIgMin > 0 || (req.user.instagramUploaded || false),
    userContext: {
      careerPath: req.user.careerPath,
      careerPathPreset: req.user.careerPathPreset,
      dailyLimitMinutes: req.user.dailyLimitMinutes,
    },
    // Cycle info for bar graph
    cycleInfo: {
      cycleNumber,
      weekInCycle,
      isNewCycle,
      totalWeeksEver,
    },
  });
};

/**
 * GET /api/insights/interest-budgets
 * Dedicated endpoint for F12 — more accurate interest consumption.
 * Returns live daily consumption per interest.
 */
const getInterestBudgets = async (req, res) => {
  // date is stored as a String ("YYYY-MM-DD") — use exact string match, not Date comparison.
  const todayStr = new Date().toISOString().split('T')[0];

  const todayBehavior = await BehaviorDay.findOne({
    userId: req.user._id,
    date: todayStr,
  }).lean();

  const totalTodayMinutes = todayBehavior 
    ? ((todayBehavior.youtubeMinutes || 0) + (todayBehavior.instagramMinutes || 0)) 
    : 0;

  const interests = (req.user.interests || []).map((interest) => {
    // Today's consumed: strictly from today's BehaviorDay record.
    // Defaults to 0 when no record exists so the budget starts fresh each morning.
    const normalizedLabel = interest.label.toLowerCase();
    const consumed = (() => {
      let ytConsumed = todayBehavior?.youtubeInterestMinutes instanceof Map
        ? (todayBehavior.youtubeInterestMinutes.get(normalizedLabel) || 0)
        : (todayBehavior?.youtubeInterestMinutes?.[normalizedLabel] || 0);
      // Add Instagram interest minutes
      const igConsumed = todayBehavior?.instagramInterestMinutes instanceof Map
        ? (todayBehavior.instagramInterestMinutes.get(normalizedLabel) || 0)
        : (todayBehavior?.instagramInterestMinutes?.[normalizedLabel] || 0);
      return (Number(ytConsumed) || 0) + (Number(igConsumed) || 0);
    })();

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
