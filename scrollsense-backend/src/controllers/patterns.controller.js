const User = require('../models/User.model');
const Session = require('../models/Session.model');
const Intention = require('../models/Intention.model');
const BehaviorWeek = require('../models/BehaviorWeek.model');
const BehaviorDay = require('../models/BehaviorDay.model');
const Craving = require('../models/Craving.model');
const asyncHandler = require('../utils/asyncHandler');
const { getCurrentWeekBounds, DAY_NAMES } = require('../utils/dateUtils');
const {
  calculateTriggerPatterns,
  calculateEchoChamberScore,
  calculateHabitNudge,
  processInstagramExport,
} = require('../services/patterns.service');
const { recalculateBehaviorWeeksFromDays } = require('../services/insights.service');

const getTriggerPatterns = async (req, res) => {
  const wb = getCurrentWeekBounds();

  // Current week data
  const [sessions, intentions, behaviorDays, user] = await Promise.all([
    Session.find({
      userId: req.user._id,
      startTime: { $gte: wb.weekStart, $lte: wb.weekEnd },
    }).lean(),
    Intention.find({
      userId: req.user._id,
      timestamp: { $gte: wb.weekStart, $lte: wb.weekEnd },
    }).lean(),
    BehaviorDay.find({
      userId: req.user._id,
      date: { $gte: wb.weekStartString, $lte: wb.weekEndString },
    }).lean(),
    User.findById(req.user._id).select('youtubeConnected youtubeLastSyncAt').lean(),
  ]);

  // Last week's BehaviorWeek for comparison
  const lastWeekBehavior = await BehaviorWeek.findOne({
    userId: req.user._id,
    weekStart: wb.lastWeekStart,
  }).lean();

  // Cold start: if current week has < 2 days of data, also load last week's data for preview
  const currentWeekDayCount = behaviorDays.filter(d => (d.totalScrollMinutes > 0 || d.youtubeMinutes > 0)).length;
  let previewData = null;
  if (currentWeekDayCount < 2 && lastWeekBehavior) {
    const lastWeekDays = await BehaviorDay.find({
      userId: req.user._id,
      date: { $gte: wb.lastWeekStartString, $lte: wb.lastWeekEndString },
    }).lean();
    const lastWeekSessions = await Session.find({
      userId: req.user._id,
      startTime: { $gte: wb.lastWeekStart, $lte: wb.lastWeekEnd },
    }).lean();
    const lastWeekIntentions = await Intention.find({
      userId: req.user._id,
      timestamp: { $gte: wb.lastWeekStart, $lte: wb.lastWeekEnd },
    }).lean();
    previewData = {
      isLastWeekPreview: true,
      label: `LAST WEEK: ${wb.lastWeekLabel}`,
      ...calculateTriggerPatterns(lastWeekSessions, lastWeekIntentions, lastWeekDays, null),
    };
  }

  if (sessions.length === 0 && intentions.length === 0 && behaviorDays.length === 0 && !user.youtubeConnected) {
    return res.status(200).json({
      hasEnoughData: false,
      dataSource: 'insufficient',
      connectYouTube: true,
      youtubeConnected: false,
      message: 'Connect YouTube to see your patterns from Day 1.',
      weeksTracked: 0, daysTracked: 0,
      progressToFullPatterns: { daysLogged: 0, daysNeeded: 7, percentComplete: 0, unlocked: false },
      generatedAt: new Date().toISOString(),
      dataWindowLabel: wb.dataWindowLabel,
      previewData,
    });
  }

  if (sessions.length === 0 && intentions.length === 0 && behaviorDays.length === 0 && user.youtubeConnected) {
    return res.status(200).json({
      hasEnoughData: false,
      dataSource: 'syncing',
      connectYouTube: false,
      youtubeConnected: true,
      ytSyncing: !user.youtubeLastSyncAt,
      message: 'YouTube connected — patterns will appear once data syncs.',
      weeksTracked: 0, daysTracked: 0,
      progressToFullPatterns: { daysLogged: 0, daysNeeded: 7, percentComplete: 0, unlocked: false },
      generatedAt: new Date().toISOString(),
      dataWindowLabel: wb.dataWindowLabel,
      previewData,
    });
  }

  const result = calculateTriggerPatterns(sessions, intentions, behaviorDays, lastWeekBehavior);

  res.status(200).json({
    ...result,
    youtubeConnected: user.youtubeConnected,
    userId: req.user._id,
    generatedAt: new Date().toISOString(),
    dataWindowLabel: wb.dataWindowLabel,
    previewData,
  });
};

