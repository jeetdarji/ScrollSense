require('dotenv').config();
const mongoose = require('mongoose');
const VideoWatchTime = require('../src/models/VideoWatchTime.model');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const today = new Date().toISOString().split('T')[0];
  await VideoWatchTime.findOneAndUpdate(
    { userId: '69c79ce11d252141c45ac650', videoId: 'TEST_VIDEO_1', date: today },
    { $inc: { watchedSeconds: 3600 } }, // 60 mins
    { upsert: true }
  );
  console.log('Injected 60 minutes for today!');
  process.exit(0);
});
