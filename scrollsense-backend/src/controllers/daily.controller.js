const asyncHandler = require('../utils/asyncHandler');
const BehaviorDay = require('../models/BehaviorDay.model');

const getWeekData = async (req, res) => {
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - 7);
  startOfWeek.setUTCHours(0, 0, 0, 0);
  const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

  const days = await BehaviorDay.find({
    userId: req.user._id,
    date: { $gte: startOfWeekStr }
  }).sort({ date: 1 }).lean();

  const weekData = days.map(d => ({
    date: d.date,
    youtubeMinutes: d.youtubeMinutes || 0,
    instagramMinutes: d.instagramMinutes || 0,
    totalMinutes: (d.youtubeMinutes || 0) + (d.instagramMinutes || 0),
  }));

  res.status(200).json({ weekData });
};

module.exports = {
  getWeekData: asyncHandler(getWeekData),
};