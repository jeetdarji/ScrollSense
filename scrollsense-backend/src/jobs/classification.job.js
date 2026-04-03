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
    console.log(`[classify-${userId}] No watch history found, generating mock history for demonstration`);
    // Generate 30 videos across last 3 weeks (realistic for free API)
    watchHistory = Array.from({ length: 30 }).map((_, i) => ({
      videoId: `mock_video_${i}`,
      watchedAt: new Date(
        Date.now() - Math.floor(i * (21 * 24 * 60 * 60 * 1000 / 30))
      ).toISOString()
    }));
  }

  await job.progress(30);

  // 4. Fetch metadata for all video IDs
  let videoMetadata = [];
  if (watchHistory[0]?.videoId.startsWith('mock_video_')) {
    console.log(`[classify-${userId}] Generating mock video metadata for demonstration`);
    const goalTitles = [
      'System Design Interview Crash Course',
      'LeetCode Dynamic Programming Patterns',
      'React 18 Concurrent Features Explained',
      'Node.js Performance Optimization Guide',
      'How to Crack FAANG Interviews',
      'Data Structures in JavaScript',
      'Building REST APIs with Express',
      'MongoDB Aggregation Pipeline Tutorial',
      'Git Advanced Workflows for Teams',
      'Clean Code Principles Every Dev Must Know',
    ]
    const interestTitles = [
      'IPL 2024 Best Moments Compilation',
      'Top 10 Cricket Catches of All Time',
      'Epic Gaming Moments - Valorant',
      'Bollywood Songs Jukebox 2024',
      'Street Food Tour Mumbai',
      'India vs Australia Test Highlights',
    ]
    const junkTitles = [
      'Try Not To Laugh Challenge',
      'Random Facts You Never Knew',
      'Satisfying Videos Compilation',
      'Viral Videos of the Week',
      'Top Memes of 2024',
      'Celebrity Interview Gone Wrong',
      'Prank Wars Season 3',
      'ASMR Cooking Videos',
      'Morning Routine of a Billionaire',
      'Conspiracy Theories Exposed',
      'Couple Goals Compilation',
      'Cat Videos Best of 2024',
      'Social Media Trends Explained',
      'Drama Compilation 2024',
    ]

    videoMetadata = watchHistory.map((v, i) => {
      // Distribution: 33% goal, 20% interest, 47% junk
      // This makes the dashboard show realistic data
      let title, channel
      if (i % 3 === 0) {
        title = goalTitles[i % goalTitles.length]
        channel = 'TechWithTim'
      } else if (i % 5 === 0) {
        title = interestTitles[i % interestTitles.length]
        channel = 'Sports Network India'
      } else {
        title = junkTitles[i % junkTitles.length]
        channel = 'Entertainment Hub'
      }
      return {
        videoId: v.videoId,
        title,
        channelName: channel,
        channelId: `channel_${i % 5}`,
        categoryId: i % 3 === 0 ? '28' : '24'
      }
    })
  } else {
    const videoIds = watchHistory.map((v) => v.videoId);
    const accessToken = await getValidAccessToken(user);
    videoMetadata = await fetchVideoMetadata(videoIds, accessToken);
  }
  console.log(`[classify-${userId}] Step 4 complete — fetched metadata for ${videoMetadata.length} videos`);

  await job.progress(50);

  // 5. Build user context for classification
  const userContext = {
    careerPath: user.careerPath,
    careerPathPreset: user.careerPathPreset,
    goals: user.goals,
    interests: user.interests,
  };

  // 6. Classify all videos in batches
  // videoMetadata contains titles — used here, discarded after
  const classifiedVideos = await classifyVideoBatch(videoMetadata, userContext);
  // At this point titles are gone — classifiedVideos has no title field
  console.log(`[classify-${userId}] Step 6 complete — classified ${classifiedVideos.length} videos`);

  await job.progress(80);

  // 7. Aggregate results into weekly buckets
  const aggregated = aggregateClassificationResults(
    classifiedVideos,
    watchHistory
  );
  console.log(`[classify-${userId}] Step 7 complete — aggregated into ${aggregated.weeklyBreakdown.length} weeks`);

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
        weekInterestBreakdown[v.matchedInterest] = 
          (weekInterestBreakdown[v.matchedInterest] || 0) + 1
      }
    })

    // Estimate daily minutes per interest
    // Total interest minutes for week / 7 days, weighted by video count
    const totalInterestVideos = weekClassified.filter(
      v => v.category === 'interest'
    ).length || 1

    const weekInterestMinutes = week.interestPercent / 100 * 
      (week.totalVideos > 0 ? week.totalVideos * 3 : 30) // ~3 min per video estimate

    const dailyInterestMinutes = {}
    Object.entries(weekInterestBreakdown).forEach(([interest, count]) => {
      const share = count / totalInterestVideos
      dailyInterestMinutes[interest] = Math.round(
        (weekInterestMinutes * share) / 7
      )
    })

    const weekEstimatedMinutes = week.totalVideos * 3;

    await BehaviorWeek.findOneAndUpdate(
      { userId, weekStart: new Date(week.weekStart) },
      {
        $set: {
          userId,
          weekStart: new Date(week.weekStart),
          careerRelevantPercent: week.goalPercent,
          interestPercent: week.interestPercent,
          junkPercent: week.junkPercent,
          interestBreakdown: weekInterestBreakdown,
          dailyInterestMinutes,
        },
        $max: {
          totalScrollMinutes: weekEstimatedMinutes,
          sessionsCount: week.totalVideos
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
  }
  console.log(`[classify-${userId}] Step 8 complete — BehaviorWeek docs upserted`);

  // STEP 8B — Auto-populate BehaviorDay from YouTube watch timestamps
  // Group watch history by date to create daily activity records
  
  const BehaviorDay = require('../models/BehaviorDay.model')
  
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

  // For each day with YouTube activity, upsert BehaviorDay
  const userDoc = await User.findById(userId).select('dailyLimitMinutes').lean()
  const dailyLimit = userDoc?.dailyLimitMinutes || 90

  for (const [date, dayData] of Object.entries(dailyActivity)) {
    // Estimate minutes: assume ~3 minutes per video watched
    // This is conservative — real average YouTube session is 3-7 min per video
    const estimatedMinutes = dayData.videoIds.length * 3

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
        dayInterestBreakdown[v.matchedInterest] = 
          (dayInterestBreakdown[v.matchedInterest] || 0) + 1
      }
    })

    // Convert interest video counts to estimated minutes
    const dayInterestMinutes = {}
    const totalInterestVids = dayInterest || 1
    Object.entries(dayInterestBreakdown).forEach(([interest, count]) => {
      dayInterestMinutes[interest] = Math.round(
        (count / totalInterestVids) * 
        (dayInterest * 3)  // 3 min per interest video
      )
    })

    // Upsert BehaviorDay — use $max for minutes so manual logs
    // can only increase the value, never decrease it
    const setOp = {
      userId,
      date,
      dayOfWeek,
      dayName: dayNames[dayOfWeek],
      peakHour,
      dailyLimitMinutes: dailyLimit,
      youtubeMinutes: estimatedMinutes,
      exceededLimit: estimatedMinutes > dailyLimit,
    };
    if (Object.keys(dayInterestMinutes).length > 0) {
      setOp.youtubeInterestMinutes = dayInterestMinutes;
    }

    await BehaviorDay.findOneAndUpdate(
      { userId, date },
      {
        $set: setOp,
        $max: {
          totalScrollMinutes: estimatedMinutes,
        },
        $inc: {
          sessionsCount: 0,  // don't increment — YouTube data is not a session
        },
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

  // 9. Store top channels on user document
  // Channel names are public info — safe to store
  await User.findByIdAndUpdate(userId, {
    youtubeLastSyncAt: new Date(),
    topChannels: aggregated.topChannels.slice(0, 10),
  });
  console.log(`[classify-${userId}] Step 9 complete — youtubeLastSyncAt + topChannels saved`);

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
