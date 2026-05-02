const cron = require('node-cron');
const User = require('../models/User.model');
const { classificationQueue } = require('../config/queue');

/**
 * Queue a fresh classification for all YouTube-connected users who haven't
 * synced in the last 8 hours. Called by both cron windows below.
 */
async function syncAllEligibleUsers() {
  console.log('[Scheduler] Running YouTube background sync...');
  try {
    const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);

    const usersToSync = await User.find({
      youtubeConnected: true,
      onboardingComplete: true,
      $or: [
        { youtubeLastSyncAt: { $lte: eightHoursAgo } },
        { youtubeLastSyncAt: null },
      ],
    }).select('_id').lean();

    console.log(`[Scheduler] Found ${usersToSync.length} eligible user(s) for sync.`);

    for (let i = 0; i < usersToSync.length; i++) {
      const user = usersToSync[i];
      const jobId = `classify-${user._id}`;
      const existingJob = await classificationQueue.getJob(jobId);
      if (existingJob) {
        const state = await existingJob.getState();
        if (['active', 'waiting', 'delayed'].includes(state)) {
          console.log(`[Scheduler] Skipping user ${user._id} — job already ${state}`);
          continue;
        }
        await existingJob.remove();
      }

      // Stagger jobs: 5 minutes apart to prevent thundering herd on Gemini API
      const delayMs = i * 5 * 60 * 1000;
      await classificationQueue.add(
        { userId: user._id.toString() },
        { jobId, delay: delayMs }
      );
      console.log(`[Scheduler] Queued sync for user ${user._id} (delay: ${Math.round(delayMs / 60000)}min)`);
    }
  } catch (error) {
    console.error('[Scheduler] Error during background sync:', error);
  }
}

// Morning window  — 2:30 AM UTC = 8:00 AM IST
cron.schedule('30 2 * * *', syncAllEligibleUsers);

// Evening window — 6:00 PM UTC = 11:30 PM IST
cron.schedule('0 18 * * *', syncAllEligibleUsers);

// ─── Community: Weekly group performance aggregation ────────────────────
// Every Monday at 00:05 UTC — aggregate the previous week's submissions
// into per-group trend data for the group trend chart.
const Group = require('../models/Group.model');
const GroupMembership = require('../models/GroupMembership.model');
const GroupSubmission = require('../models/GroupSubmission.model');
const { getCurrentISOWeek, getPreviousISOWeek } = require('../services/community.service');

async function aggregateCommunityWeek() {
  console.log('[Scheduler] Running weekly community aggregation...');
  try {
    const currentWeek = getCurrentISOWeek();
    const previousWeek = getPreviousISOWeek(currentWeek);

    // Get all groups
    const groups = await Group.find().select('_id name').lean();
    let totalSubmissions = 0;
    let totalMembers = 0;
    let streaksUpdated = 0;

    for (const group of groups) {
      const groupId = group._id;

      const [submissions, activeMembers] = await Promise.all([
        GroupSubmission.find({ groupId, isoWeek: previousWeek })
          .select('deltaMinutes userId')
          .lean(),
        GroupMembership.find({ groupId, isActive: true })
          .select('userId submissionStreak longestStreak')
          .lean(),
      ]);

      const memberCount = activeMembers.length;
      totalSubmissions += submissions.length;
      totalMembers += memberCount;

      if (submissions.length > 0) {
        const avgDelta = Math.round(
          submissions.reduce((s, sub) => s + sub.deltaMinutes, 0) / submissions.length
        );
        console.log(
          `[Community] ${group.name}: ${submissions.length}/${memberCount} submitted, avg delta: ${avgDelta}min`
        );
      }

      // Update submission streaks for all active members
      const submittedUserIds = new Set(submissions.map(s => s.userId.toString()));

      for (const member of activeMembers) {
        const uid = member.userId.toString();
        if (submittedUserIds.has(uid)) {
          // Submitted: increment streak
          const newStreak = (member.submissionStreak || 0) + 1;
          const newLongest = Math.max(newStreak, member.longestStreak || 0);
          await GroupMembership.findByIdAndUpdate(member._id, {
            submissionStreak: newStreak,
            longestStreak: newLongest,
          });
        } else {
          // Did not submit: reset streak
          if (member.submissionStreak > 0) {
            await GroupMembership.findByIdAndUpdate(member._id, {
              submissionStreak: 0,
            });
          }
        }
        streaksUpdated++;
      }
    }

    console.log(
      `[Scheduler] Community aggregation complete: ${totalSubmissions} submissions from ${totalMembers} members across ${groups.length} groups for ${previousWeek}. ${streaksUpdated} streaks updated.`
    );
  } catch (error) {
    console.error('[Scheduler] Community aggregation error:', error);
  }
}

// Monday 00:05 UTC
cron.schedule('5 0 * * 1', aggregateCommunityWeek);

console.log('[Scheduler] Daily background sync initialized (2:30 UTC + 18:00 UTC).');
console.log('[Scheduler] Weekly community aggregation initialized (Monday 00:05 UTC).');
