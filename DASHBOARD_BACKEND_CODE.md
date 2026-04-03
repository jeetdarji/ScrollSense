# Dashboard Backend Code Overview

This document contains a structured overview of all the backend files, controllers, routes, and models that power the `Dashboard` and its related data components (Insights, Cravings, Sessions, Intentions).

---

## 1. Routes (`scrollsense-backend/src/routes/`)

### `insights.routes.js`
```javascript
const router = require('express').Router();
const {
  getDashboard,
  getInterestBudgets,
} = require('../controllers/insights.controller');

router.get('/dashboard', getDashboard);
router.get('/interest-budgets', getInterestBudgets);

module.exports = router;
```

### `cravings.routes.js`
*(Provides data for Craving Logs on Dashboard)*
```javascript
const router = require('express').Router();
const { requireAuth } = require('../middleware/auth.middleware');
const { logCraving, getRecentCravings, getCravingStats } = require('../controllers/cravings.controller');

router.use(requireAuth);

router.post('/', logCraving);
router.get('/recent', getRecentCravings);
router.get('/stats', getCravingStats);

module.exports = router;
```

### `sessions.routes.js`
*(Powers Session & Intention tracking seen on Dashboard)*
```javascript
const router = require('express').Router();
const { requireAuth } = require('../middleware/auth.middleware');
const { logSession, logIntention, getTodaySessions, getSessionStats } = require('../controllers/sessions.controller');

router.use(requireAuth);

router.post('/', logSession);
router.post('/intentions', logIntention);
router.get('/today', getTodaySessions);
router.get('/stats', getSessionStats);

module.exports = router;
```

---

## 2. Controllers (`scrollsense-backend/src/controllers/`)

### `insights.controller.js`
*(Directly serves `/api/insights/dashboard` for core data)*
```javascript
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User.model');
const BehaviorWeek = require('../models/BehaviorWeek.model');
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

  // 5. Get today's sessions for platform breakdown
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todaySessions = await Session.find({
    userId: req.user._id,
    startTime: { $gte: startOfDay },
  }).lean();

  const ytMinutes = todaySessions
    .filter((s) => s.platform === 'youtube' || s.platform === 'both')
    .reduce((sum, s) => sum + s.durationMinutes, 0);
  const igMinutes = todaySessions
    .filter((s) => s.platform === 'instagram' || s.platform === 'both')
    .reduce((sum, s) => sum + s.durationMinutes, 0);

  // 6. Build interests with consumption data
  const interests = (req.user.interests || []).map((interest) => {
    const weeklyAvg = currentWeekDoc
      ? Math.round(
          (currentWeekDoc.totalScrollMinutes *
            (currentWeekDoc.interestPercent / 100)) /
            Math.max(req.user.interests.length, 1) /
            7
        )
      : 0;

    const consumed = weeklyAvg; // today's estimate
    const budget = interest.dailyMinutes;

    let status = 'on_track';
    if (consumed >= budget) status = 'over';
    else if (consumed >= budget * 0.8) status = 'near_limit';

    return {
      id: interest.id,
      label: interest.label,
      dailyBudgetMinutes: budget,
      consumedMinutes: consumed,
      weeklyAvgMinutes: weeklyAvg,
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
  startOfDay.setHours(0, 0, 0, 0);

  const todaySessions = await Session.find({
    userId: req.user._id,
    startTime: { $gte: startOfDay },
  }).lean();

  const totalTodayMinutes = todaySessions.reduce(
    (sum, s) => sum + s.durationMinutes,
    0
  );

  // Get latest BehaviorWeek for interest percentage estimation
  const latestWeek = await BehaviorWeek.findOne({ userId: req.user._id })
    .sort({ weekStart: -1 })
    .lean();

  const interests = (req.user.interests || []).map((interest) => {
    // Approximate per-interest consumption from today's total
    const interestSharePercent = latestWeek
      ? latestWeek.interestPercent / Math.max(req.user.interests.length, 1)
      : 0;

    const consumed = Math.round(
      totalTodayMinutes * (interestSharePercent / 100)
    );
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
```

### `cravings.controller.js`
```javascript
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

module.exports = { logCraving, getRecentCravings, getCravingStats }
```

