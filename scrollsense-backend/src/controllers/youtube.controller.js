const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User.model');
const BehaviorWeek = require('../models/BehaviorWeek.model');
const VideoWatchTime = require('../models/VideoWatchTime.model');
const { classificationQueue } = require('../config/queue');
const { getValidAccessToken } = require('../services/youtube.service');

// Import the worker to register the processor
require('../jobs/classification.job');

/**
 * POST /api/youtube/connect
 * Marks YouTube as connected and queues the classification job.
 * Called by frontend immediately after onboarding completes.
 */
const connectYouTube = async (req, res) => {
  if (!req.user.onboardingComplete) {
    return res.status(400).json({
      error: 'Complete onboarding first',
      code: 'ONBOARDING_INCOMPLETE',
      message: 'Set up your profile before connecting YouTube — ' +
                'your goals and interests are needed for classification.'
    });
  }

  if (!req.user.googleAccessToken) {
    return res.status(400).json({
      error: 'No Google account connected',
      code: 'NO_GOOGLE_ACCOUNT',
      message: 'Sign in with Google to connect YouTube.',
    });
  }

  // Verify YouTube access works
  try {
    await getValidAccessToken(req.user);
  } catch (err) {
    if (err.message === 'YOUTUBE_DISCONNECTED' || (err.response && err.response.status === 403)) {
      return res.status(403).json({
        error: 'YouTube access revoked or missing permissions',
        code: 'YOUTUBE_DISCONNECTED',
        message: 'Please sign in with Google again to grant YouTube permissions.',
      });
    }
    throw err;
  }

  // Update user
  await User.findByIdAndUpdate(req.user._id, {
    youtubeConnected: true,
    youtubeConnectedAt: new Date(),
  });

  // Queue classification job — jobId prevents duplicate jobs for same user
  const jobId = `classify-${req.user._id}`;

  // Remove any existing completed/failed job before queuing
  const existingJob = await classificationQueue.getJob(jobId);
  if (existingJob) {
    const state = await existingJob.getState();
    if (['active', 'waiting'].includes(state)) {
      return res.status(200).json({
        message: 'YouTube connected. Classification already in progress.',
        jobId: existingJob.id,
        isClassifying: true,
      });
    }
    await existingJob.remove();
  }

  const job = await classificationQueue.add(
    { userId: req.user._id.toString() },
    { jobId }
  );

  return res.status(200).json({
    message: 'YouTube connected. Classification starting.',
    jobId: job.id,
    isClassifying: true,
  });
};

/**
 * GET /api/youtube/status
 * Returns connection state + classification progress + data freshness.
 * Powers isConnected, isClassifying, and data staleness indicators in the frontend.
 */
const getYouTubeStatus = async (req, res) => {
  const jobId = `classify-${req.user._id}`;
  const job = await classificationQueue.getJob(jobId);

  let isClassifying = false;
  let classificationProgress = 0;

  if (job) {
    const state = await job.getState();
    isClassifying = ['active', 'waiting', 'delayed'].includes(state);
    classificationProgress = job.progress() || 0;
  }

  // Get BehaviorWeek summary for data count fields
  const weeksOfData = await BehaviorWeek.countDocuments({ userId: req.user._id });
  const latestWeek = weeksOfData > 0
    ? await BehaviorWeek.findOne({ userId: req.user._id })
        .sort({ weekStart: -1 })
        .select('youtubeVideosClassified')
        .lean()
    : null;

  const totalVideosClassified = latestWeek?.youtubeVideosClassified || 0;
  const hasClassificationData = weeksOfData > 0;

  // Calculate data freshness
  const lastSyncAt = req.user.youtubeLastSyncAt;
  let dataFreshness = 'never_synced';
  let syncNeeded = false;
  if (lastSyncAt && req.user.youtubeConnected) {
    const hoursSinceSync = (Date.now() - new Date(lastSyncAt).getTime()) / (1000 * 60 * 60);
    dataFreshness = hoursSinceSync > 24 ? 'stale' : 'fresh';
    // Signal the frontend to auto-trigger a background sync when data is >8h old
    syncNeeded = hoursSinceSync > 8 && !isClassifying;
  } else if (lastSyncAt && !req.user.youtubeConnected) {
    dataFreshness = 'disconnected';
  }

  return res.status(200).json({
    isConnected: req.user.youtubeConnected,
    isClassifying,
    classificationProgress,
    lastSyncAt,
    connectedAt: req.user.youtubeConnectedAt,
    hasClassificationData,
    totalVideosClassified,
    weeksOfData,
    dataFreshness,
    syncNeeded,
  });
};

