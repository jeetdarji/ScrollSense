const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Sentinel error thrown when daily quota (RPD) is exhausted.
// The outer batch loop catches this to stop processing and save partial results.
class QuotaDailyExhaustedError extends Error {
  constructor() {
    super('GEMINI_RPD_EXHAUSTED');
    this.name = 'QuotaDailyExhaustedError';
  }
}

/**
 * Builds career-specific goal keywords for the Gemini prompt.
 * More keywords = better classification accuracy for this user.
 */
function buildGoalKeywords(careerPath, careerPathPreset, goals) {
  const career = (careerPath || careerPathPreset || '').toLowerCase();
  const keywordMap = {
    software_dev: 'programming, coding, algorithms, data structures, system design, React, Node.js, JavaScript, Python, TypeScript, web development, frontend, backend, API, database, DevOps, tech interview, software engineering',
    data_science: 'machine learning, deep learning, data analysis, Python, pandas, neural networks, statistics, AI, NLP, computer vision, Kaggle, data engineering',
    design: 'UI design, UX design, Figma, typography, color theory, design system, product design, branding, wireframe, user research',
    marketing: 'SEO, content marketing, social media marketing, growth hacking, analytics, copywriting, email marketing, funnel, conversion',
    finance: 'investing, stock market, trading, personal finance, budgeting, bonds, ETF, financial planning, valuation, portfolio',
    business: 'entrepreneurship, startup, product management, business strategy, operations, leadership, B2B, SaaS, pitch deck',
    medicine: 'anatomy, physiology, clinical medicine, pharmacology, surgery, diagnosis, medical research, USMLE, pathology',
    law: 'legal analysis, case law, constitutional law, contracts, litigation, bar exam, jurisprudence',
    engineering: 'mechanical engineering, electrical engineering, circuits, thermodynamics, CAD, manufacturing, control systems',
  };

  // Try exact match, then partial match
  let keywords = '';
  for (const [key, kw] of Object.entries(keywordMap)) {
    if (career.includes(key) || key.includes(career)) {
      keywords = kw;
      break;
    }
  }

  // Append goals as additional context
  if (goals && goals.length > 0) {
    keywords = keywords ? `${keywords}, ${goals.join(', ')}` : goals.join(', ');
  }

  return keywords;
}

/**
 * Builds interest-specific YouTube keyword hints per declared interest.
 */
function buildInterestHints(interests) {
  const hintMap = {
    cricket: 'cricket match, IPL, test cricket, ODI, cricket highlights, partnership, wicket, batting, bowling',
    gaming: 'gameplay, let\'s play, game review, walkthrough, esports, speedrun, gaming setup, game trailer',
    music: 'music video, song, album, concert, lyrics, cover, artist interview, playlist, beats',
    movies: 'movie review, film analysis, trailer, box office, director, cinematography, Oscar',
    fitness: 'workout, gym, exercise, bodybuilding, yoga, nutrition, weight loss, HIIT, cardio',
    travel: 'travel vlog, city guide, backpacking, hotel review, flight, tourist, destination',
    cooking: 'recipe, cooking tutorial, chef, food review, baking, cuisine, meal prep',
    anime: 'anime episode, manga, anime review, character analysis, dubbed, subbed, shounen',
    football: 'football match, Premier League, FIFA, goals, tactics, player transfer, La Liga',
    basketball: 'NBA, basketball highlights, dunks, WNBA, college basketball, player stats',
    photography: 'photography tutorial, camera review, lens, editing, lightroom, portrait, landscape',
    reading: 'book review, book summary, author interview, reading list, literature, novel',
    finance: 'stock tips, investment advice, crypto, personal finance, budgeting, trading',
    science: 'science experiment, physics, chemistry, biology, space, NASA, research, discovery',
    history: 'historical documentary, ancient history, war history, biography, civilization',
  };

  const lines = [];
  for (const interest of interests) {
    const label = interest.label.toLowerCase();
    const hint = hintMap[label] || label;
    lines.push(`  "${label}": ${hint}`);
  }
  return lines.join('\n');
}

/**
 * Keyword-based fallback classifier — used when Gemini quota is exhausted.
 * Marks results with source: 'keyword_fallback' for re-classification later.
 */