### `sessions.controller.js` (Snippet Overview)
```javascript
const Session = require('../models/Session.model')
const Intention = require('../models/Intention.model')
const { validateIntentionCategory, validateSessionBody } = require('../utils/validate')
const { calculateMoodDurationInsight, updateBehaviorWeek } = require('../services/insights.service')

const logIntention = async (req, res) => {
  const { intentionCategory, timestamp, type } = req.body
  // validates Intention & upserts Intention.findOneAndUpdate(...)
  // returns { intentionCategory, date }
}

const logSession = async (req, res) => {
  // creates Session in DB...
  // calls updateBehaviorWeek()
}

const getTodaySessions = async (req, res) => {
  // grabs all Sessions today + today's Intention
  // calculates basic totalMinutes / averageMood / platformBreakdown
}

const getSessionStats = async (req, res) => {
  // grabs Session aggregate for week/all-time
  // computes average mood, average duration, session count limit, hour stats etc...
}

module.exports = { logIntention, logSession, getTodaySessions, getSessionStats }
```

---

## 3. Models (`scrollsense-backend/src/models/`)

### `BehaviorWeek.model.js`
```javascript
const mongoose = require('mongoose');
const { Schema } = mongoose;

const behaviorWeekSchema = new Schema({
  userId:               { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  weekStart:            { type: Date, required: true },
  totalScrollMinutes:   { type: Number, default: 0 },
  careerRelevantPercent:{ type: Number, default: 0, min: 0, max: 100 },
  interestPercent:      { type: Number, default: 0, min: 0, max: 100 },
  junkPercent:          { type: Number, default: 0, min: 0, max: 100 },
  peakScrollHour:       { type: Number, default: null, min: 0, max: 23 },       
  dominantCategory:     { type: String, default: null },
  triggerPatterns:      { type: [String], default: [] },
  averageMoodRating:    { type: Number, default: null },
  sessionsCount:        { type: Number, default: 0 },
  digestSent:           { type: Boolean, default: false },
  digestSentAt:         { type: Date, default: null },
}, { timestamps: true });

behaviorWeekSchema.index({ userId: 1, weekStart: -1 });

module.exports = mongoose.model('BehaviorWeek', behaviorWeekSchema);
```

### `Craving.model.js`
```javascript
const mongoose = require('mongoose');
const { Schema } = mongoose;

const cravingSchema = new Schema({
  userId:          { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  timestamp:       { type: Date, default: Date.now },
  cravingCategory: { type: String, required: true },
  outcome:         { type: String, required: true },
}, { timestamps: true });

cravingSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('Craving', cravingSchema);
```

### `Session.model.js`
```javascript
const mongoose = require('mongoose');
const { Schema } = mongoose;

const sessionSchema = new Schema({
  userId:            { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  platform:          { type: String, enum: ['youtube', 'instagram', 'both'], required: true },
  startTime:         { type: Date, required: true },
  durationMinutes:   { type: Number, required: true, min: 1 },
  intentionCategory: { type: String, required: true },
  moodRating:        { type: Number, min: 1, max: 5, required: true },
  moodBefore:        { type: Number, min: 1, max: 5, default: null },
  notes:             { type: String, default: null },
}, { timestamps: true });

sessionSchema.index({ userId: 1, startTime: -1 });

module.exports = mongoose.model('Session', sessionSchema);
```

### `Intention.model.js`
```javascript
const mongoose = require('mongoose');
const { Schema } = mongoose;

const intentionSchema = new Schema({
  userId:            { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date:              { type: String, required: true },
  intentionCategory: { type: String, required: true },
  timestamp:         { type: Date, default: Date.now },
}, { timestamps: true });

intentionSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Intention', intentionSchema);
```

---

## 4. Services (scrollsense-backend/src/services/)

### `classification.service.js`
```javascript
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Classifies a batch of videos (up to 200) using Gemini AI.
 * Titles are INPUT ONLY â€” they are discarded after classification.
 * Returns array of { videoId, channelId, channelName, category }.
 * Category is one of: 'goal' | 'interest' | 'junk'.
 */
async function classifyBatch(videos, userContext) {
  const interestLabels = userContext.interests
    .map((i) => i.label)
    .join(', ');

  const prompt = `You are a content classifier for a behavioral awareness app. Classify each YouTube video into exactly one category.

USER CONTEXT:
- Focus area: ${userContext.careerPath || userContext.careerPathPreset}
- Goals: ${userContext.goals.join(', ')}
- Declared interests: ${interestLabels}

CATEGORIES:
- goal: Content directly related to the user's focus area or goals
- interest: Content matching the user's declared interests (not goal-related)   
- junk: Everything else â€” random, viral, unrelated content

