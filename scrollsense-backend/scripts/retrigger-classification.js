/**
 * One-shot admin script: re-queues the YouTube classification job
 * for ALL connected users so they get fresh BehaviorDay/BehaviorWeek data.
 *
 * Also purges stale current-week BehaviorDay records before re-queuing so
 * old inflated values (e.g. 85h totals from pre-fix data) are wiped out
 * and the fresh classification job writes correct values to a clean slate.
 *
 * Usage: node scripts/retrigger-classification.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Bull = require('bull');
const IORedis = require('ioredis');

const MONGODB_URI = process.env.MONGODB_URI;
const REDIS_URL = process.env.REDIS_URL;

// ── Current ISO week start (Monday 00:00 UTC) ──────────────────────────────
function getCurrentWeekStartStr() {
  const now = new Date();
  const utcDay = now.getUTCDay(); // 0=Sun … 6=Sat
  const daysToMonday = utcDay === 0 ? 6 : utcDay - 1;
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() - daysToMonday);
  weekStart.setUTCHours(0, 0, 0, 0);
  return weekStart.toISOString().split('T')[0]; // "YYYY-MM-DD"
}

async function main() {
  // 1. Connect MongoDB
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('✅ MongoDB connected');

  // 2. Find all users with YouTube connected
  const User = require('../src/models/User.model');
  const BehaviorDay = require('../src/models/BehaviorDay.model');
  const BehaviorWeek = require('../src/models/BehaviorWeek.model');

  const users = await User.find({ youtubeConnected: true, onboardingComplete: true }).lean();
  console.log(`Found ${users.length} YouTube-connected user(s)`);

  if (users.length === 0) {
    console.log('No users to process. Exiting.');
    process.exit(0);
  }

  const thisWeekStartStr = getCurrentWeekStartStr();
  console.log(`\nCurrent ISO week starts: ${thisWeekStartStr}`);

  // 3. Purge stale current-week data for every user
  //    Deletes BehaviorDay records whose date >= thisWeekStartStr so the
  //    fresh classification job writes to a completely clean state.
  //    Also resets BehaviorWeek.totalScrollMinutes for the current week
  //    to 0 so it can't be served as a stale fallback while the job runs.
  console.log('\n🧹 Purging stale current-week data...');
  for (const user of users) {
    const userId = user._id;

    const { deletedCount } = await BehaviorDay.deleteMany({
      userId,
      date: { $gte: thisWeekStartStr },
    });

    const weekUpdateResult = await BehaviorWeek.updateOne(
      { userId, weekStart: new Date(thisWeekStartStr) },
      { $set: { totalScrollMinutes: 0 } }
    );

    console.log(
      `   ${user.email || userId}: deleted ${deletedCount} BehaviorDay doc(s)` +
      (weekUpdateResult.modifiedCount ? ', reset BehaviorWeek totalScrollMinutes → 0' : '')
    );
  }
  console.log('🧹 Purge complete.\n');

  // 4. Connect to Bull queue
  const isTLS = REDIS_URL && REDIS_URL.startsWith('rediss://');
  const redisConfig = isTLS
    ? {
        createClient: () =>
          new IORedis(REDIS_URL, {
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            tls: { rejectUnauthorized: false },
          }),
      }
    : { redis: REDIS_URL };

  const queue = new Bull('content-classification', {
    ...redisConfig,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 50,
      removeOnFail: 20,
    },
  });

  // 5. Queue classification for each user
  for (const user of users) {
    const userId = user._id.toString();
    const jobId = `classify-${userId}`;

    const existing = await queue.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      if (['active', 'waiting'].includes(state)) {
        console.log(`⏩ User ${userId} already has a ${state} job — skipping`);
        continue;
      }
      await existing.remove();
      console.log(`🗑  Removed stale ${state} job for user ${userId}`);
    }

    await queue.add({ userId }, { jobId });
    console.log(`🚀 Queued classification for user ${userId} (${user.email || 'no-email'})`);
  }

  console.log('\n✅ All jobs queued. Classification worker will process them automatically.');
  console.log('   Watch the backend terminal for [classify-...] progress logs.');

  // Give Bull a moment to acknowledge the jobs, then clean up
  await new Promise(r => setTimeout(r, 2000));
  await queue.close();
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Script failed:', err.message);
  process.exit(1);
});