function keywordFallbackClassify(videos, userContext) {
  const career = (userContext.careerPath || userContext.careerPathPreset || '').toLowerCase();
  const goalKeywords = buildGoalKeywords(
    userContext.careerPath,
    userContext.careerPathPreset,
    userContext.goals
  )
    .toLowerCase()
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);

  const interestKeywordMap = {};
  for (const interest of userContext.interests) {
    const label = interest.label.toLowerCase();
    interestKeywordMap[label] = label.split(' ');
  }

  return videos.map((v) => {
    const haystack = `${v.title} ${v.channelName}`.toLowerCase();

    // Goal check
    const isGoal = goalKeywords.some((kw) => kw.length > 3 && haystack.includes(kw));
    if (isGoal) {
      return {
        videoId: v.videoId,
        channelId: v.channelId,
        channelName: v.channelName,
        category: 'goal',
        matchedInterest: null,
        source: 'keyword_fallback',
      };
    }

    // Interest check
    for (const [label, keywords] of Object.entries(interestKeywordMap)) {
      if (keywords.some((kw) => kw.length > 3 && haystack.includes(kw))) {
        return {
          videoId: v.videoId,
          channelId: v.channelId,
          channelName: v.channelName,
          category: 'interest',
          matchedInterest: label,
          source: 'keyword_fallback',
        };
      }
    }

    return {
      videoId: v.videoId,
      channelId: v.channelId,
      channelName: v.channelName,
      category: 'junk',
      matchedInterest: null,
      source: 'keyword_fallback',
    };
  });
}

/**
 * Classifies a single batch of up to 10 videos using Gemini AI.
 * Chunk size is kept at 10 to stay safely under 15 RPM free tier limit.
 * Titles are INPUT ONLY — they are discarded after classification.
 * Returns array of { videoId, channelId, channelName, category, matchedInterest }.
 * Throws QuotaDailyExhaustedError when RPD limit is hit (caller must stop pipeline).
 */