/**
 * POST /api/youtube/sync
 * Manual re-sync — re-queues the classification job.
 * Called from Settings page "Refresh Data" button.
 */
const syncYouTube = async (req, res) => {
  if (!req.user.youtubeConnected) {
    return res.status(400).json({ error: 'YouTube not connected' });
  }

  const jobId = `classify-${req.user._id}`;
  const existingJob = await classificationQueue.getJob(jobId);

  if (existingJob) {
    const state = await existingJob.getState();
    if (['active', 'waiting'].includes(state)) {
      return res.status(409).json({
        error: 'Classification already in progress',
        code: 'JOB_RUNNING',
      });
    }
    // Remove completed/failed job before re-queuing
    await existingJob.remove();
  }

  const job = await classificationQueue.add(
    { userId: req.user._id.toString() },
    { jobId }
  );

  return res.status(200).json({
    message: 'YouTube re-sync started. Classification starting.',
    jobId: job.id,
    isClassifying: true,
  });
};

/**
 * DELETE /api/youtube/disconnect
 * Clears tokens, marks disconnected. Historical BehaviorWeek data kept.
 */
const disconnectYouTube = async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    youtubeConnected: false,
    googleAccessToken: null,
    googleRefreshToken: null,
    youtubeConnectedAt: null,
  });

  return res.status(200).json({ message: 'YouTube disconnected' });
};

/**
 * POST /api/youtube/watch-time
 * Receives actual watch-time reports from the ScrollSense browser extension.
 * Each report: { videoId, watchedSeconds, date }
 * Stored in VideoWatchTime — used by the classification job to compute
 * real minute totals instead of estimating from video duration.
 *
 * This endpoint allows requests from Chrome/Firefox extension origins in
 * addition to the standard frontend origin — see app.js CORS config.
 */
const reportWatchTime = async (req, res) => {
  const { reports } = req.body;
  console.log('[API] /api/youtube/watch-time HIT! Payload size:', Array.isArray(reports) ? reports.length : 'invalid', 'User:', req.user._id);

  if (!Array.isArray(reports) || reports.length === 0) {
    return res.status(400).json({ error: 'reports array required' });
  }

  const MAX_REPORTS = 200; // sanity cap per request
  const today = new Date().toISOString().split('T')[0];

  // Validate and sanitize every report before touching the database
  const validReports = reports.slice(0, MAX_REPORTS).filter((r) => {
    if (!r.videoId || typeof r.videoId !== 'string') return false;
    if (r.videoId.length > 20) return false; // YouTube IDs are 11 chars
    if (typeof r.watchedSeconds !== 'number') return false;
    if (r.watchedSeconds <= 0 || r.watchedSeconds > 7200) return false; // 0–2h range
    if (!r.date || !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) return false;
    if (r.date > today) return false; // reject future dates
    return true;
  });

  if (validReports.length === 0) {
    return res.status(400).json({ error: 'No valid reports in payload' });
  }

  // Accumulate watched seconds per (userId, videoId, date) using an aggregation
  // pipeline update so we can atomically $add and cap at 7200 in a single operation.
  // Plain { $inc: { watchedSeconds: X }, $min: { watchedSeconds: 7200 } } would
  // cause a MongoDB path conflict error — two operators cannot target the same field.
  const bulkOps = validReports.map((r) => ({
    updateOne: {
      filter: { userId: req.user._id, videoId: r.videoId, date: r.date },
      // Pipeline update: add watchedSeconds, cap at 7200.
      // $ifNull handles the upsert case where the field doesn't exist yet.
      update: [
        {
          $set: {
            watchedSeconds: {
              $min: [
                7200,
                { $add: [{ $ifNull: ['$watchedSeconds', 0] }, Math.round(r.watchedSeconds)] },
              ],
            },
          },
        },
      ],
      upsert: true,
    },
  }));

  await VideoWatchTime.bulkWrite(bulkOps, { ordered: false });

  return res.status(200).json({ saved: validReports.length });
};

module.exports = {
  connectYouTube: asyncHandler(connectYouTube),
  getYouTubeStatus: asyncHandler(getYouTubeStatus),
  syncYouTube: asyncHandler(syncYouTube),
  disconnectYouTube: asyncHandler(disconnectYouTube),
  reportWatchTime: asyncHandler(reportWatchTime),
};