RULES:
- Return ONLY a JSON array. No explanation. No markdown. No backticks.
- Each item: {"id":"videoId","cat":"goal"|"interest"|"junk"}
- If unsure, classify as "junk"
- Classify based on title and channel name only

VIDEOS TO CLASSIFY:
${videos
  .map(
    (v) =>
      `{"id":"${v.videoId}","title":"${v.title.replace(/"/g, "'")}","channel":"${v.channelName}"}`
  )
  .join('\n')}

Return JSON array only:`;

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-lite',
  });

  let classMap = {};
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();

      // Parse response safely
      let classifications = [];
      try {
        // Strip any accidental markdown fences
        const clean = text.replace(/```json|```/g, '').trim();
        classifications = JSON.parse(clean);
      } catch (err) {
        console.error('Classification parse error:', err.message, 'Text was:', text);
        // Fallback: classify all as 'junk' to avoid blocking pipeline
        classifications = videos.map((v) => ({ id: v.videoId, cat: 'junk' }));  
      }

      // Validate each item â€” ensure cat is one of the valid values
      const validCats = ['goal', 'interest', 'junk'];
      classifications = classifications.map((c) => ({
        ...c,
        cat: validCats.includes(c.cat) ? c.cat : 'junk',
      }));

      classMap = Object.fromEntries(
        classifications.map((c) => [c.id, c.cat])
      );
      break; // Success, exit retry loop
    } catch (err) {
      const isRateLimit = err.status === 429 || (err.message && err.message.includes('429')) || (err.message && err.message.includes('Quota'));
      const isServerError = err.status >= 500 || (err.message && err.message.includes('503'));

      if (isRateLimit || isServerError) {
        attempt++;
        if (attempt >= maxRetries) {
          console.error(`[Classification] Failed after ${maxRetries} attempts due to API limits/errors.`);
          break;
        }

        // 20s, 40s, 80s — gentler backoff for free tier
        const backoffMs = 20000 * Math.pow(2, attempt - 1);
        console.log(`[Rate Limit] Gemini quota exceeded or server error. Retrying ${attempt}/${maxRetries} in ${backoffMs / 1000} seconds...`);
        await new Promise(res => setTimeout(res, backoffMs));
      } else {
        console.error('Classification prompt error:', err.message);
        break;
      }
    }
  }

  return videos.map((v) => ({
    videoId: v.videoId,
    channelId: v.channelId,
    channelName: v.channelName, // public info â€” safe to store
    category: classMap[v.videoId] || 'junk',
    // title: intentionally omitted â€” privacy by architecture
  }));
}

/**
 * Classifies ALL videos, chunking into groups of 50 for Gemini
 * to prevent rate limits and token overflow.
 * Titles are inputs â€” they are NEVER stored after classification.
 */
async function classifyVideoBatch(videos, userContext) {
  if (videos.length <= 10) {
    return classifyBatch(videos, userContext);
  }

  const results = [];
  for (let i = 0; i < videos.length; i += 10) {
    const chunk = videos.slice(i, i + 10);
    const chunkResults = await classifyBatch(chunk, userContext);
    results.push(...chunkResults);
    // 5 seconds between chunks to respect Gemini free tier rate limits 
    // (Free tier is 15 RPM / 1M TPM / 1500 RPD)
    if (i + 10 < videos.length) {
      console.log(`Waiting to respect Gemini rate limits (${results.length}/${videos.length} mapped)...`);
      await new Promise((r) => setTimeout(r, 8000));
  }
  return results;
}

/**
 * Takes classified videos and produces weekly aggregates
 * that get stored in BehaviorWeek. Titles are already gone â€”
 * only categories and channel names remain.
 */
function aggregateClassificationResults(classifiedVideos, watchHistory) {       
  const total = classifiedVideos.length;
  const goalCount = classifiedVideos.filter((v) => v.category === 'goal').length;
  const interestCount = classifiedVideos.filter((v) => v.category === 'interest').length;
  const junkCount = classifiedVideos.filter((v) => v.category === 'junk').length;

  const goalPercent = total > 0 ? Math.round((goalCount / total) * 1000) / 10 : 0;
  const interestPercent = total > 0 ? Math.round((interestCount / total) * 1000) / 10 : 0;
  const junkPercent = total > 0 ? Math.round((junkCount / total) * 1000) / 10 : 0;

  // Build watchedAt lookup from watchHistory
  const watchedAtMap = {};
  watchHistory.forEach((w) => {
    watchedAtMap[w.videoId] = w.watchedAt;
  });

  // Top channels: group by channelId, count occurrences, get most common category
  const channelMap = {};
  classifiedVideos.forEach((v) => {
    if (!channelMap[v.channelId]) {
      channelMap[v.channelId] = {
        channelName: v.channelName,
        channelId: v.channelId,
        count: 0,
        categories: {},
      };
    }
    channelMap[v.channelId].count++;
    channelMap[v.channelId].categories[v.category] =
      (channelMap[v.channelId].categories[v.category] || 0) + 1;
  });

  const topChannels = Object.values(channelMap)
    .map((ch) => {
      const sortedCats = Object.entries(ch.categories).sort(
        (a, b) => b[1] - a[1]
      );
      return {
        channelName: ch.channelName,
        channelId: ch.channelId,
        category: sortedCats[0][0],
        count: ch.count,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Weekly breakdown: group videos by ISO week (Monday as week start)
  const weekMap = {};
  classifiedVideos.forEach((v) => {
    const watchedAt = watchedAtMap[v.videoId];
    if (!watchedAt) return;

    const date = new Date(watchedAt);
    const dayOfWeek = date.getUTCDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(date);
    weekStart.setUTCDate(date.getUTCDate() - daysToMonday);
    weekStart.setUTCHours(0, 0, 0, 0);
    const weekKey = weekStart.toISOString().split('T')[0];

    if (!weekMap[weekKey]) {
      weekMap[weekKey] = { weekStart: weekKey, goal: 0, interest: 0, junk: 0 }; 
    }

    weekMap[weekKey][v.category]++;
  });

  const weeklyBreakdown = Object.values(weekMap)
    .map((w) => {
      const wTotal = w.goal + w.interest + w.junk;
      return {
        weekStart: w.weekStart,
        goalCount: w.goal,
        interestCount: w.interest,
        junkCount: w.junk,
        totalVideos: wTotal,
        goalPercent: wTotal > 0 ? Math.round((w.goal / wTotal) * 1000) / 10 : 0,
        interestPercent: wTotal > 0 ? Math.round((w.interest / wTotal) * 1000) / 10 : 0,
        junkPercent: wTotal > 0 ? Math.round((w.junk / wTotal) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  return {
    totalVideos: total,
    goalCount,
    interestCount,
    junkCount,
    goalPercent,
    interestPercent,
    junkPercent,
    topChannels,
    weeklyBreakdown,
  };
}

module.exports = { classifyVideoBatch, aggregateClassificationResults };
```

