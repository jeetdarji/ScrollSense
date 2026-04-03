const User = require('../models/User.model');
const asyncHandler = require('../utils/asyncHandler');

exports.completeOnboarding = asyncHandler(async (req, res) => {
  if (req.user.onboardingComplete) {
    return res.status(409).json({ error: 'Onboarding already completed' });
  }

  const {
    platforms,
    awarenessLevel,
    careerPath,
    careerPathPreset,
    goals,
    customGoal,
    interests,
    scrollTriggers,
    dailyLimitMinutes
  } = req.body;

  // 1. Validation
  const errors = [];
  
  if (!Array.isArray(platforms) || platforms.length === 0) {
    errors.push('platforms array is required');
  } else if (!platforms.every(p => ['youtube', 'instagram', 'both'].includes(p))) {
    errors.push('Invalid platform values');
  }

  if (typeof awarenessLevel !== 'string' || !awarenessLevel) {
    errors.push('awarenessLevel is required');
  }

  if (!careerPath && !careerPathPreset) {
    errors.push('careerPath or careerPathPreset must be provided');
  }

  if (!Array.isArray(goals) || goals.length === 0) {
    errors.push('goals must contain at least 1 item');
  }

  if (!Array.isArray(interests) || interests.length === 0) {
    errors.push('interests must contain at least 1 item');
  } else {
    interests.forEach(i => {
      if (!i.id || !i.label || typeof i.dailyMinutes !== 'number' || i.dailyMinutes < 5 || i.dailyMinutes > 120) {
        errors.push('Invalid interest format or dailyMinutes out of range (5-120)');
      }
    });
  }

  if (!Array.isArray(scrollTriggers) || scrollTriggers.length === 0) {
    errors.push('scrollTriggers must contain at least 1 item');
  }

  if (typeof dailyLimitMinutes !== 'number' || dailyLimitMinutes < 15 || dailyLimitMinutes > 300) {
    errors.push('dailyLimitMinutes must be a number between 15 and 300');
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  // 2. Update user
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      platforms,
      awarenessLevel,
      careerPath: careerPath || '',
      careerPathPreset: careerPathPreset || '',
      goals,
      customGoal: customGoal || '',
      interests,
      scrollTriggers,
      dailyLimitMinutes,
      onboardingComplete: true
    },
    { new: true }
  );

  res.json({
    message: 'Onboarding complete',
    user: updatedUser.toSafeObject(),
    nextStep: 'connect_youtube',
    nextStepUrl: '/api/youtube/connect',
  });
});