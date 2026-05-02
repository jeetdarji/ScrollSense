/**
 * Diagnostic script: tests YouTube API access for all connected users.
 * Shows exactly why watch history might return 0 videos.
 *
 * Usage: node scripts/diagnose-youtube.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('✅ MongoDB connected\n');

  const User = require('../src/models/User.model');
  const { decrypt } = require('../src/utils/encrypt');

  const users = await User.find({ youtubeConnected: true }).lean();
  console.log(`Found ${users.length} YouTube-connected user(s)\n`);

  for (const user of users) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`User: ${user.email} (${user._id})`);
    console.log(`${'─'.repeat(60)}`);

    // 1. Check tokens
    const accessToken = decrypt(user.googleAccessToken);
    const refreshToken = decrypt(user.googleRefreshToken);

    console.log(`Access token present:  ${!!accessToken}`);
    console.log(`Refresh token present: ${!!refreshToken}`);

    if (!accessToken) {
      console.log('❌ No access token — user needs to re-auth via Google');
      continue;
    }

    // 2. Validate access token
    let validToken = accessToken;
    try {
      await axios.get('https://www.googleapis.com/youtube/v3/channels', {
        params: { part: 'id', mine: true },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      console.log('✅ Access token is valid');
    } catch (err) {
      if (err.response?.status === 401) {
        console.log('⚠️  Access token expired — trying refresh token...');
        if (!refreshToken) {
          console.log('❌ No refresh token — user must re-connect Google');
          continue;
        }
        try {
          const resp = await axios.post('https://oauth2.googleapis.com/token', {
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
          });
          validToken = resp.data.access_token;
          console.log('✅ Token refreshed successfully');
        } catch (refreshErr) {
          console.log(`❌ Token refresh failed: ${refreshErr.response?.data?.error || refreshErr.message}`);
          continue;
        }
      } else {
        console.log(`❌ Token validation error: ${err.response?.status} — ${JSON.stringify(err.response?.data)}`);
        continue;
      }
    }

    // 3. Try Watch History playlist (HL)
    console.log('\n--- Testing Watch History (HL) playlist ---');
    try {
      const hlRes = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
        params: { part: 'snippet,contentDetails', playlistId: 'HL', maxResults: 5 },
        headers: { Authorization: `Bearer ${validToken}` },
      });
      const count = hlRes.data.items?.length || 0;
      const total = hlRes.data.pageInfo?.totalResults || 0;
      console.log(`✅ HL playlist OK — returned ${count} items (total: ${total})`);
      if (count === 0) {
        console.log('⚠️  Watch history is EMPTY — possible reasons:');
        console.log('   • YouTube watch history is PAUSED on this account');
        console.log('     Fix: myaccount.google.com/data-and-privacy → YouTube history → Turn ON');
        console.log('   • Account is brand new with no watch history');
      }
    } catch (hlErr) {
      const status = hlErr.response?.status;
      const reason = hlErr.response?.data?.error?.errors?.[0]?.reason || hlErr.message;
      console.log(`❌ HL playlist error: ${status} — ${reason}`);

      if (status === 403) {
        console.log('⚠️  Watch history access denied — trying Liked Videos fallback...');
        try {
          const chanRes = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
            params: { part: 'contentDetails', mine: true },
            headers: { Authorization: `Bearer ${validToken}` },
          });
          const likedId = chanRes.data.items?.[0]?.contentDetails?.relatedPlaylists?.likes;
          if (likedId) {
            const likedRes = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
              params: { part: 'snippet,contentDetails', playlistId: likedId, maxResults: 5 },
              headers: { Authorization: `Bearer ${validToken}` },
            });
            const lCount = likedRes.data.items?.length || 0;
            const lTotal = likedRes.data.pageInfo?.totalResults || 0;
            console.log(`✅ Liked videos fallback — ${lCount} items (total: ${lTotal})`);
            if (lCount === 0) {
              console.log('⚠️  No liked videos either — nothing to classify');
            }
          } else {
            console.log('❌ Could not find Liked Videos playlist ID');
          }
        } catch (likedErr) {
          console.log(`❌ Liked videos also failed: ${likedErr.response?.status} — ${likedErr.message}`);
        }
      }
    }

    // 4. Check existing ClassifiedVideo records
    const ClassifiedVideo = require('../src/models/ClassifiedVideo.model');
    const cvCount = await ClassifiedVideo.countDocuments({ userId: user._id });
    console.log(`\nClassifiedVideo records in DB: ${cvCount}`);

    // 5. Check BehaviorDay records
    const BehaviorDay = require('../src/models/BehaviorDay.model');
    const bdCount = await BehaviorDay.countDocuments({ userId: user._id });
    const bdWithYt = await BehaviorDay.countDocuments({ userId: user._id, youtubeDataFetched: true });
    const todayStr = new Date().toISOString().split('T')[0];
    const todayBd = await BehaviorDay.findOne({ userId: user._id, date: todayStr }).lean();
    console.log(`BehaviorDay records: ${bdCount} total, ${bdWithYt} with YouTube data`);
    console.log(`Today's BehaviorDay (${todayStr}): ${todayBd ? JSON.stringify({ ytMin: todayBd.youtubeMinutes, intMin: JSON.stringify(todayBd.youtubeInterestMinutes) }) : 'NOT FOUND'}`);

    // 6. Check BehaviorWeek records
    const BehaviorWeek = require('../src/models/BehaviorWeek.model');
    const weeks = await BehaviorWeek.find({ userId: user._id }).sort({ weekStart: -1 }).limit(3).lean();
    console.log(`BehaviorWeek records: ${weeks.length} found`);
    weeks.forEach(w => {
      console.log(`  Week ${w.weekStart.toISOString().split('T')[0]}: totalScrollMins=${w.totalScrollMinutes}, ytVideos=${w.youtubeVideosClassified}, intBreakdown=${JSON.stringify(w.interestBreakdown)}`);
    });
  }

  console.log(`\n${'═'.repeat(60)}`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Script error:', err.message, err.stack);
  process.exit(1);
});