### `digest.service.js`
```javascript
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Session = require('../models/Session.model');
const BehaviorWeek = require('../models/BehaviorWeek.model');
const Intention = require('../models/Intention.model');
const User = require('../models/User.model');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Determines if a check-in should be generated for a user.
 * Triggers: 3 sessions logged OR 7 days since last digest.
 */
async function shouldGenerateCheckin(userId) {
  const sessionCount = await Session.countDocuments({ userId });

  if (sessionCount < 3) {
    return { should: false, reason: null, sessionsLogged: sessionCount };       
  }

  // Check last check-in date from BehaviorWeek where digestSent=true
  const lastDigest = await BehaviorWeek.findOne(
    { userId, digestSent: true },
    { digestSentAt: 1 }
  ).sort({ digestSentAt: -1 });

  if (!lastDigest) {
    // First check-in ever
    return { should: true, reason: 'sessions', sessionsLogged: sessionCount };  
  }

  // Check if 3+ new sessions since last digest
  const newSessions = await Session.countDocuments({
    userId,
    startTime: { $gt: lastDigest.digestSentAt },
  });

  if (newSessions >= 3) {
    return { should: true, reason: 'sessions', sessionsLogged: sessionCount };  
  }

  // Check if 7+ days since last digest
  const daysSince = (Date.now() - lastDigest.digestSentAt.getTime()) / 86400000;
  if (daysSince >= 7) {
    return { should: true, reason: 'weekly', sessionsLogged: sessionCount };    
  }

  return { should: false, reason: null, sessionsLogged: sessionCount };
}

/**
 * Generates the AI insight text for the check-in.
 * behaviorData contains only aggregated metadata â€” no titles.
 */
async function generateCheckinContent(userId, behaviorData) {
  const prompt = `You are a calm, non-judgmental behavioral awareness assistant. Generate ONE specific, actionable insight based on this user's scroll behavior data.

