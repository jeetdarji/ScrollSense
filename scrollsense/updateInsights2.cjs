const fs = require('fs'); 
let content = fs.readFileSync('C:/Users/JEET DARJI/Desktop/ScrollSense/scrollsense-backend/src/controllers/insights.controller.js', 'utf8');

const getDashboardInterestsLogic = `
  // Get today's BehaviorDay for real interest consumption
  const BehaviorDay = require('../models/BehaviorDay.model')
  const today = new Date().toISOString().split('T')[0]
  const todayBehaviorDay = await BehaviorDay.findOne({
    userId: req.user._id,
    date: today,
  }).lean()

  // Get current week's interest data from BehaviorWeek
  const interestBreakdown = currentWeekDoc?.interestBreakdown 
    ? Object.fromEntries(currentWeekDoc.interestBreakdown) 
    : {}
  const dailyInterestMinutes = currentWeekDoc?.dailyInterestMinutes
    ? Object.fromEntries(currentWeekDoc.dailyInterestMinutes)
    : {}

  // Get today's YouTube interest minutes from BehaviorDay
  const todayYoutubeInterest = todayBehaviorDay?.youtubeInterestMinutes
    ? Object.fromEntries(todayBehaviorDay.youtubeInterestMinutes)
    : {}

  const interests = (req.user.interests || []).map((interest) => {
    const interestKey = interest.label.toLowerCase()
    
    // Today's consumed = YouTube auto-data 
    const todayYoutube = todayYoutubeInterest[interestKey] || 0
    const consumed = todayYoutube

    // Weekly average from classification data
    const weeklyAvg = dailyInterestMinutes[interestKey] || 0

    const budget = interest.dailyMinutes

    let status = 'on_track'
    if (consumed >= budget) status = 'over'
    else if (consumed >= budget * 0.8) status = 'near_limit'

    return {
      id: interest.id,
      label: interest.label,
      dailyBudgetMinutes: budget,
      consumedMinutes: consumed,
      weeklyAvgMinutes: weeklyAvg,
      status,
      // Extra data for debugging
      source: todayYoutube > 0 ? 'youtube_auto' : 'no_data',
    }
  })
`

const getInterestBudgetsLogic = `const getInterestBudgets = async (req, res) => {
  const BehaviorWeek = require('../models/BehaviorWeek.model');
  const BehaviorDay = require('../models/BehaviorDay.model');
  
  const currentWeekDoc = await BehaviorWeek.findOne({ userId: req.user._id })
    .sort({ weekStart: -1 })
    .lean();
` + getDashboardInterestsLogic + `
  // Reset at midnight
  const midnight = new Date();
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 0, 0, 0);

  return res.status(200).json({
    interests,
    resetAt: midnight.toISOString(),
    dataSource: 'youtube_classification',
  });
};
`

content = content.replace(/\/\/ 5\. Get today's tracking[\s\S]*?(?=\/\/ 7\. Get top channels)/, "// 5. Get today's tracking\n" + getDashboardInterestsLogic + "\n\n");
content = content.replace(/const getInterestBudgets = async \(req, res\) => {[\s\S]*?(?=module\.exports = {)/, getInterestBudgetsLogic + "\n\n");

fs.writeFileSync('C:/Users/JEET DARJI/Desktop/ScrollSense/scrollsense-backend/src/controllers/insights.controller.js', content)
