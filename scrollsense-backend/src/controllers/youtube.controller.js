const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User.model');
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
    if (err.message === 'YOUTUBE_DISCONNECTED') {
      return res.status(401).json({
        error: 'YouTube access revoked',
        code: 'YOUTUBE_DISCONNECTED',
        message: 'Please sign in with Google again to reconnect YouTube.',
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
 * Returns connection state + classification progress.
 * Powers isConnected and isClassifying flags in useYouTubeData.
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

  return res.status(200).json({
    isConnected: req.user.youtubeConnected,
    isClassifying,
    classificationProgress,
    lastSyncAt: req.user.youtubeLastSyncAt,
    connectedAt: req.user.youtubeConnectedAt,
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

module.exports = {
  connectYouTube: asyncHandler(connectYouTube),
  getYouTubeStatus: asyncHandler(getYouTubeStatus),
  syncYouTube: asyncHandler(syncYouTube),
  disconnectYouTube: asyncHandler(disconnectYouTube),
};