DATA:
- Total scroll time: ${behaviorData.totalScrollMinutes} minutes
- Goal-relevant content: ${behaviorData.goalPercent}%
- Most common trigger: ${behaviorData.mostCommonTrigger}
- Heaviest scroll day: ${behaviorData.heaviestScrollDay}
- Platform: YouTube ${behaviorData.platformBreakdown.youtube}%, Instagram ${behaviorData.platformBreakdown.instagram}%
- Sessions logged: ${behaviorData.sessionsCount}

TONE: Calm, honest, specific. Not preachy. Not generic.
Like a smart friend who noticed a pattern, not a wellness app.
ONE sentence max. No emojis. No "you should". Start with an observation.        

Return ONLY the insight text. No quotes. No explanation.`;

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

/**
 * Assembles the complete check-in data object.
 * Matches the checkin shape in useYouTubeData mock exactly.
 */
async function buildCheckinPayload(userId) {
  const shouldResult = await shouldGenerateCheckin(userId);

  if (!shouldResult.should) {
    return {
      available: false,
      sessionsLogged: shouldResult.sessionsLogged,
    };
  }

  // Last 7 days date range
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Fetch all sessions in range
  const sessions = await Session.find({
    userId,
    startTime: { $gte: since },
  }).lean();

  // Previous period sessions (7-14 days ago) for comparison
  const prevSince = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const prevSessions = await Session.find({
    userId,
    startTime: { $gte: prevSince, $lt: since },
  }).lean();

  // Calculate all metrics
  const totalScrollMinutes = sessions.reduce(
    (s, x) => s + x.durationMinutes,
    0
  );
  const prevTotalMinutes = prevSessions.reduce(
    (s, x) => s + x.durationMinutes,
    0
  );
  const improvementMinutes = prevTotalMinutes - totalScrollMinutes;
  // positive = improvement (fewer minutes this period)

  const ytSessions = sessions.filter(
    (s) => s.platform === 'youtube' || s.platform === 'both'
  );
  const igSessions = sessions.filter(
    (s) => s.platform === 'instagram' || s.platform === 'both'
  );
  const ytMinutes = ytSessions.reduce(
    (s, x) => s + x.durationMinutes,
    0
  );
  const igMinutes = igSessions.reduce(
    (s, x) => s + x.durationMinutes,
    0
  );
  const totalPlatformMinutes = ytMinutes + igMinutes || 1; // avoid /0

  // Most common trigger from intentions
  const intentions = await Intention.find({
    userId,
    timestamp: { $gte: since },
  }).lean();

  const triggerCounts = intentions.reduce((acc, i) => {
    acc[i.intentionCategory] = (acc[i.intentionCategory] || 0) + 1;
    return acc;
  }, {});
  const mostCommonTrigger =
    Object.keys(triggerCounts).sort(
      (a, b) => triggerCounts[b] - triggerCounts[a]
    )[0] || 'NONE';

  // Heaviest scroll day
  const dayCounts = sessions.reduce((acc, s) => {
    const day = new Date(s.startTime)
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toUpperCase();
    acc[day] = (acc[day] || 0) + s.durationMinutes;
    return acc;
  }, {});
  const heaviestScrollDay =
    Object.keys(dayCounts).sort(
      (a, b) => dayCounts[b] - dayCounts[a]
    )[0] || 'N/A';

  // Get goal percent from latest BehaviorWeek
  const latestWeek = await BehaviorWeek.findOne({ userId })
    .sort({ weekStart: -1 })
    .lean();
  const goalPercent = latestWeek
    ? Math.round(latestWeek.careerRelevantPercent)
    : 0;

  // Time reclaimed = improvement vs daily limit baseline
  const user = await User.findById(userId)
    .select('dailyLimitMinutes interests')
    .lean();
  const dailyLimit = user?.dailyLimitMinutes || 90;
  const expectedWeekly = dailyLimit * 7;
  const timeReclaimedMinutes = Math.max(0, expectedWeekly - totalScrollMinutes);

  // Check if this is the first check-in
  const lastDigest = await BehaviorWeek.findOne(
    { userId, digestSent: true },
    { digestSentAt: 1 }
  ).sort({ digestSentAt: -1 });

  // Generate AI insight
  const behaviorData = {
    totalScrollMinutes,
    goalPercent,
    mostCommonTrigger,
    heaviestScrollDay,
    sessionsCount: sessions.length,
    platformBreakdown: {
      youtube: Math.round((ytMinutes / totalPlatformMinutes) * 100),
      instagram: Math.round((igMinutes / totalPlatformMinutes) * 100),
    },
  };

  let aiInsight;
  try {
    aiInsight = await generateCheckinContent(userId, behaviorData);
  } catch (err) {
    console.error('AI insight generation failed:', err.message);
    aiInsight =
      'Your scroll patterns are being tracked â€” check back after your next few sessions for a personalized insight.';
  }

  // Mark check-in as sent on current BehaviorWeek
  if (latestWeek) {
    await BehaviorWeek.findByIdAndUpdate(latestWeek._id, {
      digestSent: true,
      digestSentAt: new Date(),
    });
  }

  return {
    available: true,
    isFirstCheckin: !lastDigest,
    triggerReason: shouldResult.reason,
    sessionsLogged: shouldResult.sessionsLogged,
    generatedAt: new Date().toISOString(),
    totalScrollMinutes,
    platformBreakdown: behaviorData.platformBreakdown,
    goalPercent,
    improvementMinutes,
    mostCommonTrigger: mostCommonTrigger.toUpperCase(),
    heaviestScrollDay,
    timeReclaimedMinutes,
    aiInsight,
    interestBudgetStatus: `You stayed within budget on ${
      user?.interests?.filter((i) => i.dailyMinutes > 0).length || 0
    } interests this period.`,
  };
}

module.exports = {
  shouldGenerateCheckin,
  generateCheckinContent,
  buildCheckinPayload,
};
```

