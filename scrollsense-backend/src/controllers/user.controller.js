const User = require('../models/User.model');
const Session = require('../models/Session.model');
const Intention = require('../models/Intention.model');
const BehaviorWeek = require('../models/BehaviorWeek.model');
const BehaviorDay = require('../models/BehaviorDay.model');
const Group = require('../models/Group.model');
const GroupMembership = require('../models/GroupMembership.model');
const GroupSubmission = require('../models/GroupSubmission.model');
const Craving = require('../models/Craving.model');
const asyncHandler = require('../utils/asyncHandler');
const { VALID_GOALS } = require('../utils/validate');

exports.getMe = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toSafeObject() });
});

exports.updateInterests = asyncHandler(async (req, res) => {
  const { interests } = req.body;

  if (!Array.isArray(interests) || interests.length === 0) {
    return res.status(400).json({ error: 'Validation failed', details: ['Interests must be an array with at least 1 item'] });
  }

  for (const i of interests) {
    if (!i.id || !i.label || typeof i.dailyMinutes !== 'number') {
      return res.status(400).json({ error: 'Validation failed', details: ['Invalid interest format'] });
    }
    if (i.dailyMinutes < 5 || i.dailyMinutes > 120) {
      return res.status(400).json({ error: 'Validation failed', details: ['dailyMinutes must be 5-120'] });
    }
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id, 
    { interests }, 
    { new: true, runValidators: true }
  );

  res.json({ user: updatedUser.toSafeObject() });
});

exports.getSettings = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toSafeObject() });
});

exports.updateSettings = asyncHandler(async (req, res) => {
  const { dailyLimitMinutes, goals, interests, careerPath, careerPathPreset } = req.body;
  const errors = [];

  if (dailyLimitMinutes !== undefined && (typeof dailyLimitMinutes !== 'number' || dailyLimitMinutes < 15 || dailyLimitMinutes > 300)) {
    errors.push('dailyLimitMinutes must be a number between 15 and 300');
  }

  if (goals !== undefined) {
    if (!Array.isArray(goals)) {
      errors.push('goals must be an array');
    } else {
      for (const g of goals) {
        if (!VALID_GOALS.includes(g)) {
          errors.push(`Invalid goal ID: ${g}`);
        }
      }
    }
  }

  if (interests !== undefined) {
    if (!Array.isArray(interests)) {
      errors.push('interests must be an array');
    } else {
      for (const i of interests) {
        if (!i.id || !i.label || typeof i.dailyMinutes !== 'number' || i.dailyMinutes < 5 || i.dailyMinutes > 120) {
          errors.push('Invalid interest format or dailyMinutes out of bounds (5-120)');
          break;
        }
      }
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  const updateData = {};
  if (dailyLimitMinutes !== undefined) updateData.dailyLimitMinutes = dailyLimitMinutes;
  if (goals !== undefined) updateData.goals = goals;
  if (interests !== undefined) updateData.interests = interests;
  if (careerPath !== undefined || careerPathPreset !== undefined) {
    updateData.careerPath = careerPath || '';
    updateData.careerPathPreset = careerPathPreset || '';
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    updateData,
    { new: true, runValidators: true }
  );

  res.json({ user: updatedUser.toSafeObject() });
});

exports.updateNotifications = asyncHandler(async (req, res) => {
  const prefs = req.body;
  const currentPrefs = req.user.notificationPreferences || {};
  
  const updatedPrefs = {
    weeklyDigest: typeof prefs.weeklyDigest === 'boolean' ? prefs.weeklyDigest : currentPrefs.weeklyDigest,
    emailDigest: typeof prefs.emailDigest === 'boolean' ? prefs.emailDigest : currentPrefs.emailDigest,
    emailAddress: typeof prefs.emailAddress === 'string' ? prefs.emailAddress : currentPrefs.emailAddress,
    dailyLimitAlerts: typeof prefs.dailyLimitAlerts === 'boolean' ? prefs.dailyLimitAlerts : currentPrefs.dailyLimitAlerts,
    instagramReminder: typeof prefs.instagramReminder === 'boolean' ? prefs.instagramReminder : currentPrefs.instagramReminder,
    instagramFrequency: ['monthly', '3months', '6months'].includes(prefs.instagramFrequency) ? prefs.instagramFrequency : currentPrefs.instagramFrequency,
    goalNudges: typeof prefs.goalNudges === 'boolean' ? prefs.goalNudges : currentPrefs.goalNudges
  };

  // Set defaults for newly added fields that might be undefined
  if (updatedPrefs.weeklyDigest === undefined) updatedPrefs.weeklyDigest = true;
  if (updatedPrefs.emailDigest === undefined) updatedPrefs.emailDigest = false;
  if (updatedPrefs.dailyLimitAlerts === undefined) updatedPrefs.dailyLimitAlerts = true;
  if (updatedPrefs.instagramReminder === undefined) updatedPrefs.instagramReminder = true;
  if (updatedPrefs.instagramFrequency === undefined) updatedPrefs.instagramFrequency = 'monthly';
  if (updatedPrefs.goalNudges === undefined) updatedPrefs.goalNudges = true;
  if (updatedPrefs.emailAddress === undefined) updatedPrefs.emailAddress = '';

  if (updatedPrefs.emailDigest && updatedPrefs.emailAddress) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(updatedPrefs.emailAddress)) {
      return res.status(400).json({ error: 'Invalid email address format' });
    }
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { notificationPreferences: updatedPrefs },
    { new: true, runValidators: true }
  );

  res.json({ message: 'Notification preferences saved', notificationPreferences: updatedUser.toSafeObject().notificationPreferences });
});

