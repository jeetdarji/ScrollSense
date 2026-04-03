const User = require('../models/User.model');
const Session = require('../models/Session.model');
const Intention = require('../models/Intention.model');
const BehaviorWeek = require('../models/BehaviorWeek.model');
const Group = require('../models/Group.model');
const Craving = require('../models/Craving.model');
const asyncHandler = require('../utils/asyncHandler');

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

exports.deleteAccount = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  await Promise.all([
    User.findByIdAndDelete(userId),
    Session.deleteMany({ userId }),
    Intention.deleteMany({ userId }),
    BehaviorWeek.deleteMany({ userId }),
    Craving.deleteMany({ userId }),
    Group.updateMany(
      { memberIds: userId },
      { $pull: { memberIds: userId, weeklyDeltas: { userId } } }
    )
  ]);

  res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
  
  console.log(`User deleted account event: ${userId} at ${new Date().toISOString()}`);

  res.json({ message: 'Account permanently deleted' });
});