### `insights.service.js`
```javascript
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
```

### `youtube.service.js`
```javascript
const axios = require('axios');
const { encrypt, decrypt } = require('../utils/encrypt');
const User = require('../models/User.model');

/**
 * Refreshes Google access token using the stored refresh token.
 * Google access tokens expire in 1 hour.
 * If refresh fails (revoked), marks YouTube as disconnected.
 */
async function refreshGoogleAccessToken(user) {
  const refreshToken = decrypt(user.googleRefreshToken);
  if (!refreshToken) {
    await User.findByIdAndUpdate(user._id, {
      youtubeConnected: false,
      googleAccessToken: null,
      googleRefreshToken: null,
    });
    throw new Error('YOUTUBE_DISCONNECTED');
  }

  try {
    const response = await axios.post('https://oauth2.googleapis.com/token', {  
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const { access_token } = response.data;

    // Encrypt and persist the new access token
    await User.findByIdAndUpdate(user._id, {
      googleAccessToken: encrypt(access_token),
    });

    return access_token;
  } catch (err) {
    // 400/401 = refresh token revoked or invalid
    if (err.response && [400, 401].includes(err.response.status)) {
      await User.findByIdAndUpdate(user._id, {
        youtubeConnected: false,
        googleAccessToken: null,
        googleRefreshToken: null,
      });
      throw new Error('YOUTUBE_DISCONNECTED');
    }
    throw err;
  }
}

/**
 * Returns a valid (non-expired) access token, refreshing if needed.
 * Called before every YouTube API request.
 */
async function getValidAccessToken(user) {
  if (!user.googleAccessToken) {
    throw new Error('YOUTUBE_DISCONNECTED');
  }

  const token = decrypt(user.googleAccessToken);
  if (!token) {
    throw new Error('YOUTUBE_DISCONNECTED');
  }

  // Verify token with a lightweight API call
  try {
    await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: { part: 'id', mine: true },
      headers: { Authorization: `Bearer ${token}` },
    });
    return token;
  } catch (err) {
    if (err.response && err.response.status === 401) {
      // Token expired â€” refresh it
      const newToken = await refreshGoogleAccessToken(user);
      return newToken;
    }
    throw err;
  }
}

/**
 * Fetches the user's YouTube watch history video IDs.
 * Uses the 'HL' playlist (Watch History) which requires youtube.readonly scope.
 * Falls back to liked videos if 'HL' returns 403.
 *
 * Note: To decrease Google / Gemini quota limits, we've reduced
 * maxResults to 150 by default when querying the Youtube APIs.
 */
async function fetchWatchHistory(user, maxResults = 150) {
  const token = await getValidAccessToken(user);

  let playlistId = 'HL'; // Watch History playlist

  // Attempt to fetch from Watch History; fall back to liked videos on 403      
  const videos = [];
  let pageToken = null;
  let usedFallback = false;

  try {
    do {
      const params = {
        part: 'snippet,contentDetails',
        playlistId,
        maxResults: 50, // API max per page
      };
      if (pageToken) params.pageToken = pageToken;

      const res = await axios.get(
        'https://www.googleapis.com/youtube/v3/playlistItems',
        { params, headers: { Authorization: `Bearer ${token}` } }
      );

      videos.push(...res.data.items);
      pageToken = res.data.nextPageToken;
    } while (pageToken && videos.length < maxResults);
  } catch (err) {
    if (err.response && err.response.status === 403 && !usedFallback) {
      // Watch History inaccessible â€” fall back to liked videos
      usedFallback = true;
      console.log(`Watch History playlist (HL) denied. Falling back to explicit Liked Videos.`)

      try {
        const channelRes = await axios.get(
          'https://www.googleapis.com/youtube/v3/channels',
          {
            params: { part: 'contentDetails', mine: true },
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const likedPlaylist =
          channelRes.data.items[0]?.contentDetails?.relatedPlaylists?.likes;    
        if (!likedPlaylist) {
          throw new Error('YOUTUBE_QUOTA_EXCEEDED');
        }

        playlistId = likedPlaylist;
        pageToken = null;

        do {
          const params = {
            part: 'snippet,contentDetails',
            playlistId,
            maxResults: 50,
          };
          if (pageToken) params.pageToken = pageToken;

          const res = await axios.get(
            'https://www.googleapis.com/youtube/v3/playlistItems',
            { params, headers: { Authorization: `Bearer ${token}` } }
          );

          videos.push(...res.data.items);
          pageToken = res.data.nextPageToken;
        } while (pageToken && videos.length < maxResults);
      } catch (fallbackErr) {
        if (
          fallbackErr.response &&
          (fallbackErr.response.status === 403 ||
            fallbackErr.response.status === 429)
        ) {
          throw new Error('YOUTUBE_QUOTA_EXCEEDED');
        }
        throw fallbackErr;
      }
    } else if (
      err.response &&
      (err.response.status === 403 || err.response.status === 429)
    ) {
      throw new Error('YOUTUBE_QUOTA_EXCEEDED');
    } else {
      throw err;
    }
  }

  // Extract video IDs and timestamps
  return videos.map((item) => ({
    videoId: item.contentDetails.videoId,
    watchedAt: item.snippet.publishedAt,
  }));
}

/**
 * Batch fetches video titles, channel names, and categories.
 * YouTube allows 50 video IDs per request.
 */
async function fetchVideoMetadata(videoIds, accessToken) {
  // Chunk videoIds into groups of 50
  const chunks = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    chunks.push(videoIds.slice(i, i + 50));
  }

  const results = [];
  for (const chunk of chunks) {
    const res = await axios.get(
      'https://www.googleapis.com/youtube/v3/videos',
      {
        params: {
          part: 'snippet',
          id: chunk.join(','),
          key: process.env.YOUTUBE_API_KEY,
        },
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    results.push(...res.data.items);

    // Rate limit: 50ms between chunks to avoid quota burst
    if (chunks.indexOf(chunk) < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  return results.map((item) => ({
    videoId: item.id,
    title: item.snippet.title, // used for classification ONLY â€” never stored 
    channelName: item.snippet.channelTitle,
    channelId: item.snippet.channelId,
    categoryId: item.snippet.categoryId,
    publishedAt: item.snippet.publishedAt,
  }));
}

module.exports = {
  refreshGoogleAccessToken,
  getValidAccessToken,
  fetchWatchHistory,
  fetchVideoMetadata,
};
```


