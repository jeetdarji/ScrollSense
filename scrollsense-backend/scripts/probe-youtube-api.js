/**
 * Raw YouTube API probe — tests every possible way to get watch data
 * Usage: node scripts/probe-youtube-api.js [email]
 */
require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');

async function main() {
  const emailFilter = process.argv[2] || null;
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('✅ MongoDB connected\n');

  const User = require('../src/models/User.model');
  const { decrypt } = require('../src/utils/encrypt');

  const query = emailFilter ? { email: emailFilter } : { youtubeConnected: true };
  const users = await User.find(query).lean();

  for (const user of users) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`USER: ${user.email}`);
    console.log('═'.repeat(60));

    const token = decrypt(user.googleAccessToken);
    if (!token) { console.log('❌ No token'); continue; }

    // 1. What scopes does this token actually have?
    console.log('\n--- Token Scope Check ---');
    try {
      const r = await axios.get(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`);
      console.log('Scopes granted:', r.data.scope);
      console.log('Email:', r.data.email);
      console.log('Expires in:', r.data.expires_in, 'seconds');
    } catch(e) {
      console.log('Token info error:', e.response?.data || e.message);
    }

    // 2. Raw HL playlist response
    console.log('\n--- HL (Watch History) Playlist RAW ---');
    try {
      const r = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
        params: { part: 'snippet,contentDetails', playlistId: 'HL', maxResults: 5 },
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('HTTP Status:', 200);
      console.log('pageInfo:', JSON.stringify(r.data.pageInfo));
      console.log('Items returned:', r.data.items?.length);
      if (r.data.items?.length > 0) {
        console.log('First item:', JSON.stringify(r.data.items[0], null, 2));
      }
    } catch(e) {
      console.log('HTTP Status:', e.response?.status);
      console.log('Error:', JSON.stringify(e.response?.data, null, 2));
    }

    // 3. WL (Watch Later) — accessible with readonly scope
    console.log('\n--- WL (Watch Later) Playlist ---');
    try {
      const r = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
        params: { part: 'snippet,contentDetails', playlistId: 'WL', maxResults: 3 },
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('WL items:', r.data.items?.length, '| total:', r.data.pageInfo?.totalResults);
    } catch(e) {
      console.log('WL error:', e.response?.status, JSON.stringify(e.response?.data?.error?.errors));
    }

    // 4. Channel info + all related playlists
    console.log('\n--- Channel + Related Playlists ---');
    try {
      const r = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
        params: { part: 'contentDetails,statistics', mine: true },
        headers: { Authorization: `Bearer ${token}` },
      });
      const ch = r.data.items?.[0];
      if (ch) {
        console.log('Channel stats:', JSON.stringify(ch.statistics));
        console.log('Related playlists:', JSON.stringify(ch.contentDetails?.relatedPlaylists));
        const likedId = ch.contentDetails?.relatedPlaylists?.likes;
        if (likedId) {
          const lr = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
            params: { part: 'snippet,contentDetails', playlistId: likedId, maxResults: 5 },
            headers: { Authorization: `Bearer ${token}` },
          });
          console.log(`Liked playlist (${likedId}): ${lr.data.items?.length} items | total: ${lr.data.pageInfo?.totalResults}`);
          if (lr.data.items?.length > 0) {
            console.log('Sample liked video:', lr.data.items[0].contentDetails?.videoId, '|', lr.data.items[0].snippet?.title);
          }
        }
      }
    } catch(e) {
      console.log('Channel error:', e.response?.status, JSON.stringify(e.response?.data?.error));
    }

    // 5. Try Activities endpoint (another way to get recent watches)
    console.log('\n--- Activities (Recent Actions) ---');
    try {
      const r = await axios.get('https://www.googleapis.com/youtube/v3/activities', {
        params: { part: 'snippet,contentDetails', mine: true, maxResults: 10 },
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Activities returned:', r.data.items?.length, '| total:', r.data.pageInfo?.totalResults);
      if (r.data.items?.length > 0) {
        r.data.items.slice(0, 3).forEach(a => {
          console.log(`  type: ${a.snippet?.type} | date: ${a.snippet?.publishedAt} | videoId: ${a.contentDetails?.upload?.videoId || a.contentDetails?.playlistItem?.resourceId?.videoId || 'n/a'}`);
        });
      }
    } catch(e) {
      console.log('Activities error:', e.response?.status, JSON.stringify(e.response?.data?.error?.errors));
    }
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => { console.error(err.message); process.exit(1); });
