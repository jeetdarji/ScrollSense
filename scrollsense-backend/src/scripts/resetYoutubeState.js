const mongoose = require('mongoose');
const User = require('../models/User.model');
require('dotenv').config();

async function resetYoutubeState() {
  await mongoose.connect(process.env.MONGODB_URI);

  // Reset ALL users where onboardingComplete is false
  // but youtubeConnected is true — this is the bad state
  const result = await User.updateMany(
    {
      onboardingComplete: false,
      youtubeConnected: true,
    },
    {
      $set: {
        youtubeConnected: false,
        youtubeConnectedAt: null,
        youtubeLastSyncAt: null,
      },
    }
  );

  console.log(`Reset ${result.modifiedCount} users`);
  await mongoose.disconnect();
  process.exit(0);
}

resetYoutubeState().catch((err) => {
  console.error(err);
  process.exit(1);
});