async function classifyBatch(videos, userContext) {
  const interestLabels = userContext.interests.map((i) => i.label).join(', ');
  const interestLabelList = userContext.interests
    .map((i) => `"${i.label.toLowerCase()}"`)
    .join(', ');

  const goalKeywords = buildGoalKeywords(
    userContext.careerPath,
    userContext.careerPathPreset,
    userContext.goals
  );
  const interestHints = buildInterestHints(userContext.interests);

  // Include previously-known channel categories as context hints
  const knownChannels = (userContext.knownChannels || [])
    .slice(0, 5)
    .map((ch) => `${ch.channelName}=${ch.category}`)
    .join(', ');

  const prompt = `Classify YouTube videos for a behavioral app. Return ONLY a JSON array, no explanation.

USER: focus="${userContext.careerPath || userContext.careerPathPreset}", goals="${userContext.goals ? userContext.goals.join(', ') : ''}"
GOAL_KEYWORDS: ${goalKeywords}
INTERESTS: ${interestLabels}
INTEREST_HINTS:
${interestHints}${knownChannels ? `\nKNOWN_CHANNELS: ${knownChannels}` : ''}

CATEGORIES: goal=focus/goals content, interest=declared interest content, junk=everything else
OUTPUT: [{"id":"videoId","cat":"goal"|"interest"|"junk","interest":"label"|null}]
- interest field: REQUIRED exact lowercase label from [${interestLabelList}] when cat is "interest" — never null for interest category
- interest must be null when cat is goal or junk
- if a video seems like an interest but you cannot confidently match a label, set cat to "junk" instead

VIDEOS:
${videos
  .map(
    (v) =>
      `{"id":"${v.videoId}","t":"${v.title.replace(/"/g, "'")}","ch":"${v.channelName}"}`
  )
  .join('\n')}`;

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

  let classMap = {};
  // RPM exhaustion: retry once after 65s. RPD exhaustion: stop immediately.
  const maxAttempts = 3;
  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();

      let classifications = [];
      try {
        const clean = text.replace(/```json|```/g, '').trim();
        classifications = JSON.parse(clean);
      } catch (err) {
        console.error('Classification parse error:', err.message);
        // Parse failure for this chunk — default to keyword fallback for these videos
        return keywordFallbackClassify(videos, userContext);
      }

      const validCats = ['goal', 'interest', 'junk'];
      const validInterestLabels = userContext.interests.map((i) => i.label.toLowerCase());

      classifications = classifications.map((c) => {
        const validCat = validCats.includes(c.cat) ? c.cat : 'junk';
        let matchedInterest = null;
        if (validCat === 'interest' && c.interest) {
          const normalized = c.interest.toLowerCase().trim();
          const exactMatch = validInterestLabels.find((l) => l === normalized);
          const substringMatch =
            exactMatch === undefined
              ? validInterestLabels.find(
                  (l) => l.includes(normalized) || normalized.includes(l)
                )
              : undefined;
          matchedInterest = exactMatch ?? substringMatch ?? null;
        }
        return { ...c, cat: validCat, interest: matchedInterest };
      });

      classMap = Object.fromEntries(
        classifications.map((c) => [c.id, { cat: c.cat, interest: c.interest ?? null }])
      );
      break; // success
    } catch (err) {
      const errMsg = (err.message || '').toLowerCase();
      const errStatus = err.status || (err.response && err.response.status);

      const isRateLimit =
        errStatus === 429 ||
        errMsg.includes('429') ||
        errMsg.includes('quota') ||
        errMsg.includes('rate limit') ||
        errMsg.includes('resource_exhausted');
      const isServerError =
        errStatus >= 500 || errMsg.includes('503') || errMsg.includes('500');

      if (isRateLimit) {
        // Distinguish RPD (daily) from RPM (per-minute) exhaustion.
        // RPD errors mention "daily" or "per day" in the message.
        const isDailyQuota =
          errMsg.includes('daily') ||
          errMsg.includes('per day') ||
          errMsg.includes('rpd') ||
          errMsg.includes('1000');

        if (isDailyQuota) {
          console.error('[Classification] Daily quota (RPD) exhausted. Stopping classification to save partial results.');
          throw new QuotaDailyExhaustedError();
        }

        // RPM exhaustion — wait full reset window (65s) then retry
        attempt++;
        if (attempt >= maxAttempts) {
          console.error(`[Classification] RPM quota still exhausted after ${maxAttempts} attempts. Using keyword fallback.`);
          return keywordFallbackClassify(videos, userContext);
        }
        console.log(`[Rate Limit] RPM quota exceeded. Waiting 65s before retry ${attempt}/${maxAttempts}...`);
        await new Promise((r) => setTimeout(r, 65000));
      } else if (isServerError) {
        attempt++;
        if (attempt >= maxAttempts) {
          console.error(`[Classification] Server error after ${maxAttempts} attempts. Using keyword fallback.`);
          return keywordFallbackClassify(videos, userContext);
        }
        const backoffMs = 10000 * attempt;
        console.log(`[Classification] Server error. Retrying in ${backoffMs / 1000}s (attempt ${attempt}/${maxAttempts})...`);
        await new Promise((r) => setTimeout(r, backoffMs));
      } else {
        console.error('Classification error:', err.message);
        return keywordFallbackClassify(videos, userContext);
      }
    }
  }

  return videos.map((v) => ({
    videoId: v.videoId,
    channelId: v.channelId,
    channelName: v.channelName, // public info — safe to store
    category: classMap[v.videoId]?.cat || 'junk',
    matchedInterest: classMap[v.videoId]?.interest || null,
    // title: intentionally omitted — privacy by architecture
  }));
}

/**
 * Classifies ALL videos in chunks of 10.
 * 10 videos/request × 8s delay = max 7.5 RPM (safe under 15 RPM free tier limit).
 * On RPD exhaustion, stops early and returns partial results with keyword fallback
 * for remaining videos — partial data is better than no data.
 * Titles are inputs — they are NEVER stored after classification.
 */
async function classifyVideoBatch(videos, userContext) {
  const CHUNK_SIZE = 10; // DO NOT reduce below 10 — smaller = more API calls = faster quota burn
  const results = [];
  let quotaDailyHit = false;

  for (let i = 0; i < videos.length; i += CHUNK_SIZE) {
    if (quotaDailyHit) {
      // RPD exhausted — use keyword fallback for all remaining videos
      const remaining = videos.slice(i);
      console.log(`[Classification] Using keyword fallback for remaining ${remaining.length} videos (RPD exhausted).`);
      results.push(...keywordFallbackClassify(remaining, userContext));
      break;
    }

    const chunk = videos.slice(i, i + CHUNK_SIZE);
    try {
      const chunkResults = await classifyBatch(chunk, userContext);
      results.push(...chunkResults);
    } catch (err) {
      if (err.name === 'QuotaDailyExhaustedError') {
        quotaDailyHit = true;
        // Fallback for this chunk and all remaining
        const remaining = videos.slice(i);
        console.log(`[Classification] RPD hit at chunk ${i}. Keyword fallback for ${remaining.length} videos.`);
        results.push(...keywordFallbackClassify(remaining, userContext));
        break;
      }
      // Any other unexpected error — fallback for this chunk and continue
      console.error(`[Classification] Unexpected error at chunk ${i}:`, err.message);
      results.push(...keywordFallbackClassify(chunk, userContext));
    }

    // 8 seconds between chunks = max 7.5 RPM (50% headroom below 15 RPM limit)
    if (i + CHUNK_SIZE < videos.length && !quotaDailyHit) {
      console.log(`[Classification] Waiting 8s between chunks (${results.length}/${videos.length} done)...`);
      await new Promise((r) => setTimeout(r, 8000));
    }
  }

  const geminiCount = results.filter((r) => !r.source).length;
  const fallbackCount = results.filter((r) => r.source === 'keyword_fallback').length;
  console.log(`[Classification] Complete: ${geminiCount} Gemini, ${fallbackCount} keyword-fallback`);

  return results;
}

/**
 * Takes classified videos and produces weekly aggregates
 * that get stored in BehaviorWeek. Titles are already gone —
 * only categories and channel names remain.
 */
function aggregateClassificationResults(classifiedVideos, watchHistory) {
  const total = classifiedVideos.length;
  const goalCount = classifiedVideos.filter((v) => v.category === 'goal').length;
  const interestCount = classifiedVideos.filter((v) => v.category === 'interest').length;
  const junkCount = classifiedVideos.filter((v) => v.category === 'junk').length;

  const goalPercent = total > 0 ? Math.round((goalCount / total) * 1000) / 10 : 0;
  const interestPercent = total > 0 ? Math.round((interestCount / total) * 1000) / 10 : 0;
  const junkPercent = total > 0 ? Math.round((junkCount / total) * 1000) / 10 : 0;

  const interestBreakdown = {};
  classifiedVideos.forEach((v) => {
    if (v.category === 'interest' && v.matchedInterest) {
      interestBreakdown[v.matchedInterest] = (interestBreakdown[v.matchedInterest] || 0) + 1;
    }
  });

  // Build watchedAt lookup from watchHistory
  const watchedAtMap = {};
  watchHistory.forEach((w) => {
    watchedAtMap[w.videoId] = w.watchedAt;
  });

  // Top channels: group by channelId, count occurrences, get most common category
  const channelMap = {};
  classifiedVideos.forEach((v) => {
    if (!channelMap[v.channelId]) {
      channelMap[v.channelId] = {
        channelName: v.channelName,
        channelId: v.channelId,
        count: 0,
        categories: {},
      };
    }
    channelMap[v.channelId].count++;
    channelMap[v.channelId].categories[v.category] =
      (channelMap[v.channelId].categories[v.category] || 0) + 1;
  });

  const topChannels = Object.values(channelMap)
    .map((ch) => {
      const sortedCats = Object.entries(ch.categories).sort(
        (a, b) => b[1] - a[1]
      );
      return {
        channelName: ch.channelName,
        channelId: ch.channelId,
        category: sortedCats[0][0],
        count: ch.count,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Weekly breakdown: group videos by ISO week (Monday as week start)
  const weekMap = {};
  classifiedVideos.forEach((v) => {
    const watchedAt = watchedAtMap[v.videoId];
    if (!watchedAt) return;

    const date = new Date(watchedAt);
    const dayOfWeek = date.getUTCDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(date);
    weekStart.setUTCDate(date.getUTCDate() - daysToMonday);
    weekStart.setUTCHours(0, 0, 0, 0);
    const weekKey = weekStart.toISOString().split('T')[0];

    if (!weekMap[weekKey]) {
      weekMap[weekKey] = { weekStart: weekKey, goal: 0, interest: 0, junk: 0 };
    }

    weekMap[weekKey][v.category]++;
  });

  const weeklyBreakdown = Object.values(weekMap)
    .map((w) => {
      const wTotal = w.goal + w.interest + w.junk;
      return {
        weekStart: w.weekStart,
        goalCount: w.goal,
        interestCount: w.interest,
        junkCount: w.junk,
        totalVideos: wTotal,
        goalPercent: wTotal > 0 ? Math.round((w.goal / wTotal) * 1000) / 10 : 0,
        interestPercent: wTotal > 0 ? Math.round((w.interest / wTotal) * 1000) / 10 : 0,
        junkPercent: wTotal > 0 ? Math.round((w.junk / wTotal) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  return {
    totalVideos: total,
    goalCount,
    interestCount,
    junkCount,
    goalPercent,
    interestPercent,
    junkPercent,
    topChannels,
    weeklyBreakdown,
    interestBreakdown,
  };
}

module.exports = { classifyVideoBatch, aggregateClassificationResults };