const getEchoChamberScore = async (req, res) => {
  const wb = getCurrentWeekBounds();

  const user = await User.findById(req.user._id)
    .select('topChannels goals careerPath interests youtubeConnected youtubeLastSyncAt instagramTopics')
    .lean();

  // Current week's BehaviorWeek
  const currentWeek = await BehaviorWeek.findOne({
    userId: req.user._id,
    weekStart: wb.weekStart,
  }).lean();

  // Last week's for trend comparison
  const lastWeek = await BehaviorWeek.findOne({
    userId: req.user._id,
    weekStart: wb.lastWeekStart,
  }).lean();

  if (!user.topChannels || user.topChannels.length === 0) {
    return res.status(200).json({
      hasData: false,
      score: 0,
      connectYouTube: !user.youtubeConnected,
      runClassification: user.youtubeConnected && !user.youtubeLastSyncAt,
      message: user.youtubeConnected
        ? 'Classification needed — connect YouTube and sync.'
        : 'Connect YouTube to see your content diversity score.',
      generatedAt: new Date().toISOString(),
      dataWindowLabel: wb.dataWindowLabel,
    });
  }

  // Pass Instagram topics for topic diversity scoring
  const instagramTopics = user.instagramTopics || [];
  const result = calculateEchoChamberScore(user.topChannels, currentWeek, lastWeek, instagramTopics);

  res.status(200).json({
    ...result,
    userGoals: user.goals,
    careerPath: user.careerPath,
    instagramDataAvailable: instagramTopics.length > 0,
    generatedAt: new Date().toISOString(),
    dataWindowLabel: wb.dataWindowLabel,
  });
};