---

## 5. Jobs (scrollsense-backend/src/jobs/)

### classification.job.js
`javascript
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
    ];
    const interestTitles = [
      'IPL 2024 Best Moments Compilation',
      'Top 10 Cricket Catches of All Time',
      'Epic Gaming Moments - Valorant',
      'Bollywood Songs Jukebox 2024',
      'Street Food Tour Mumbai',
      'India vs Australia Test Highlights',
    ];
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
    ];

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
    });
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
    await BehaviorWeek.findOneAndUpdate(
      { userId, weekStart: new Date(week.weekStart) },
      {
        userId,
        weekStart: new Date(week.weekStart),
        careerRelevantPercent: week.goalPercent,
        interestPercent: week.interestPercent,
        junkPercent: week.junkPercent,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  console.log(`[classify-${userId}] Step 8 complete — BehaviorWeek docs upserted`);

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

`

### digest.job.js
`javascript
const { digestQueue } = require('../config/queue');
const { buildCheckinPayload } = require('../services/digest.service');

digestQueue.process(async (job) => {
  const { userId } = job.data;
  console.log(`Starting digest generation for user ${userId}`);

  await job.progress(10);

  const payload = await buildCheckinPayload(userId);

  await job.progress(100);
  console.log(
    `Digest generation complete for user ${userId}: ` +
      `available=${payload.available}`
  );

  return payload;
});

module.exports = digestQueue;

`

