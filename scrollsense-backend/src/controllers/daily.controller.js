const asyncHandler = require('../utils/asyncHandler');
const BehaviorDay = require('../models/BehaviorDay.model');

const getWeekData = async (req, res) => {
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - 7);
  startOfWeek.setUTCHours(0, 0, 0, 0);

  const days = await BehaviorDay.find({
    userId: req.user._id,
    date: { $gte: startOfWeek }
  }).sort({ date: 1 }).lean();

  const weekData = days.map(d => ({
    date: d.date.toISOString().split('T')[0],
    youtubeMinutes: d.youtubeMinutes,
    instagramMinutes: d.instagramMinutes,
    totalMinutes: d.youtubeMinutes + d.instagramMinutes,
  }));

  res.status(200).json({ weekData });
};

module.exports = {
  getWeekData: asyncHandler(getWeekData),
};