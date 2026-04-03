const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Classifies a batch of videos (up to 200) using Gemini AI.
 * Titles are INPUT ONLY — they are discarded after classification.
 * Returns array of { videoId, channelId, channelName, category }.
 * Category is one of: 'goal' | 'interest' | 'junk'.
 */
async function classifyBatch(videos, userContext) {
  const interestLabels = userContext.interests
    .map((i) => i.label)
    .join(', ');

  const prompt = `You are a content classifier for a behavioral awareness app. Classify each YouTube video into exactly one category.

USER CONTEXT:
- Focus area: ${userContext.careerPath || userContext.careerPathPreset}
- Goals: ${userContext.goals.join(', ')}
- Declared interests: ${interestLabels}

CATEGORIES:
- goal: Content directly related to the user's focus area or goals
- interest: Content matching the user's declared interests
- junk: Everything else

INTEREST MATCHING:
When category is "interest", also identify which declared interest 
it matches from this list: ${interestLabels}
Use the exact label from the list, lowercase, no spaces 
(e.g. "cricket", "football", "music").
If it matches multiple, pick the closest one.
If category is "goal" or "junk", set interest to null.

RULES:
- Return ONLY a JSON array. No explanation. No markdown. No backticks.
- Each item: {"id":"videoId","cat":"goal"|"interest"|"junk","interest":string|null}
- interest field: exact interest label (lowercase) or null
- If unsure on category, classify as "junk"
- interest must be null when cat is "goal" or "junk"
- Classify based on title and channel name only

VIDEOS TO CLASSIFY:
${videos
  .map(
    (v) =>
      `{"id":"${v.videoId}","title":"${v.title.replace(/"/g, "'")}","channel":"${v.channelName}"}`
  )
  .join('\n')}

Return JSON array only:`;

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-lite',
  });

  let classMap = {};
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();

      // Parse response safely
      let classifications = [];
      try {
        // Strip any accidental markdown fences
        const clean = text.replace(/```json|```/g, '').trim();
        classifications = JSON.parse(clean);
      } catch (err) {
        console.error('Classification parse error:', err.message, 'Text was:', text);
        // Fallback: classify all as 'junk' to avoid blocking pipeline
        classifications = videos.map((v) => ({ id: v.videoId, cat: 'junk', interest: null }));
      }

      // Validate each item — ensure cat is one of the valid values
      const validCats = ['goal', 'interest', 'junk'];
      classifications = classifications.map((c) => ({
        ...c,
        cat: validCats.includes(c.cat) ? c.cat : 'junk',
        interest: validCats.includes(c.cat) && c.cat === 'interest' ? c.interest : null,
      }));

      classMap = Object.fromEntries(
        classifications.map((c) => [c.id, { cat: c.cat, interest: c.interest ?? null }])
      );
      break; // Success, exit retry loop
    } catch (err) {
      const isRateLimit = err.status === 429 || (err.message && err.message.includes('429')) || (err.message && err.message.includes('Quota'));
      const isServerError = err.status >= 500 || (err.message && err.message.includes('503'));
      
      if (isRateLimit || isServerError) {
        attempt++;
        if (attempt >= maxRetries) {
          console.error(`[Classification] Failed after ${maxRetries} attempts due to API limits/errors.`);
          break;
        }
        
        // 20s, 40s, 80s — gentler backoff for free tier
        const backoffMs = 20000 * Math.pow(2, attempt - 1);
        console.log(`[Rate Limit] Gemini quota exceeded or server error. Retrying ${attempt}/${maxRetries} in ${backoffMs / 1000} seconds...`);
        await new Promise(res => setTimeout(res, backoffMs));
      } else {
        console.error('Classification prompt error:', err.message);
        break;
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
 * Classifies ALL videos, chunking into groups of 50 for Gemini
 * to prevent rate limits and token overflow.
 * Titles are inputs — they are NEVER stored after classification.
 */
async function classifyVideoBatch(videos, userContext) {
  if (videos.length <= 10) {
    return classifyBatch(videos, userContext);
  }

  const results = [];
  for (let i = 0; i < videos.length; i += 10) {
    const chunk = videos.slice(i, i + 10);
    const chunkResults = await classifyBatch(chunk, userContext);
    results.push(...chunkResults);
    // 5 seconds between chunks to respect Gemini free tier rate limits 
    // (Free tier is 15 RPM / 1M TPM / 1500 RPD)
    if (i + 10 < videos.length) {
      console.log(`Waiting to respect Gemini rate limits (${results.length}/${videos.length} mapped)...`);
      await new Promise((r) => setTimeout(r, 8000));
    }
  }
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
    if (v.category === 'interest' && v.interestMatch) {
      interestBreakdown[v.interestMatch] = (interestBreakdown[v.interestMatch] || 0) + 1;
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