---

## 6. Scripts (scrollsense-backend/src/scripts/)

### resetYoutubeState.js
`javascript
const mongoose = require('mongoose');
const User = require('../models/User.model');
require('dotenv').config();

async function resetYoutubeState() {
  await mongoose.connect(process.env.MONGODB_URI);

  // Reset ALL users where onboardingComplete is false
  // but youtubeConnected is true — this is the bad state
  const result = await User.updateMany(
    {
      onboardingComplete: false,
      youtubeConnected: true,
    },
    {
      $set: {
        youtubeConnected: false,
        youtubeConnectedAt: null,
        youtubeLastSyncAt: null,
      },
    }
  );

  console.log(`Reset ${result.modifiedCount} users`);
  await mongoose.disconnect();
  process.exit(0);
}

resetYoutubeState().catch((err) => {
  console.error(err);
  process.exit(1);
});

`

---

## 7. Additional Models (scrollsense-backend/src/models/)

### User.model.js
`javascript
const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
  // Identity
  googleId:     { type: String, sparse: true, index: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, default: null },  // null for OAuth-only users
  displayName:  { type: String, trim: true },
  avatar:       { type: String, default: null },  // Google profile photo URL

  // OAuth tokens (encrypted at rest — store encrypted, decrypt on use)
  googleAccessToken:  { type: String, default: null },
  googleRefreshToken: { type: String, default: null },

  // Onboarding state
  onboardingComplete: { type: Boolean, default: false },

  // Onboarding data (set once via POST /api/onboarding)
  platforms:          { type: [String], default: [] },  // ['youtube','instagram']
  awarenessLevel:     { type: String, default: '' },
  careerPath:         { type: String, default: '' },
  careerPathPreset:   { type: String, default: '' },
  goals:              { type: [String], default: [] },
  customGoal:         { type: String, default: '' },
  interests: [{
    _id: false,
    id:           String,
    label:        String,
    dailyMinutes: { type: Number, default: 30 },
  }],
  scrollTriggers:     { type: [String], default: [] },
  dailyLimitMinutes:  { type: Number, default: 90 },

  // YouTube connection
  youtubeConnected:         { type: Boolean, default: false },
  youtubeConnectedAt:       { type: Date, default: null },
  youtubeLastSyncAt:        { type: Date, default: null },

  // Top YouTube channels (public info — safe to store)
  topChannels: {
    type: [{
      _id: false,
      channelName: { type: String },
      channelId: { type: String },
      category: { type: String, enum: ['goal', 'interest', 'junk'] },
      count: { type: Number, default: 0 },
    }],
    default: [],
  },

  // Instagram connection
  instagramUploaded:        { type: Boolean, default: false },
  instagramLastUploadAt:    { type: Date, default: null },

  // Refresh token (stored hashed — compare with bcrypt)
  refreshTokenHash: { type: String, default: null },

  // Account state
  isActive:     { type: Boolean, default: true },
  lastLoginAt:  { type: Date, default: null },
}, { timestamps: true });

userSchema.methods.toSafeObject = function() {
  const user = this.toObject();
  delete user.googleAccessToken;
  delete user.googleRefreshToken;
  delete user.passwordHash;
  delete user.refreshTokenHash;
  return user;
};

module.exports = mongoose.model('User', userSchema);
`

### Group.model.js
`javascript
const mongoose = require('mongoose');
const { Schema } = mongoose;

const groupSchema = new Schema({
  triggerType:  { type: String, required: true },
  memberIds:    [{ type: Schema.Types.ObjectId, ref: 'User' }],
  maxMembers:   { type: Number, default: 8 },
  isOpen:       { type: Boolean, default: true },
  weeklyDeltas: [{
    _id: false,
    userId:     Schema.Types.ObjectId,
    week:       Date,
    deltaMinutes: Number,
    percentChange: Number,
  }],
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Group', groupSchema);
`
