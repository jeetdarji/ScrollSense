const { classificationQueue } = require('../config/queue');
const {
  fetchWatchHistory,
  fetchVideoMetadata,
  getValidAccessToken,
} = require('../services/youtube.service');
const {
  classifyVideoBatch,
  aggregateClassificationResults,
} = require('../services/classification.service');
const User = require('../models/User.model');
const BehaviorWeek = require('../models/BehaviorWeek.model');
const BehaviorDay = require('../models/BehaviorDay.model');
const ClassifiedVideo = require('../models/ClassifiedVideo.model');
const VideoWatchTime = require('../models/VideoWatchTime.model');

classificationQueue.process(async (job) => {
  const { userId } = job.data;
  console.log(`Starting classification for user ${userId}`);

  // 1. Get user with their context
  const user = await User.findById(userId);
  if (!user || !user.youtubeConnected) {
    throw new Error('User not found or YouTube not connected');
  }
  console.log(`[classify-${userId}] Step 1 complete — user loaded`);

  // 2. Update progress — user sees "classifying" state
  await job.progress(10);

  // 3. Fetch watch history (last 150 videos to avoid slamming the Free API Tier)
  let watchHistory;
  try {
    watchHistory = await fetchWatchHistory(user, 150);
  } catch (err) {
    if (err.message === 'YOUTUBE_DISCONNECTED') {
      await User.findByIdAndUpdate(userId, { youtubeConnected: false });
      throw err;
    }
    throw err;
  }

  console.log(`[classify-${userId}] Step 3 complete — fetched ${watchHistory.length} videos`);

  if (!watchHistory.length) {
    console.log(`[classify-${userId}] No watch history found. Setting unavailable flag.`);
    await User.findByIdAndUpdate(userId, { youtubeDataUnavailable: true, youtubeLastSyncAt: new Date() });
    return { error: 'No watch history found', totalVideos: 0 };
  }

  // ── ISO week boundaries — computed HERE so we can fetch VideoWatchTime early ──
  const _now = new Date();
  const _utcDayNum = _now.getUTCDay(); // 0=Sun … 6=Sat
  const _daysToMonday = _utcDayNum === 0 ? 6 : _utcDayNum - 1;
  const _thisWeekStart = new Date(_now);
  _thisWeekStart.setUTCDate(_now.getUTCDate() - _daysToMonday);
  _thisWeekStart.setUTCHours(0, 0, 0, 0);
  const thisWeekStartStr = _thisWeekStart.toISOString().split('T')[0];

  // Previous ISO week start — used to limit BehaviorDay writes and VideoWatchTime queries
  const _prevWeekStart = new Date(_thisWeekStart);
  _prevWeekStart.setUTCDate(_thisWeekStart.getUTCDate() - 7);
  const prevWeekStartStr = _prevWeekStart.toISOString().split('T')[0];

  // Fetch extension-tracked watch time for the current + previous week ONLY.
  // Queried by DATE (not videoId) so we capture ALL videos the extension tracked
  // this week.
  const watchTimeRecords = await VideoWatchTime.find({
    userId,
    date: { $gte: prevWeekStartStr },
  }).lean();

  // Inject extension records into watchHistory BEFORE deduplication
  // This ensures videos watched via extension are always classified and counted,
  // even if the YouTube API's HL playlist fails and falls back to Liked Videos.
  watchTimeRecords.forEach(r => {
    watchHistory.push({
      videoId: r.videoId,
      // Synthetic timestamp: noon UTC on the date recorded to avoid timezone boundary issues
      watchedAt: `${r.date}T12:00:00Z`
    });
  });

  // Deduplicate by videoId, keeping most recent watchedAt
  const deduped = new Map();
  watchHistory.forEach(v => {
    if (!deduped.has(v.videoId) || new Date(v.watchedAt) > new Date(deduped.get(v.videoId).watchedAt)) {
      deduped.set(v.videoId, v);
    }
  });
  watchHistory = Array.from(deduped.values());
  console.log(`[classify-${userId}] Deduplicated to ${watchHistory.length} videos`);

  await job.progress(30);

  // 4. Fetch metadata for all video IDs
  const videoIds = watchHistory.map((v) => v.videoId);
  const accessToken = await getValidAccessToken(user);
  let videoMetadata = await fetchVideoMetadata(videoIds, accessToken);
  console.log(`[classify-${userId}] Step 4 complete — fetched metadata for ${videoMetadata.length} videos`);

  // Per-date watch time lookup: "YYYY-MM-DD|videoId" → watchedSeconds.
  // Using per-date data (not an all-time cumulative sum) is critical:
  // if the user watched video X for 30 min on Monday and 45 min on Friday,
  // we assign 30 min to Monday and 45 min to Friday — NOT 75 min to each day.
  const watchTimeByDateMap = {};
  watchTimeRecords.forEach((r) => {
    const key = `${r.date}|${r.videoId}`;
    watchTimeByDateMap[key] = (watchTimeByDateMap[key] || 0) + r.watchedSeconds;
  });

  const hasExtensionData = watchTimeRecords.length > 0;
  console.log(
    `[classify-${userId}] Watch-time source: ` +
    `${watchTimeRecords.length} extension records, ` +
    `${Object.keys(watchTimeByDateMap).length} date-video pairs since ${prevWeekStartStr}; ` +
    `${hasExtensionData ? 'using extension data (with duration fallback for app watches)' : 'no extension data — using 70% video duration estimates'}`
  );

  // Video duration lookup — kept for reference/debug but NOT used for minute totals.
  // Only extension-reported watch time contributes to totalMinutes.
  // Videos without extension data contribute 0 minutes.
  const durationMinutesMap = {};
  videoMetadata.forEach((v) => {
    durationMinutesMap[v.videoId] = Math.round((v.durationSeconds || 300) / 60);
  });

  await job.progress(50);

  // 4B. Load cached classifications — skip re-sending already-classified videos to Gemini
  const cachedDocs = await ClassifiedVideo.find({
    userId,
    videoId: { $in: videoIds },
    source: 'gemini', // only trust Gemini-classified cache; re-classify keyword_fallback results
  }).lean();

  const cachedMap = {};
  for (const doc of cachedDocs) {
    cachedMap[doc.videoId] = {
      videoId: doc.videoId,
      channelId: doc.channelId,
      channelName: doc.channelName,
      category: doc.category,
      matchedInterest: doc.matchedInterest,
      source: 'cache',
    };
  }

  const cachedVideoIds = new Set(Object.keys(cachedMap));
  const uncachedMetadata = videoMetadata.filter((v) => !cachedVideoIds.has(v.videoId));
  const cachedResults = videoMetadata
    .filter((v) => cachedVideoIds.has(v.videoId))
    .map((v) => cachedMap[v.videoId]);

  console.log(
    `[classify-${userId}] Cache: ${cachedResults.length} hits, ${uncachedMetadata.length} new videos to classify`
  );

  // 5. Build user context for classification
  // Pass top known channels so Gemini has prior context on channel categories
  const userContext = {
    careerPath: user.careerPath,
    careerPathPreset: user.careerPathPreset,
    goals: user.goals,
    interests: user.interests,
    knownChannels: (user.topChannels || []).slice(0, 5).map((ch) => ({
      channelName: ch.channelName,
      category: ch.category,
    })),
  };

  // 6. Classify only uncached videos in batches
  // videoMetadata contains titles — used here, discarded after
  let newlyClassified = [];
  if (uncachedMetadata.length > 0) {
    newlyClassified = await classifyVideoBatch(uncachedMetadata, userContext);
    console.log(`[classify-${userId}] Step 6 complete — classified ${newlyClassified.length} new videos`);

    // Persist new classifications to cache (upsert — safe if job runs again)
    // Only cache Gemini results; keyword_fallback results are re-classified next sync
    const geminiResults = newlyClassified.filter((v) => !v.source || v.source === 'gemini' || v.source === undefined);
    if (geminiResults.length > 0) {
      const bulkOps = geminiResults.map((v) => ({
        updateOne: {
          filter: { userId, videoId: v.videoId },
          update: {
            $set: {
              userId,
              videoId: v.videoId,
              channelId: v.channelId,
              channelName: v.channelName,
              category: v.category,
              matchedInterest: v.matchedInterest || null,
              source: 'gemini',
            },
          },
          upsert: true,
        },
      }));
      await ClassifiedVideo.bulkWrite(bulkOps, { ordered: false });
      console.log(`[classify-${userId}] Cached ${geminiResults.length} new classifications`);
    }
  } else {
    console.log(`[classify-${userId}] Step 6 skipped — all ${videoIds.length} videos already cached`);
  }

  // Merge cached + newly classified results
  const classifiedVideos = [...cachedResults, ...newlyClassified];
  console.log(`[classify-${userId}] Total classified: ${classifiedVideos.length} videos`);

  // STEP 6B — Fallback interest matching for videos classified as "interest" but with null matchedInterest
  // Gemini sometimes returns cat="interest" with interest=null — we recover from channel name keywords
  const interestChannelHints = {
    cricket: ['cricket', 'ipl', 'bcci', 'csk', 'rcb', 'mi ', 'srh', 'kkr', 'dc ', 'pbks'],
    gaming: ['gaming', 'gamer', 'game', 'gameplay', 'esport', 'esports', 'plays', 'playthrough'],
    music: ['music', 'songs', 'lyrics', 'beats', 'rap', 'hiphop', 'hip-hop', 'records', 'artist', 'official'],
    movies: ['movies', 'film', 'cinema', 'trailer', 'review', 'series'],
    fitness: ['fitness', 'workout', 'gym', 'yoga', 'exercise', 'bodybuilding', 'calisthenics'],
    travel: ['travel', 'vlog', 'vlogs', 'trip', 'tours', 'destination'],
    cooking: ['cooking', 'recipe', 'chef', 'food', 'kitchen', 'baking', 'cuisine'],
    anime: ['anime', 'manga', 'otaku', 'dubbed', 'subbed'],
    football: ['football', 'soccer', 'fifa', 'premier league', 'la liga', 'ucl'],
    basketball: ['nba', 'basketball', 'hoops'],
    photography: ['photography', 'camera', 'photo', 'lens', 'lightroom'],
    finance: ['finance', 'investing', 'stock', 'crypto', 'trading', 'money'],
    science: ['science', 'physics', 'chemistry', 'biology', 'nasa', 'space'],
  };
  const userInterestLabels = (user.interests || []).map(i => i.label.toLowerCase());

  classifiedVideos.forEach(v => {
    if (v.category === 'interest' && !v.matchedInterest) {
      const channelLower = (v.channelName || '').toLowerCase();
      for (const interestLabel of userInterestLabels) {
        const hints = interestChannelHints[interestLabel] || [interestLabel];
        if (hints.some(hint => channelLower.includes(hint))) {
          v.matchedInterest = interestLabel;
          break;
        }
      }
    }
  });
  const recoveredCount = classifiedVideos.filter(v => v.category === 'interest' && v.matchedInterest).length;
  console.log(`[classify-${userId}] Interest recovery: ${recoveredCount} interest videos with matched labels`);

  await job.progress(80);

  // 7. Aggregate results into weekly buckets
  const aggregated = aggregateClassificationResults(
    classifiedVideos,
    watchHistory
  );
  console.log(`[classify-${userId}] Step 7 complete — aggregated into ${aggregated.weeklyBreakdown.length} weeks`);

  // (Week boundaries: _now, _thisWeekStart, thisWeekStartStr, prevWeekStartStr
  //  were computed above — before the VideoWatchTime fetch — so they are
  //  already available here for use in Steps 8, 8B, and 9.)

  // 8. Upsert BehaviorWeek documents for each week
  for (const week of aggregated.weeklyBreakdown) {
    // Calculate interest breakdown for this specific week
    // by filtering classifiedVideos to this week's date range
    const weekStart = new Date(week.weekStart)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)

    // Get watchedAt timestamps for videos in this week
    const weekVideoIds = new Set()
    watchHistory.forEach(w => {
      const watchedAt = new Date(w.watchedAt)
      if (watchedAt >= weekStart && watchedAt <= weekEnd) {
        weekVideoIds.add(w.videoId)
      }
    })

    // Filter classified videos to this week
    const weekClassified = classifiedVideos.filter(
      v => weekVideoIds.has(v.videoId)
    )

    // Build interest breakdown for this week
    const weekInterestBreakdown = {}
    weekClassified.forEach(v => {
      if (v.category === 'interest' && v.matchedInterest) {
        const normalizedInterest = v.matchedInterest.toLowerCase()
        weekInterestBreakdown[normalizedInterest] = 
          (weekInterestBreakdown[normalizedInterest] || 0) + 1
      }
    })

    // Build a per-video watch-time total specifically for this week's date range.
    // Summing watchTimeByDateMap entries whose date falls within [weekStart, weekEnd]
    // gives the true watched minutes per video in this week — no cross-week contamination.
    const weekStartDateStr = weekStart.toISOString().split('T')[0];
    const weekEndDateStr   = weekEnd.toISOString().split('T')[0];

    // videoId → total watched seconds this week (from extension records)
    const weekWatchSecondsMap = {};
    watchTimeRecords.forEach((r) => {
      if (r.date >= weekStartDateStr && r.date <= weekEndDateStr) {
        weekWatchSecondsMap[r.videoId] = (weekWatchSecondsMap[r.videoId] || 0) + r.watchedSeconds;
      }
    });

    // Total minutes for the week.
    // Prefers extension-reported watch time; falls back to 70% of video duration
    // for videos watched via YouTube app (not captured by extension).
    const weekEstimatedMinutes = Array.from(weekVideoIds).reduce((sum, vid) => {
      const extSecs = weekWatchSecondsMap[vid];
      if (extSecs) return sum + Math.round(extSecs / 60);
      // Fallback: 70% of video duration for non-extension-tracked videos (app watches)
      const durationMin = durationMinutesMap[vid];
      if (durationMin) return sum + Math.round(durationMin * 0.7);
      return sum;
    }, 0);

    // Interest minutes for the week (used for daily average budget calculation)
    const totalInterestVideos = weekClassified.filter(v => v.category === 'interest').length || 1;
    const weekInterestMinutes = weekClassified
      .filter(v => v.category === 'interest')
      .reduce((sum, v) => {
        const extSecs = weekWatchSecondsMap[v.videoId];
        if (extSecs) return sum + Math.round(extSecs / 60);
        const durationMin = durationMinutesMap[v.videoId];
        if (durationMin) return sum + Math.round(durationMin * 0.7);
        return sum;
      }, 0);

    const dailyInterestMinutes = {}
    Object.entries(weekInterestBreakdown).forEach(([interest, count]) => {
      const share = count / totalInterestVideos
      dailyInterestMinutes[interest] = Math.round(
        (weekInterestMinutes * share) / 7
      )
    })

    const isCurrentWeek =
      new Date(week.weekStart).toISOString().split('T')[0] === thisWeekStartStr;

    // GUARD: For past weeks, only create if no document exists yet.
    // This prevents retriggering classification from overwriting finalised
    // historical percentages when the user changes their goals/interests.
    // Past weeks are written ONCE (on first sync after connecting YouTube);
    // only the current week is recalculated on every sync.
    if (!isCurrentWeek) {
      const existingWeek = await BehaviorWeek.findOne(
        { userId, weekStart: new Date(week.weekStart) }
      ).select('_id').lean();

      if (existingWeek) {
        console.log(`[classify-${userId}] Week ${week.weekStart}: preserved (historical, not overwritten)`);
        continue; // skip — do not overwrite this past week's stored data
      }
      // First time we've seen this week — fall through to create it below
    }

    // --- DURATION-BASED MATH FOR CONTENT DIET PERCENTAGES ---
    // Instead of using simple counts (1 goal video + 1 junk video = 50% goal),
    // we use the actual minutes spent watching to calculate the true behavioral ratio.
    let weekGoalMins = 0;
    let weekInterestMins = 0;
    let weekJunkMins = 0;

    weekClassified.forEach(v => {
      let mins = 0;
      const extSecs = weekWatchSecondsMap[v.videoId];
      if (extSecs) {
        mins = Math.round(extSecs / 60);
      } else {
        const durationMin = durationMinutesMap[v.videoId];
        if (durationMin) mins = Math.round(durationMin * 0.7);
      }

      // Default baseline of 1 minute if a video genuinely has 0 tracking & 0 metadata
      if (mins === 0) mins = 1;

      if (v.category === 'goal') weekGoalMins += mins;
      else if (v.category === 'interest') weekInterestMins += mins;
      else if (v.category === 'junk') weekJunkMins += mins;
    });

    const totalCategorizedMins = weekGoalMins + weekInterestMins + weekJunkMins;
    
    const trueGoalPercent = totalCategorizedMins > 0 
      ? Math.round((weekGoalMins / totalCategorizedMins) * 1000) / 10 
      : 0;
    const trueInterestPercent = totalCategorizedMins > 0 
      ? Math.round((weekInterestMins / totalCategorizedMins) * 1000) / 10 
      : 0;
    const trueJunkPercent = totalCategorizedMins > 0 
      ? Math.round((weekJunkMins / totalCategorizedMins) * 1000) / 10 
      : 0;

    const weekUpdateOp = {
      $set: {
        userId,
        weekStart: new Date(week.weekStart),
        careerRelevantPercent: trueGoalPercent, // Used to be week.goalPercent
        interestPercent: trueInterestPercent, // Used to be week.interestPercent
        junkPercent: trueJunkPercent, // Used to be week.junkPercent

        interestBreakdown: weekInterestBreakdown,
        dailyInterestMinutes,
        totalScrollMinutes: weekEstimatedMinutes,
        youtubeVideosClassified: week.totalVideos,
      },
    };

    await BehaviorWeek.findOneAndUpdate(
      { userId, weekStart: new Date(week.weekStart) },
      weekUpdateOp,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
  }
  console.log(`[classify-${userId}] Step 8 complete — BehaviorWeek docs upserted`);

  // STEP 8B — Auto-populate BehaviorDay from YouTube watch timestamps
  // Group watch history by date to create daily activity records

  // Group videos by date
  const dailyActivity = {}
  
  watchHistory.forEach(w => {
    const date = new Date(w.watchedAt).toISOString().split('T')[0]
    if (!dailyActivity[date]) {
      dailyActivity[date] = {
        videoIds: [],
        hours: [],
      }
    }
    dailyActivity[date].videoIds.push(w.videoId)
    dailyActivity[date].hours.push(new Date(w.watchedAt).getHours())
  })

  // Supplement dailyActivity with extension-tracked videos that may have been
  // lost during deduplication. Dedup keeps only the most recent watchedAt per
  // videoId, so if a video was watched on Mon AND Fri, only Fri's dailyActivity
  // gets it. Extension records have per-date granularity — add the video to its
  // actual tracked date so BehaviorDay records reflect real per-day usage.
  watchTimeRecords.forEach(r => {
    if (r.date < prevWeekStartStr) return;
    if (!dailyActivity[r.date]) {
      dailyActivity[r.date] = { videoIds: [], hours: [] }
    }
    if (!dailyActivity[r.date].videoIds.includes(r.videoId)) {
      dailyActivity[r.date].videoIds.push(r.videoId)
    }
  })

  // For each day with YouTube activity, upsert BehaviorDay
  const userDoc = await User.findById(userId).select('dailyLimitMinutes').lean()
  const dailyLimit = userDoc?.dailyLimitMinutes || 90

  for (const [date, dayData] of Object.entries(dailyActivity)) {
    // Only update BehaviorDay for the current ISO week and the previous week.
    // Older data is already archived in BehaviorWeek documents and is not needed
    // for the daily metrics view (interest budgets, today's usage, etc.).
    if (date < prevWeekStartStr) continue;

    // Sum actual extension-tracked watch time for this specific calendar day.
    // Per-date lookup ensures Monday's minutes only count Monday's watching.
    // Falls back to 70% of video duration for app-watched videos without extension data.
    const estimatedMinutes = dayData.videoIds.reduce((sum, vid) => {
      const extSeconds = watchTimeByDateMap[`${date}|${vid}`];
      if (extSeconds) return sum + Math.round(extSeconds / 60);
      // Fallback for videos watched via YouTube app
      const durationMin = durationMinutesMap[vid];
      if (durationMin) return sum + Math.round(durationMin * 0.7);
      return sum;
    }, 0);

    // Find classified data for this day's videos
    const dayVideoSet = new Set(dayData.videoIds)
    const dayClassified = classifiedVideos.filter(
      v => dayVideoSet.has(v.videoId)
    )

    const dayGoal = dayClassified.filter(v => v.category === 'goal').length
    const dayInterest = dayClassified.filter(v => v.category === 'interest').length
    const dayJunk = dayClassified.filter(v => v.category === 'junk').length
    const dayTotal = dayClassified.length || 1

    // Peak hour for this day
    const hourCounts = {}
    dayData.hours.forEach(h => {
      hourCounts[h] = (hourCounts[h] || 0) + 1
    })
    const peakHour = Object.keys(hourCounts).length > 0
      ? parseInt(
          Object.keys(hourCounts)
            .sort((a, b) => hourCounts[b] - hourCounts[a])[0]
        )
      : null

    const dayDate = new Date(date)
    const dayOfWeek = dayDate.getDay()
    const dayNames = [
      'Sunday','Monday','Tuesday','Wednesday',
      'Thursday','Friday','Saturday'
    ]

    // Interest breakdown for this day
    const dayInterestBreakdown = {}
    dayClassified.forEach(v => {
      if (v.category === 'interest' && v.matchedInterest) {
        const normalizedInterest = v.matchedInterest.toLowerCase()
        dayInterestBreakdown[normalizedInterest] = 
          (dayInterestBreakdown[normalizedInterest] || 0) + 1
      }
    })

    // Build per-interest actual duration for today using per-date extension data.
    // Falls back to 70% of video duration for app-watched videos.
    const dayInterestMinutes = {};
    dayClassified.forEach(v => {
      if (v.category === 'interest' && v.matchedInterest) {
        const normalizedInterest = v.matchedInterest.toLowerCase();
        const extSeconds = watchTimeByDateMap[`${date}|${v.videoId}`];
        let minsForVideo = 0;
        if (extSeconds) {
          minsForVideo = Math.round(extSeconds / 60);
        } else {
          const durationMin = durationMinutesMap[v.videoId];
          if (durationMin) minsForVideo = Math.round(durationMin * 0.7);
        }
        dayInterestMinutes[normalizedInterest] =
          (dayInterestMinutes[normalizedInterest] || 0) + minsForVideo;
      }
    });

    // Upsert BehaviorDay — use $max for minutes so manual logs
    // can only increase the value, never decrease it.
    // Use dot-notation for Map keys so each interest is updated independently
    // (avoids Mongoose Map serialization quirks with top-level $set).
    const setOp = {
      userId,
      date,
      dayOfWeek,
      dayName: dayNames[dayOfWeek],
      peakHour,
      dailyLimitMinutes: dailyLimit,
      youtubeMinutes: estimatedMinutes,
      exceededLimit: estimatedMinutes > dailyLimit,
      youtubeDataFetched: true,
    };

    // Write each interest budget key individually via dot-notation
    const interestSetPaths = {};
    Object.entries(dayInterestMinutes).forEach(([interest, mins]) => {
      interestSetPaths[`youtubeInterestMinutes.${interest}`] = mins;
    });

    await BehaviorDay.findOneAndUpdate(
      { userId, date },
      {
        // Use $set for ALL fields — including totalScrollMinutes.
        // Previously used $max for totalScrollMinutes which meant once a day
        // had an inflated value (e.g. 5100 min from pre-fix data) it could
        // NEVER be corrected downward. Now every sync writes the freshly
        // recalculated value so stale data is always overwritten.
        $set: { ...setOp, totalScrollMinutes: estimatedMinutes, ...interestSetPaths },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
    
    console.log(
      `[classify-${userId}] BehaviorDay updated for ${date}: ` +
      `${estimatedMinutes} min estimated, ${dayData.videoIds.length} videos`
    )
  }
  
  console.log(
    `[classify-${userId}] Step 8B complete — ` +
    `${Object.keys(dailyActivity).length} BehaviorDay docs updated from YouTube`
  )

  // 9. Store top channels on user document — CURRENT WEEK ONLY
  // Build topChannels from videos watched in the current ISO week (Mon–Sun)
  // so the dashboard only shows channels from this week, not all-time history.
  // (_thisWeekStart was calculated before Step 8)

  const thisWeekVideoIds = new Set(
    watchHistory
      .filter(w => new Date(w.watchedAt) >= _thisWeekStart)
      .map(w => w.videoId)
  );
  const thisWeekClassified = classifiedVideos.filter(v => thisWeekVideoIds.has(v.videoId));

  // Build per-channel watch seconds for this week from extension data
  const thisWeekWatchSecondsPerChannel = {};
  watchTimeRecords.forEach((r) => {
    if (r.date >= thisWeekStartStr) {
      // Find which channel this video belongs to
      const classified = classifiedVideos.find(v => v.videoId === r.videoId);
      if (classified && classified.channelId) {
        thisWeekWatchSecondsPerChannel[classified.channelId] =
          (thisWeekWatchSecondsPerChannel[classified.channelId] || 0) + r.watchedSeconds;
      }
    }
  });

  const thisWeekChannelMap = {};
  thisWeekClassified.forEach((v) => {
    if (!thisWeekChannelMap[v.channelId]) {
      thisWeekChannelMap[v.channelId] = {
        channelName: v.channelName,
        channelId: v.channelId,
        count: 0,
        categories: {},
      };
    }
    thisWeekChannelMap[v.channelId].count++;
    thisWeekChannelMap[v.channelId].categories[v.category] =
      (thisWeekChannelMap[v.channelId].categories[v.category] || 0) + 1;
  });

  const thisWeekTopChannels = Object.values(thisWeekChannelMap)
    .map((ch) => {
      const sortedCats = Object.entries(ch.categories).sort((a, b) => b[1] - a[1]);
      return {
        channelName: ch.channelName,
        channelId: ch.channelId,
        category: sortedCats[0][0],
        count: ch.count,
        watchMinutes: Math.round((thisWeekWatchSecondsPerChannel[ch.channelId] || 0) / 60),
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  console.log(`[classify-${userId}] This week: ${thisWeekVideoIds.size} videos, ${thisWeekTopChannels.length} channels`);

  await User.findByIdAndUpdate(userId, {
    youtubeLastSyncAt: new Date(),
    topChannels: thisWeekTopChannels,
    youtubeDataUnavailable: false, // clear stale unavailable flag — we have data now
  });
  console.log(`[classify-${userId}] Step 9 complete — youtubeLastSyncAt + topChannels (this week) saved`);

  await job.progress(100);
  console.log(
    `Classification complete for user ${userId}: ` +
      `${aggregated.totalVideos} videos, ` +
      `${aggregated.goalPercent}% goal-relevant`
  );

  return {
    totalVideos: aggregated.totalVideos,
    goalPercent: aggregated.goalPercent,
    weeksProcessed: aggregated.weeklyBreakdown.length,
  };
});

// Export queue reference for use in controllers
module.exports = classificationQueue;