const uploadInstagram = async (req, res) => {
  const wb = getCurrentWeekBounds();
  const body = req.body;

  // Support both NEW aggregated format and LEGACY raw format
  const isAggregated = typeof body.videosWatchedCount === 'number' && Array.isArray(body.dailyActivity);

  if (isAggregated) {
    // --- NEW: client-side parsed aggregated data ---
    if (body.videosWatchedCount <= 0) {
      return res.status(400).json({ error: 'No video data found in export' });
    }
    if (!body.dailyActivity || body.dailyActivity.length === 0) {
      return res.status(400).json({ error: 'dailyActivity must have at least 1 entry' });
    }
    // Validate dailyActivity entries
    for (const entry of body.dailyActivity) {
      if (!entry.date || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
        return res.status(400).json({ error: `Invalid date in dailyActivity: ${entry.date}` });
      }
    }
    const topics = Array.isArray(body.topics) ? body.topics.slice(0, 100) : [];

    // Build interest distribution map from client payload
    const interestDistribution = body.interestDistribution || {};

    // Save to BehaviorDay documents — compute combined totalScrollMinutes
    const totalIgMinutes = body.dailyActivity.reduce((s, e) => s + (e.estimatedMinutes || 0), 0) || 1;

    for (const entry of body.dailyActivity) {
      const igMinutes = entry.estimatedMinutes || 0;

      // Build per-day interest minutes slice (distribute proportionally)
      const dayInterestMins = {};
      if (igMinutes > 0) {
        Object.entries(interestDistribution).forEach(([interest, totalForInterest]) => {
          dayInterestMins[interest] = Math.round((igMinutes / totalIgMinutes) * totalForInterest);
        });
      }

      // Read existing doc to get youtubeMinutes and peakHour (may be 0/null if no classification yet)
      const existing = await BehaviorDay.findOne(
        { userId: req.user._id, date: entry.date }
      ).select('youtubeMinutes peakHour').lean();
      const existingYt = existing?.youtubeMinutes || 0;

      // Only set peakHour from Instagram if no existing YouTube-derived peakHour
      const shouldSetPeakHour = entry.peakHour != null && existing?.peakHour == null;

      await BehaviorDay.findOneAndUpdate(
        { userId: req.user._id, date: entry.date },
        {
          $set: {
            instagramMinutes: igMinutes,
            instagramDataProcessed: true,
            // Combined total = YouTube + Instagram (not $max)
            totalScrollMinutes: existingYt + igMinutes,
            // Save interest minutes from Instagram topic matching
            ...(Object.keys(dayInterestMins).length > 0 ? { instagramInterestMinutes: dayInterestMins } : {}),
            // Save peak hour for this day (only if no existing YouTube peakHour)
            ...(shouldSetPeakHour ? { peakHour: entry.peakHour } : {}),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    // Save topics and upload flag
    await User.findByIdAndUpdate(req.user._id, {
      instagramUploaded: true,
      instagramLastUploadAt: new Date(),
      ...(topics.length > 0 ? { instagramTopics: topics } : {}),
    });

    // Recalculate BehaviorWeek documents so bar charts + progress show combined minutes
    let recalcResult = { weeksUpdated: 0 };
    if (body.dateRange?.start && body.dateRange?.end) {
      try {
        recalcResult = await recalculateBehaviorWeeksFromDays(
          req.user._id,
          body.dateRange.start,
          body.dateRange.end
        );
      } catch (err) {
        console.error('[uploadInstagram] BehaviorWeek recalculation failed:', err.message);
      }
    }

    // Build heatmaps from dailyActivity for frontend
    const hourlyHeatmap = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
    if (body.peakHourFromTimestamps != null) {
      hourlyHeatmap[body.peakHourFromTimestamps].count = body.videosWatchedCount;
    }
    const weeklyHeatmap = Array.from({ length: 7 }, (_, d) => ({
      day: d, count: 0, label: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d],
    }));

    return res.status(200).json({
      message: 'Instagram export processed successfully',
      summary: {
        videosProcessed: body.videosWatchedCount,
        topicsFound: topics.length,
        dateRange: body.dateRange || null,
        daysWithActivity: body.dailyActivity.length,
        peakHour: body.peakHourFromTimestamps,
        peakDay: body.peakDayFromTimestamps,
        weeksRecalculated: recalcResult.weeksUpdated,
      },
      hourlyHeatmap,
      weeklyHeatmap,
      isSnapshot: true,
      recalculationComplete: true,
      snapshotDateRange: body.dateRange || null,
      snapshotNote: 'This shows your Instagram patterns from the export. Re-upload anytime to refresh.',
      generatedAt: new Date().toISOString(),
      dataWindowLabel: wb.dataWindowLabel,
    });
  }

  // --- LEGACY: raw file contents (backwards compatibility) ---
  const { videos_watched, ads_viewed, your_topics } = body;

  if (!videos_watched || !Array.isArray(videos_watched)) {
    return res.status(400).json({ error: 'No video data found in export' });
  }

  if (videos_watched.length > 50000) {
    return res.status(400).json({ error: 'Export file too large. Try a shorter date range.' });
  }

  const result = processInstagramExport({ videos_watched, ads_viewed, your_topics }, req.user._id);

  await User.findByIdAndUpdate(req.user._id, {
    instagramUploaded: true,
    instagramLastUploadAt: new Date(),
  });

  if (result.dailyActivity && result.dailyActivity.length > 0) {
    for (const entry of result.dailyActivity) {
      // Read existing doc to get youtubeMinutes for combined total
      const existing = await BehaviorDay.findOne(
        { userId: req.user._id, date: entry.date }
      ).select('youtubeMinutes peakHour').lean();
      const existingYt = existing?.youtubeMinutes || 0;
      const igMinutes = entry.estimatedMinutes || 0;

      await BehaviorDay.findOneAndUpdate(
        { userId: req.user._id, date: entry.date },
        {
          $set: {
            instagramMinutes: igMinutes,
            instagramDataProcessed: true,
            // Combined total = YouTube + Instagram
            totalScrollMinutes: existingYt + igMinutes,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
  }

  if (result.topics && result.topics.length > 0) {
    await User.findByIdAndUpdate(req.user._id, {
      $set: { instagramTopics: result.topics.slice(0, 100) }
    });
  }

  // Recalculate BehaviorWeek documents for legacy uploads
  if (result.dateRange) {
    try {
      await recalculateBehaviorWeeksFromDays(
        req.user._id,
        result.dateRange.earliest.split('T')[0],
        result.dateRange.latest.split('T')[0]
      );
    } catch (err) {
      console.error('[uploadInstagram legacy] BehaviorWeek recalculation failed:', err.message);
    }
  }

  // Build 24-hour and 7-day heatmap arrays for the frontend
  const hourlyHeatmap = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    count: result.hourCounts?.[h] || 0,
  }));
  const weeklyHeatmap = Array.from({ length: 7 }, (_, d) => ({
    day: d,
    count: result.dayCounts?.[['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'][d]] || 0,
    label: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d],
  }));

  res.status(200).json({
    message: 'Instagram export processed successfully',
    summary: {
      videosProcessed: result.videosWatchedCount,
      topicsFound: result.topicsCount,
      // Use start/end keys so the frontend can read igData.dateRange.start / .end directly
      dateRange: result.dateRange ? {
        start: result.dateRange.earliest,
        end: result.dateRange.latest,
      } : null,
      daysWithActivity: result.dailyActivity.length,
      peakHour: result.peakHour,
      peakDay: result.peakDay,
    },
    hourlyHeatmap,
    weeklyHeatmap,
    isSnapshot: true,
    snapshotNote: 'This shows your patterns from the past 90 days. Re-upload anytime to refresh.',
    generatedAt: new Date().toISOString(),
    dataWindowLabel: wb.dataWindowLabel,
  });
};

const deleteInstagramData = async (req, res) => {
  try {
    // 1. Reset user state
    await User.findByIdAndUpdate(req.user._id, {
      $set: { instagramUploaded: false, instagramTopics: [] }
    });

    // 2. Fetch all days that have Instagram data to find date range for recalculation
    const daysWithInsta = await BehaviorDay.find({
      userId: req.user._id,
      instagramDataProcessed: true
    }).select('date').sort({ date: 1 }).lean();

    if (daysWithInsta.length > 0) {
      const startDate = daysWithInsta[0].date;
      const endDate = daysWithInsta[daysWithInsta.length - 1].date;

      // 3. Clear Instagram data from BehaviorDay documents and reset totalScrollMinutes
      // We will read all affected docs, and fix their totalScrollMinutes
      for (const day of daysWithInsta) {
        const doc = await BehaviorDay.findOne({ _id: day._id });
        if (doc) {
          doc.instagramMinutes = 0;
          doc.instagramDataProcessed = false;
          doc.instagramInterestMinutes = undefined;
          doc.totalScrollMinutes = doc.youtubeMinutes || 0;
          await doc.save();
        }
      }

      // 4. Recalculate BehaviorWeek models within the date range
      await recalculateBehaviorWeeksFromDays(req.user._id, startDate, endDate);
    }

    res.status(200).json({ message: 'Instagram data cleared successfully' });
  } catch (err) {
    console.error('[deleteInstagramData] Error:', err);
    res.status(500).json({ error: 'Failed to clear Instagram data' });
  }
};


const getHabitNudge = async (req, res) => {
  const wb = getCurrentWeekBounds();

  const [sessions, intentions, cravings] = await Promise.all([
    Session.find({
      userId: req.user._id,
      startTime: { $gte: wb.weekStart, $lte: wb.weekEnd },
    }).lean(),
    Intention.find({
      userId: req.user._id,
      timestamp: { $gte: wb.weekStart, $lte: wb.weekEnd },
    }).lean(),
    Craving.find({
      userId: req.user._id,
      timestamp: { $gte: wb.weekStart, $lte: wb.weekEnd },
    }).lean(),
  ]);

  const currentHour = new Date().getUTCHours();

  const user = await User.findById(req.user._id)
    .select('goals interests careerPath careerPathPreset dailyLimitMinutes lastNudgeShownAt topChannels')
    .lean();

  // Current week BehaviorWeek for content diet
  const currentWeek = await BehaviorWeek.findOne({
    userId: req.user._id,
    weekStart: wb.weekStart,
  }).lean();

  // Live BehaviorDay sum for totalScrollMinutes
  const thisWeekDays = await BehaviorDay.find({
    userId: req.user._id,
    date: { $gte: wb.weekStartString, $lte: wb.weekEndString },
  }).select('youtubeMinutes instagramMinutes totalScrollMinutes date').lean();

  const liveTotalScrollMinutes = thisWeekDays.reduce(
    (s, d) => s + (d.youtubeMinutes || 0) + (d.instagramMinutes || 0), 0
  );

  const contentDiet = currentWeek ? {
    goalPercent: Math.round(currentWeek.careerRelevantPercent || 0),
    interestPercent: Math.round(currentWeek.interestPercent || 0),
    junkPercent: Math.round(currentWeek.junkPercent || 0),
    totalScrollMinutes: liveTotalScrollMinutes,
    interestBreakdown: currentWeek.interestBreakdown instanceof Map
      ? Object.fromEntries(currentWeek.interestBreakdown)
      : (currentWeek.interestBreakdown || {}),
  } : null;

  // Today-specific context
  const todayStr = new Date().toISOString().split('T')[0];
  const todayBehaviorDay = thisWeekDays.find(d => d.date === todayStr);
  const todayMinutes = todayBehaviorDay
    ? (todayBehaviorDay.youtubeMinutes || 0) + (todayBehaviorDay.instagramMinutes || 0)
    : 0;
  const nowDay = new Date().getUTCDay();
  const todayDayName = DAY_NAMES[nowDay];
  const todayIsPeakDay = currentWeek?.peakScrollHour != null
    ? false // peakScrollHour is hour not day; check BehaviorWeek pattern
    : false;
  // Check if today is historically a heavy day by looking at peakDay from trigger pattern
  const peakDayFromWeek = currentWeek?.triggerPatterns?.find(p => p.includes('heaviest'));
  const todayIntention = intentions.find(i => i.date === todayStr)?.intentionCategory || null;

  // Check if today is the peak day from BehaviorDay data this week
  let maxDayMinutes = -1, peakDayName = null;
  const dayMinutesMap = {};
  thisWeekDays.forEach(d => {
    const dn = DAY_NAMES[new Date(d.date + 'T00:00:00Z').getUTCDay()];
    const mins = (d.youtubeMinutes || 0) + (d.instagramMinutes || 0);
    dayMinutesMap[dn] = (dayMinutesMap[dn] || 0) + mins;
  });
  for (const [dn, mins] of Object.entries(dayMinutesMap)) {
    if (mins > maxDayMinutes) { maxDayMinutes = mins; peakDayName = dn; }
  }

  const todayContext = {
    todayMinutes,
    todayIsPeakDay: peakDayName === todayDayName && maxDayMinutes > 0,
    todayDayName,
    todayIntention,
  };

  const nudgeResult = calculateHabitNudge(sessions, intentions, cravings, user, currentHour, contentDiet, todayContext);

  await User.findByIdAndUpdate(req.user._id, {
    lastNudgeShownAt: new Date(),
  });

  const totalSessions = sessions.length;
  const totalDuration = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  const averageSessionLengthMin = totalSessions > 0 ? totalDuration / totalSessions : 0;

  // Weekly prediction: scale current week data to full week
  const now = new Date();
  const dayOfWeek = now.getUTCDay() === 0 ? 7 : now.getUTCDay(); // 1=Mon..7=Sun
  const predictedUsageMin = dayOfWeek > 0 ? Math.round((liveTotalScrollMinutes / dayOfWeek) * 7) : liveTotalScrollMinutes;
  const weeklyGoalMin = (user.dailyLimitMinutes || 120) * 7;

  res.status(200).json({
    ...nudgeResult,
    generatedAt: new Date().toISOString(),
    dataWindowLabel: wb.dataWindowLabel,
    currentHour,
    userGoals: user.goals,
    totalSessions,
    averageSessionLengthMin,
    predictedUsageMin,
    weeklyGoalMin,
    contentDiet,
  });
};

// GET /api/patterns/cross-platform
const getCrossPlatform = async (req, res) => {
  const wb = getCurrentWeekBounds();

  const user = await User.findById(req.user._id)
    .select('instagramUploaded instagramLastUploadAt')
    .lean();

  const behaviorDays = await BehaviorDay.find({
    userId: req.user._id,
    date: { $gte: wb.weekStartString, $lte: wb.weekEndString },
  }).lean();

  // Build current week daily timeline (always — even without Instagram)
  const dailyTimeline = [];
  let totalYT = 0, totalIG = 0, switchingDays = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(wb.weekStart);
    d.setUTCDate(wb.weekStart.getUTCDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = DAY_NAMES[d.getUTCDay()];
    const bd = behaviorDays.find(b => b.date === dateStr);
    const ytMin = bd?.youtubeMinutes || 0;
    const igMin = bd?.instagramMinutes || 0;
    dailyTimeline.push({
      date: dateStr,
      dayName,
      youtubeMinutes: ytMin,
      instagramMinutes: igMin,
      totalMinutes: ytMin + igMin,
    });
    totalYT += ytMin;
    totalIG += igMin;
    if (ytMin > 15 && igMin > 15) switchingDays++;
  }

  if (!user.instagramUploaded) {
    return res.status(200).json({
      hasData: totalYT > 0,
      instagramUploaded: false,
      dailyTimeline,
      totalYoutubeMinutes: totalYT,
      message: 'Upload your Instagram export to see cross-platform patterns.',
      generatedAt: new Date().toISOString(),
      dataWindowLabel: wb.dataWindowLabel,
    });
  }

  // If Instagram is uploaded but current week has 0 IG minutes, fetch historic IG data
  let historicDailyTimeline = [];
  let historicInstagramMinutes = 0;
  if (totalIG === 0) {
    const historicDays = await BehaviorDay.find({
      userId: req.user._id,
      instagramMinutes: { $gt: 0 },
    }).select('date youtubeMinutes instagramMinutes').sort({ date: -1 }).limit(90).lean();

    if (historicDays.length > 0) {
      historicDailyTimeline = historicDays.reverse().map(d => ({
        date: d.date,
        dayName: DAY_NAMES[new Date(d.date + 'T00:00:00Z').getUTCDay()],
        youtubeMinutes: d.youtubeMinutes || 0,
        instagramMinutes: d.instagramMinutes || 0,
        totalMinutes: (d.youtubeMinutes || 0) + (d.instagramMinutes || 0),
      }));
      historicInstagramMinutes = historicDays.reduce((s, d) => s + (d.instagramMinutes || 0), 0);
    }
  }

  const combined = totalYT + totalIG;
  const platformSplit = {
    youtubePercent: combined > 0 ? Math.round((totalYT / combined) * 100) : 0,
    instagramPercent: combined > 0 ? Math.round((totalIG / combined) * 100) : 0,
  };

  res.status(200).json({
    hasData: true,
    instagramUploaded: true,
    dailyTimeline,
    historicDailyTimeline,
    historicInstagramMinutes,
    platformSplit,
    switchingDays,
    totalYoutubeMinutes: totalYT,
    totalInstagramMinutes: totalIG,
    isSnapshot: true,
    snapshotNote: 'Instagram data is from your last export.',
    generatedAt: new Date().toISOString(),
    dataWindowLabel: wb.dataWindowLabel,
  });
};

// POST /api/patterns/habit-nudge/feedback
const postNudgeFeedback = async (req, res) => {
  const { nudgeId, action } = req.body;

  if (!nudgeId || !['acted_on', 'dismissed', 'ignored'].includes(action)) {
    return res.status(400).json({ error: 'Invalid feedback. Requires nudgeId and action (acted_on|dismissed|ignored).' });
  }

  await User.findByIdAndUpdate(req.user._id, {
    $push: {
      nudgeFeedback: {
        $each: [{ nudgeId, action, timestamp: new Date() }],
        $slice: -200, // keep last 200 entries to prevent unbounded growth
      },
    },
  });

  res.status(200).json({ success: true });
};

module.exports = {
  getTriggerPatterns: asyncHandler(getTriggerPatterns),
  getEchoChamberScore: asyncHandler(getEchoChamberScore),
  uploadInstagram: asyncHandler(uploadInstagram),
  deleteInstagramData: asyncHandler(deleteInstagramData),
  getHabitNudge: asyncHandler(getHabitNudge),
  getCrossPlatform: asyncHandler(getCrossPlatform),
  postNudgeFeedback: asyncHandler(postNudgeFeedback),
};