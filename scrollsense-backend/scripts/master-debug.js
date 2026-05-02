/**
 * ═══════════════════════════════════════════════════════════════════
 *  SCROLLSENSE MASTER DEBUG SCRIPT
 *  Traces the FULL data pipeline for every user:
 *  YouTube API → ClassifiedVideos → BehaviorDay → BehaviorWeek → Frontend Output
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Usage:
 *    node scripts/master-debug.js            (all users)
 *    node scripts/master-debug.js --email jeetdarji950@gmail.com
 */

require('dotenv').config();
const mongoose = require('mongoose');
const axios    = require('axios');

// ── helpers ────────────────────────────────────────────────────────
const HR  = '═'.repeat(70);
const hr  = '─'.repeat(70);
const hr2 = '·'.repeat(70);

const c = {
  reset  : '\x1b[0m',
  bold   : '\x1b[1m',
  dim    : '\x1b[2m',
  green  : '\x1b[32m',
  yellow : '\x1b[33m',
  red    : '\x1b[31m',
  cyan   : '\x1b[36m',
  magenta: '\x1b[35m',
  white  : '\x1b[97m',
};

const ok   = (msg) => console.log(`${c.green}  ✅ ${msg}${c.reset}`);
const warn = (msg) => console.log(`${c.yellow}  ⚠️  ${msg}${c.reset}`);
const fail = (msg) => console.log(`${c.red}  ❌ ${msg}${c.reset}`);
const info = (msg) => console.log(`${c.cyan}  ℹ  ${msg}${c.reset}`);
const head = (msg) => console.log(`\n${c.bold}${c.white}${msg}${c.reset}`);
const dim  = (msg) => console.log(`${c.dim}     ${msg}${c.reset}`);