exports.getDataVault = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [
    sessionCount,
    intentionCount,
    cravingCount,
    latestWeek,
    groupMembership
  ] = await Promise.all([
    Session.countDocuments({ userId }),
    Intention.countDocuments({ userId }),
    Craving.countDocuments({ userId }),
    BehaviorWeek.findOne({ userId }).sort({ weekStartDate: -1 }).select('peakScrollHour dominantCategory'),
    GroupMembership.findOne({ userId, isActive: true }).select('anonymousName')
  ]);

  const totalSessions = await Session.aggregate([
    { $match: { userId } },
    { $group: { _id: null, totalMinutes: { $sum: "$durationMinutes" }, avgMood: { $avg: "$moodRating" } } }
  ]);

  const stats = totalSessions[0] || { totalMinutes: 0, avgMood: 0 };
  const avgSession = sessionCount > 0 ? Math.round(stats.totalMinutes / sessionCount) : 0;
  const avgMood = stats.avgMood ? Number(stats.avgMood.toFixed(1)) : 0;
  
  // Format peak hour
  let peakHourStr = 'Not enough data';
  if (latestWeek && latestWeek.peakScrollHour !== undefined && latestWeek.peakScrollHour !== null) {
    const ph = latestWeek.peakScrollHour;
    peakHourStr = ph < 12 ? `${ph === 0 ? 12 : ph} AM` : `${ph === 12 ? 12 : ph - 12} PM`;
  }

  res.json({
    account: {
      joinedAt: req.user.createdAt,
      dailyLimitMinutes: req.user.dailyLimitMinutes,
      careerPath: req.user.careerPath || 'Not set',
      goalsCount: req.user.goals.length,
      interestsCount: req.user.interests.length,
      email: req.user.email
    },
    behavior: {
      sessionsLogged: sessionCount,
      intentionsLogged: intentionCount,
      cravingsReflected: cravingCount,
      averageSessionMinutes: avgSession,
      averageMoodRating: avgMood,
      youtubeConnected: req.user.youtubeConnected,
      instagramUploaded: req.user.instagramUploaded
    },
    patterns: {
      peakHour: peakHourStr,
      mostCommonPlatform: latestWeek?.dominantCategory === 'youtube' ? 'YouTube' : latestWeek?.dominantCategory === 'instagram' ? 'Instagram' : 'Not enough data',
    },
    community: {
      isInGroup: !!groupMembership,
      anonymousName: groupMembership ? groupMembership.anonymousName : null
    },
    instagram: req.user.instagramUploaded ? {
      uploaded: true,
      uploadedAt: req.user.instagramLastUploadAt,
      topicsCount: req.user.instagramTopics.length
    } : null,
    notStored: [
      'Video titles or reel content',
      'Specific URLs of videos watched',
      'Instagram DMs or messages',
      'Your real name or profile photo',
      'Gmail, Drive, or Google Photos',
      'Location data',
      'Device information',
      'Financial data',
      'Health data'
    ]
  });
});

exports.deleteInstagramData = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Clear Instagram fields
  await User.findByIdAndUpdate(userId, {
    instagramUploaded: false,
    instagramLastUploadAt: null,
    instagramTopics: []
  });

  // Zero-out instagram data on BehaviorDay
  const result = await BehaviorDay.updateMany(
    { userId },
    {
      $set: {
        instagramMinutes: 0,
        instagramInterestMinutes: {},
        instagramDataProcessed: false
      }
    }
  );

  // Recalculate BehaviorDay totalScrollMinutes (to be just youtubeMinutes)
  await BehaviorDay.updateMany(
    { userId },
    [{ $set: { totalScrollMinutes: "$youtubeMinutes" } }]
  );

  res.json({ message: 'Instagram data deleted', affectedDays: result.modifiedCount });
});

exports.deleteAccount = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Important: Explicitly log deletion sequence per instructions
  console.log(`Executing strict permanent account deletion for user ${userId}...`);

  try {
    await Promise.all([
      User.findByIdAndDelete(userId),
      Session.deleteMany({ userId }),
      Intention.deleteMany({ userId }),
      BehaviorWeek.deleteMany({ userId }),
      BehaviorDay.deleteMany({ userId }),
      Craving.deleteMany({ userId }),
      GroupMembership.updateMany(
        { userId },
        { $set: { isActive: false, leftAt: new Date() } }
      ),
      GroupSubmission.updateMany(
        { userId },
        { $set: { deletedAt: new Date() } }
      ),
      Group.updateMany(
        { memberIds: userId },
        { $pull: { memberIds: userId, weeklyDeltas: { userId } } }
      )
    ]);
  } catch (error) {
    console.error(`CRITICAL DELETION FAILURE for user ${userId}:`, error);
    return res.status(500).json({ error: 'Deletion failed. Please contact support.' });
  }

  res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
  console.log(`User deleted account event: ${userId} at ${new Date().toISOString()}`);

  res.json({ message: 'Account permanently deleted' });
});