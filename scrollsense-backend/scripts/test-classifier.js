require('dotenv').config();
const mongoose = require('mongoose');
const ClassifiedVideo = require('../src/models/ClassifiedVideo.model');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const currentWeekStartsInMilli = new Date('2026-04-13').getTime();
  const vids = await ClassifiedVideo.find({ updatedAt: { $gte: new Date(currentWeekStartsInMilli) } });
  
  vids.forEach(v => {
    console.log(`Video: ${v.videoId} | Cat: ${v.category} | Interest: ${v.matchedInterest || 'none'}`);
  });
  process.exit(0);
});