// ── main ───────────────────────────────────────────────────────────
async function main() {
  const emailFilter = (() => {
    const idx = process.argv.indexOf('--email');
    return idx !== -1 ? process.argv[idx + 1] : null;
  })();

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  ok('MongoDB connected');

  const User            = require('../src/models/User.model');
  const BehaviorDay     = require('../src/models/BehaviorDay.model');
  const BehaviorWeek    = require('../src/models/BehaviorWeek.model');
  const ClassifiedVideo = require('../src/models/ClassifiedVideo.model');
  const Session         = require('../src/models/Session.model');
  const { decrypt }     = require('../src/utils/encrypt');

  const query = emailFilter
    ? { email: emailFilter }
    : { onboardingComplete: true };

  const users = await User.find(query).lean();
  console.log(`\nFound ${users.length} user(s) to inspect.\n`);

  for (const user of users) {
    console.log(`\n${HR}`);
    console.log(`${c.bold}${c.magenta} USER: ${user.email}  (${user._id})${c.reset}`);
    console.log(HR);

    // ─────────────────────────────────────────────────────────────
    // SECTION 1 — PROFILE
    // ─────────────────────────────────────────────────────────────
    head('[ 1 ] PROFILE & ONBOARDING');
    console.log(hr2);
    info(`Onboarding complete : ${user.onboardingComplete}`);
    info(`Career path         : ${user.careerPath || user.careerPathPreset || '(not set)'}`);
    info(`Daily limit         : ${user.dailyLimitMinutes} min`);
    info(`Goals               : ${(user.goals || []).join(', ') || '(none)'}`);
    info(`Interests (${(user.interests || []).length}):`);
    (user.interests || []).forEach(i => {
      dim(`  • ${i.label.padEnd(20)} budget: ${i.dailyMinutes} min/day`);
    });
    info(`Platforms           : ${(user.platforms || []).join(', ')}`);

    // ─────────────────────────────────────────────────────────────
    // SECTION 2 — YOUTUBE CONNECTION & LIVE API
    // ─────────────────────────────────────────────────────────────
    head('[ 2 ] YOUTUBE CONNECTION');
    console.log(hr2);
    info(`youtubeConnected    : ${user.youtubeConnected}`);
    info(`youtubeLastSyncAt   : ${user.youtubeLastSyncAt || 'never'}`);
    info(`youtubeDataUnavail  : ${user.youtubeDataUnavailable}`);

    const rawAccess  = user.googleAccessToken;
    const rawRefresh = user.googleRefreshToken;
    const accessToken  = decrypt(rawAccess);
    const refreshToken = decrypt(rawRefresh);

    info(`Access token stored : ${!!rawAccess}  → decrypts OK: ${!!accessToken}`);
    info(`Refresh token stored: ${!!rawRefresh}  → decrypts OK: ${!!refreshToken}`);

    if (!accessToken) {
      fail('No access token — user must re-login with Google');
      continue;
    }

    // Validate / refresh token
    let validToken = accessToken;
    let tokenStatus = 'fresh';
    try {
      await axios.get('https://www.googleapis.com/youtube/v3/channels', {
        params : { part: 'id', mine: true },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (e) {
      if (e.response?.status === 401 && refreshToken) {
        try {
          const r = await axios.post('https://oauth2.googleapis.com/token', {
            client_id    : process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type   : 'refresh_token',
          });
          validToken  = r.data.access_token;
          tokenStatus = 'refreshed';
        } catch (re) {
          fail(`Token refresh failed: ${re.response?.data?.error || re.message}`);
          continue;
        }
      } else {
        fail(`Token invalid: ${e.response?.status} — ${JSON.stringify(e.response?.data)}`);
        continue;
      }
    }
    ok(`Token is valid (${tokenStatus})`);

    // ── Watch History playlist (HL) ────────────────────────────
    head('[ 3 ] YOUTUBE WATCH HISTORY API');
    console.log(hr2);
    let watchVideos = [];
    try {
      const hlRes = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
        params : { part: 'snippet,contentDetails', playlistId: 'HL', maxResults: 50 },
        headers: { Authorization: `Bearer ${validToken}` },
      });
      watchVideos = hlRes.data.items || [];
      const total = hlRes.data.pageInfo?.totalResults || 0;

      if (watchVideos.length === 0) {
        fail(`Watch History (HL) returned 0 items  (API reports total: ${total})`);
        warn('HL playlist is inaccessible via API — this is a YouTube API v3 limitation');
        warn('The classification job will fall back to Liked Videos automatically');
        info('Checking Liked Videos fallback now...');
        try {
          const chRes = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
            params: { part: 'contentDetails', mine: true },
            headers: { Authorization: `Bearer ${validToken}` },
          });
          const likedId = chRes.data.items?.[0]?.contentDetails?.relatedPlaylists?.likes;
          if (!likedId) {
            fail('No liked playlist found — user has no YouTube channel or no liked videos');
          } else {
            const likedRes = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
              params: { part: 'snippet,contentDetails', playlistId: likedId, maxResults: 10 },
              headers: { Authorization: `Bearer ${validToken}` },
            });
            const likedVideos = likedRes.data.items || [];
            const likedTotal = likedRes.data.pageInfo?.totalResults || 0;
            if (likedTotal > 0) {
              ok(`Liked Videos fallback: ${likedTotal} total liked videos (showing ${likedVideos.length})`);
              ok(`Classification CAN work — it will use liked videos with synthetic recent timestamps`);
              info('Most recently liked:');
              likedVideos.slice(0, 3).forEach(v => {
                dim(`  videoId: ${v.contentDetails?.videoId}   likedAt: ${v.snippet?.publishedAt?.split('T')[0]}   title: ${(v.snippet?.title || '').slice(0, 50)}`);
              });
            } else {
              fail('Liked Videos playlist is also empty — no video data available');
              warn('User needs to like some YouTube videos, OR YouTube History needs to be enabled');
            }
          }
        } catch (likedErr) {
          fail(`Liked Videos check error: ${likedErr.response?.status} — ${likedErr.message}`);
        }
      } else {
        ok(`Watch History returned ${watchVideos.length} items this page  (API total: ${total})`);
        info('Sample video IDs + timestamps:');
        watchVideos.slice(0, 5).forEach(v => {
          dim(`  videoId: ${v.contentDetails?.videoId}   watchedAt: ${v.snippet?.publishedAt}`);
        });

        // Date distribution
        const dateCounts = {};
        watchVideos.forEach(v => {
          const d = v.snippet?.publishedAt?.split('T')[0];
          if (d) dateCounts[d] = (dateCounts[d] || 0) + 1;
        });
        info('Videos per date (most recent first):');
        Object.entries(dateCounts)
          .sort((a, b) => b[0].localeCompare(a[0]))
          .slice(0, 7)
          .forEach(([d, n]) => dim(`  ${d} : ${n} videos`));
      }
    } catch (e) {
      const status = e.response?.status;
      const reason = e.response?.data?.error?.errors?.[0]?.reason || e.message;
      fail(`HL playlist API error: HTTP ${status}  reason: ${reason}`);
      if (status === 403) {
        warn('403 = Watch History access denied. Scope missing or history disabled.');
      }
    }

    // ─────────────────────────────────────────────────────────────
    // SECTION 4 — CLASSIFIED VIDEOS IN DATABASE
    // ─────────────────────────────────────────────────────────────
    head('[ 4 ] CLASSIFIEDVIDEO COLLECTION (DB)');
    console.log(hr2);

    const cvTotal  = await ClassifiedVideo.countDocuments({ userId: user._id });
    const cvGoal   = await ClassifiedVideo.countDocuments({ userId: user._id, category: 'goal' });
    const cvInt    = await ClassifiedVideo.countDocuments({ userId: user._id, category: 'interest' });
    const cvJunk   = await ClassifiedVideo.countDocuments({ userId: user._id, category: 'junk' });
    const cvGemini = await ClassifiedVideo.countDocuments({ userId: user._id, source: 'gemini' });
    const cvFallbk = await ClassifiedVideo.countDocuments({ userId: user._id, source: 'keyword_fallback' });

    if (cvTotal === 0) {
      fail('0 ClassifiedVideo records — classification has NEVER run successfully');
    } else {
      ok(`${cvTotal} total classified videos`);
    }
    info(`  By category  → goal: ${cvGoal}  interest: ${cvInt}  junk: ${cvJunk}`);
    info(`  By source    → gemini: ${cvGemini}  keyword_fallback: ${cvFallbk}`);

    // Interest breakdown
    const cvByInterest = await ClassifiedVideo.aggregate([
      { $match: { userId: user._id, category: 'interest', matchedInterest: { $ne: null } } },
      { $group: { _id: '$matchedInterest', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    if (cvByInterest.length > 0) {
      info('  Interest breakdown:');
      cvByInterest.forEach(r => dim(`    ${r._id.padEnd(25)} ${r.count} videos`));
    }

    // Most recent + oldest classified
    const newestCV = await ClassifiedVideo.findOne({ userId: user._id }).sort({ createdAt: -1 }).lean();
    const oldestCV = await ClassifiedVideo.findOne({ userId: user._id }).sort({ createdAt: 1 }).lean();
    if (newestCV) {
      info(`  Newest classified: ${newestCV.createdAt?.toISOString().split('T')[0]}  (${newestCV.category} — ${newestCV.matchedInterest || 'n/a'})`);
      info(`  Oldest classified: ${oldestCV.createdAt?.toISOString().split('T')[0]}`);
    }

    // ─────────────────────────────────────────────────────────────
    // SECTION 5 — BEHAVIOR DAY RECORDS
    // ─────────────────────────────────────────────────────────────
    head('[ 5 ] BEHAVIORDAY RECORDS (DB)');
    console.log(hr2);

    const bdAll      = await BehaviorDay.find({ userId: user._id }).sort({ date: -1 }).limit(14).lean();
    const bdTotalCnt = await BehaviorDay.countDocuments({ userId: user._id });
    const bdWithYt   = await BehaviorDay.countDocuments({ userId: user._id, youtubeDataFetched: true });
    const todayStr   = new Date().toISOString().split('T')[0];

    info(`Total BehaviorDay records : ${bdTotalCnt}`);
    info(`Records with YouTube data : ${bdWithYt}`);

    const todayBd = bdAll.find(d => d.date === todayStr);
    if (!todayBd) {
      warn(`No BehaviorDay record for TODAY (${todayStr})`);
    } else {
      ok(`Today (${todayStr}) exists:`);
      dim(`  youtubeMinutes    : ${todayBd.youtubeMinutes}`);
      dim(`  instagramMinutes  : ${todayBd.instagramMinutes}`);
      dim(`  totalScrollMinutes: ${todayBd.totalScrollMinutes}`);
      dim(`  youtubeDataFetched: ${todayBd.youtubeDataFetched}`);
      const intMap = todayBd.youtubeInterestMinutes instanceof Map
        ? Object.fromEntries(todayBd.youtubeInterestMinutes)
        : (todayBd.youtubeInterestMinutes || {});
      dim(`  youtubeInterestMinutes: ${JSON.stringify(intMap)}`);
    }

    if (bdAll.length > 0) {
      info('Last 14 days (most recent first):');
      console.log(`${c.dim}     ${'DATE'.padEnd(12)} ${'YT_MIN'.padEnd(8)} ${'IG_MIN'.padEnd(8)} ${'YT_FETCHED'.padEnd(12)} INTEREST_MINS${c.reset}`);
      bdAll.forEach(d => {
        const intMap = d.youtubeInterestMinutes instanceof Map
          ? Object.fromEntries(d.youtubeInterestMinutes)
          : (d.youtubeInterestMinutes || {});
        const intStr = Object.keys(intMap).length > 0
          ? Object.entries(intMap).map(([k,v]) => `${k}:${v}m`).join(' ')
          : '(empty)';
        dim(`  ${d.date.padEnd(12)} ${String(d.youtubeMinutes||0).padEnd(8)} ${String(d.instagramMinutes||0).padEnd(8)} ${String(d.youtubeDataFetched).padEnd(12)} ${intStr}`);
      });
    }

    // ─────────────────────────────────────────────────────────────
    // SECTION 6 — BEHAVIOR WEEK RECORDS
    // ─────────────────────────────────────────────────────────────
    head('[ 6 ] BEHAVIORWEEK RECORDS (DB)');
    console.log(hr2);

    const bwAll = await BehaviorWeek.find({ userId: user._id }).sort({ weekStart: -1 }).limit(5).lean();
    info(`Total BehaviorWeek records: ${bwAll.length}`);

    if (bwAll.length === 0) {
      fail('0 BehaviorWeek records — dashboard will show all zeros');
    }

    bwAll.forEach((w, i) => {
      const wStart = w.weekStart.toISOString().split('T')[0];
      const tag = i === 0 ? ' ← CURRENT' : '';
      info(`Week ${wStart}${tag}:`);
      dim(`  totalScrollMinutes  : ${w.totalScrollMinutes}`);
      dim(`  youtubeVideosClassif: ${w.youtubeVideosClassified ?? '(field missing—undefined)'}`);
      dim(`  careerRelevantPct   : ${w.careerRelevantPercent}%`);
      dim(`  interestPct         : ${w.interestPercent}%`);
      dim(`  junkPct             : ${w.junkPercent}%`);
      const ib = w.interestBreakdown instanceof Map
        ? Object.fromEntries(w.interestBreakdown)
        : (w.interestBreakdown || {});
      dim(`  interestBreakdown   : ${JSON.stringify(ib)}`);
      const di = w.dailyInterestMinutes instanceof Map
        ? Object.fromEntries(w.dailyInterestMinutes)
        : (w.dailyInterestMinutes || {});
      dim(`  dailyInterestMinutes: ${JSON.stringify(di)}`);
    });

    // ─────────────────────────────────────────────────────────────
    // SECTION 7 — SESSION RECORDS (Manual)
    // ─────────────────────────────────────────────────────────────
    head('[ 7 ] MANUAL SESSION RECORDS (DB)');
    console.log(hr2);

    const sessTotal    = await Session.countDocuments({ userId: user._id });
    const sessThisWeek = await Session.countDocuments({
      userId: user._id,
      startTime: { $gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) },
    });
    const sessRecent = await Session.find({ userId: user._id })
      .sort({ startTime: -1 }).limit(5).lean();

    info(`Total sessions        : ${sessTotal}`);
    info(`Sessions this week    : ${sessThisWeek}`);
    if (sessTotal === 0) {
      warn('No manual sessions logged — BehaviorWeek.totalScrollMinutes comes only from sessions');
    } else {
      info('Recent sessions:');
      sessRecent.forEach(s => {
        dim(`  ${new Date(s.startTime).toISOString().split('T')[0]}  ${s.platform.padEnd(10)} ${s.durationMinutes}min  mood:${s.moodRating}  intent:${s.intentionCategory}`);
      });
    }

    // ─────────────────────────────────────────────────────────────
    // SECTION 8 — WHAT THE FRONTEND WOULD SEE RIGHT NOW
    // ─────────────────────────────────────────────────────────────
    head('[ 8 ] SIMULATED FRONTEND OUTPUT (what the dashboard shows)');
    console.log(hr2);

    // Replicate getDashboard logic exactly
    const behaviorWeeks = await BehaviorWeek.find({ userId: user._id })
      .sort({ weekStart: -1 }).limit(7).lean();
    const weeks = behaviorWeeks.reverse();

    const currentWeekDoc = weeks[weeks.length - 1] || null;

    // Aggregate this week's BehaviorDay
    const _now     = new Date();
    const _dow     = _now.getUTCDay();
    const _toMon   = _dow === 0 ? 6 : _dow - 1;
    const _wStart  = new Date(_now);
    _wStart.setUTCDate(_now.getUTCDate() - _toMon);
    _wStart.setUTCHours(0, 0, 0, 0);
    const weekStartStr = _wStart.toISOString().split('T')[0];

    const thisWeekDays = await BehaviorDay.find({
      userId: user._id,
      date: { $gte: weekStartStr },
    }).lean();

    const weekYtMin     = thisWeekDays.reduce((s, d) => s + (d.youtubeMinutes || 0), 0);
    const weekIgMin     = thisWeekDays.reduce((s, d) => s + (d.instagramMinutes || 0), 0);
    const weekDailyTot  = weekYtMin + weekIgMin;
    const weekVideoEst  = weekYtMin > 0 ? Math.round(weekYtMin / 3) : 0;

    const weekIntMinsMap = {};
    thisWeekDays.forEach(d => {
      const obj = d.youtubeInterestMinutes instanceof Map
        ? Object.fromEntries(d.youtubeInterestMinutes)
        : (d.youtubeInterestMinutes || {});
      Object.entries(obj).forEach(([k, v]) => {
        weekIntMinsMap[k] = (weekIntMinsMap[k] || 0) + (Number(v) || 0);
      });
    });
    const daysWithYt = thisWeekDays.filter(d => d.youtubeDataFetched).length || 1;

    const correctedMin    = Math.max(currentWeekDoc?.totalScrollMinutes || 0, weekDailyTot);
    const correctedVideos = Math.max(currentWeekDoc?.youtubeVideosClassified || 0, weekVideoEst);

    info(`Current week start  : ${weekStartStr}`);
    info(`BehaviorDay records in this week: ${thisWeekDays.length}`);
    info(`  YouTube mins (sum of BehaviorDay)  : ${weekYtMin}`);
    info(`  Instagram mins (sum of BehaviorDay): ${weekIgMin}`);
    info(`  Days with YouTube data fetched     : ${daysWithYt}`);
    info(`  BehaviorWeek.totalScrollMinutes    : ${currentWeekDoc?.totalScrollMinutes ?? '(no doc)'}`);
    info(`  BehaviorWeek.ytVideosClassified    : ${currentWeekDoc?.youtubeVideosClassified ?? '(no doc)'}`);
    console.log('');
    console.log(`  ${c.bold}▸ CONTENT DIET — "TOTAL THIS WEEK"    : ${correctedMin} min  →  "${correctedMin < 60 ? correctedMin + 'M' : Math.floor(correctedMin/60) + 'H ' + (correctedMin%60) + 'M'}"${c.reset}`);
    console.log(`  ${c.bold}▸ CONTENT DIET — "VIDEOS CLASSIFIED"  : ${correctedVideos}${c.reset}`);
    console.log('');

    // Interest budgets simulation
    const todayBehavior = await BehaviorDay.findOne({ userId: user._id, date: todayStr }).lean();
    info('Interest Budget Tracker  (per interest):');
    console.log(`${c.dim}     ${'INTEREST'.padEnd(22)} ${'BUDGET'.padEnd(8)} ${'TODAY_YT'.padEnd(12)} ${'WEEK_AVG'.padEnd(12)} STATUS${c.reset}`);

    (user.interests || []).forEach(interest => {
      const label = interest.label.toLowerCase();
      const todayRaw = todayBehavior?.youtubeInterestMinutes instanceof Map
        ? (todayBehavior.youtubeInterestMinutes.get(label) || 0)
        : (todayBehavior?.youtubeInterestMinutes?.[label] || 0);

      const weekTotal   = weekIntMinsMap[label] || 0;
      const avgPerDay   = daysWithYt > 0 ? Math.round(weekTotal / daysWithYt) : 0;
      const finalConsumed = Number(todayRaw) || avgPerDay;
      const budget = Number(interest.dailyMinutes) || 30;

      let status = 'ON_TRACK';
      if (finalConsumed >= budget)         status = `${c.red}OVER${c.reset}`;
      else if (finalConsumed >= budget * 0.8) status = `${c.yellow}NEAR_LIMIT${c.reset}`;

      const todayFlag = todayRaw > 0 ? `${todayRaw}m(live)` : `0→${avgPerDay}m(avg)`;
      dim(`  ${interest.label.padEnd(22)} ${String(budget+'m').padEnd(8)} ${todayFlag.padEnd(12)} ${String(avgPerDay+'m').padEnd(12)} ${status}`);
    });

    // ─────────────────────────────────────────────────────────────
    // SECTION 9 — ROOT CAUSE SUMMARY
    // ─────────────────────────────────────────────────────────────
    head('[ 9 ] ROOT CAUSE SUMMARY');
    console.log(hr2);

    const issues = [];

    if (watchVideos.length === 0) {
      issues.push({
        sev: 'INFO',
        msg: 'YouTube Watch History (HL) playlist returned 0 — this is a YouTube API v3 limitation',
        fix: 'ALREADY HANDLED: classification falls back to Liked Videos with synthetic recent timestamps',
      });
    }
    if (cvTotal === 0) {
      issues.push({
        sev: 'CRITICAL',
        msg: 'No ClassifiedVideo records in DB — classification never ran with real data',
        fix: 'After fixing Watch History, run: node scripts/retrigger-classification.js',
      });
    }
    if (bdWithYt === 0) {
      issues.push({
        sev: 'HIGH',
        msg: 'No BehaviorDay records have YouTube data (youtubeDataFetched=false for all)',
        fix: 'Classification job (Step 8B) never populated BehaviorDay — needs re-run after Watch History fix',
      });
    }
    if (Object.keys(weekIntMinsMap).length === 0) {
      issues.push({
        sev: 'HIGH',
        msg: 'This week\'s BehaviorDay records have zero youtubeInterestMinutes',
        fix: 'Interest Budget Tracker will show 0 until classification populates per-interest minutes',
      });
    }
    if (correctedMin === 0 && sessTotal === 0) {
      issues.push({
        sev: 'MEDIUM',
        msg: 'No sessions logged AND no YouTube minutes — totalScrollMinutes is 0',
        fix: 'Log manual sessions OR let YouTube classification populate BehaviorDay',
      });
    }
    if (correctedVideos === 0) {
      issues.push({
        sev: 'MEDIUM',
        msg: 'Videos Classified shows 0 — youtubeVideosClassified never written to BehaviorWeek',
        fix: 'Will be corrected automatically once classification runs with real watch history',
      });
    }

    if (issues.length === 0) {
      ok('No obvious issues found — data pipeline looks healthy!');
    } else {
      issues.forEach((issue, i) => {
        const color = issue.sev === 'CRITICAL' ? c.red : issue.sev === 'HIGH' ? c.yellow : issue.sev === 'INFO' ? c.cyan : c.cyan;
        const icon  = issue.sev === 'CRITICAL' ? '❌' : issue.sev === 'HIGH' ? '⚠️ ' : 'ℹ ';
        console.log(`\n  ${color}${c.bold}[${issue.sev}] ${icon} ${issue.msg}${c.reset}`);
        console.log(`${c.dim}  Fix: ${issue.fix}${c.reset}`);
      });
    }

    console.log('');
  }

  console.log(`\n${HR}`);
  console.log(`${c.bold}${c.green} DONE${c.reset}`);
  console.log(HR);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('\nFATAL:', err.message, '\n', err.stack);
  process.exit(1);
});
