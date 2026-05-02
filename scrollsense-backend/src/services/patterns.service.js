const { formatHourLabel, DAY_NAMES } = require('../utils/dateUtils');

const calculateTriggerPatterns = (sessions, intentions, behaviorDays, lastWeekBehavior) => {
  // 1. Tracked days from behavior days
  const activeDays = behaviorDays.filter(day => (day.totalScrollMinutes > 0 || day.youtubeMinutes > 0));
  const daysTracked = activeDays.length;
  const weeksTracked = Math.floor(daysTracked / 7);

  // 2. Data source
  let dataSource = 'insufficient';
  if (sessions.length >= 5) dataSource = 'sessions_and_youtube';
  else if (activeDays.length > 0) dataSource = 'youtube_only';
  const hasEnoughData = dataSource !== 'insufficient';

  // 3. Build hourly heatmap from CURRENT WEEK data
  const hourlyHeatmap = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    label: formatHourLabel(i),
    minutesScrolled: 0,
    sessionCount: 0,
  }));

  sessions.forEach(session => {
    const h = new Date(session.startTime).getUTCHours();
    hourlyHeatmap[h].minutesScrolled += session.durationMinutes || 0;
    hourlyHeatmap[h].sessionCount += 1;
  });

  // Add BehaviorDay youtube minutes distributed by peakHour
  behaviorDays.forEach(day => {
    if (day.peakHour != null && day.peakHour >= 0 && day.peakHour < 24) {
      hourlyHeatmap[day.peakHour].minutesScrolled += day.youtubeMinutes || 0;
      // Include Instagram minutes at peak hour (best available approximation)
      hourlyHeatmap[day.peakHour].minutesScrolled += day.instagramMinutes || 0;
    }
  });

  // 4. Day-of-week breakdown
  const weekdayHeatmap = DAY_NAMES.map((name, i) => ({
    day: name.substring(0, 3),
    dayIndex: i,
    minutesScrolled: 0,
    sessionCount: 0,
  }));

  sessions.forEach(session => {
    const idx = new Date(session.startTime).getUTCDay();
    weekdayHeatmap[idx].minutesScrolled += session.durationMinutes || 0;
    weekdayHeatmap[idx].sessionCount += 1;
  });

  behaviorDays.forEach(day => {
    if (day.date) {
      const idx = new Date(day.date + 'T00:00:00Z').getUTCDay();
      weekdayHeatmap[idx].minutesScrolled += day.totalScrollMinutes || 0;
    }
  });

  // Re-sort MON→SUN
  const sortedWeekdayHeatmap = [1, 2, 3, 4, 5, 6, 0].map(i => weekdayHeatmap[i]);

  // 5. Peak patterns
  let peakHour = null, peakHourLabel = null, maxHourlyMinutes = -1, maxHourlySessions = -1;
  hourlyHeatmap.forEach(h => {
    if (h.minutesScrolled > 0) {
      if (h.minutesScrolled > maxHourlyMinutes || 
         (h.minutesScrolled === maxHourlyMinutes && h.sessionCount > maxHourlySessions)) {
        maxHourlyMinutes = h.minutesScrolled;
        maxHourlySessions = h.sessionCount;
        peakHour = h.hour;
        peakHourLabel = h.label;
      }
    }
  });

  let peakDay = null, maxDayMinutes = -1, maxDaySessions = -1;
  weekdayHeatmap.forEach(d => {
    if (d.minutesScrolled > 0) {
      if (d.minutesScrolled > maxDayMinutes || 
         (d.minutesScrolled === maxDayMinutes && d.sessionCount > maxDaySessions)) {
        maxDayMinutes = d.minutesScrolled;
        maxDaySessions = d.sessionCount;
        peakDay = DAY_NAMES[d.dayIndex];
      }
    }
  });

  // 6. Intention durations
  const intentionData = { boredom: { total: 0, count: 0 }, stress: { total: 0, count: 0 }, specific: { total: 0, count: 0 }, entertainment: { total: 0, count: 0 }, learning: { total: 0, count: 0 } };
  sessions.forEach(s => {
    const cat = s.intentionCategory || 'specific';
    if (intentionData[cat]) { intentionData[cat].total += s.durationMinutes || 0; intentionData[cat].count += 1; }
  });
  const intentionDurations = {};
  for (const [key, data] of Object.entries(intentionData)) {
    intentionDurations[key] = { avgMinutes: data.count > 0 ? Math.round(data.total / data.count) : 0, sessionCount: data.count };
  }

  // Intention counts from Intention docs (check-ins)
  const intentionCounts = {};
  intentions.forEach(i => { intentionCounts[i.intentionCategory] = (intentionCounts[i.intentionCategory] || 0) + 1; });

  // 7. Mood by hour
  const moodMap = {};
  sessions.forEach(s => {
    if (s.moodRating) {
      const h = new Date(s.startTime).getUTCHours();
      if (!moodMap[h]) moodMap[h] = { total: 0, count: 0 };
      moodMap[h].total += s.moodRating;
      moodMap[h].count += 1;
    }
  });
  const moodByHour = Object.keys(moodMap).map(h => ({ hour: parseInt(h, 10), avgMood: Math.round((moodMap[h].total / moodMap[h].count) * 10) / 10 }));

  // 8. WEEK-SPECIFIC insight strings (deterministic, no Gemini)
  const patterns = [];
  const totalMinutesThisWeek = behaviorDays.reduce((s, d) => s + (d.totalScrollMinutes || 0), 0) + sessions.reduce((s, se) => s + (se.durationMinutes || 0), 0);

  // Platform breakdown for combined stats
  const totalYtMinutes = behaviorDays.reduce((s, d) => s + (d.youtubeMinutes || 0), 0);
  const totalIgMinutes = behaviorDays.reduce((s, d) => s + (d.instagramMinutes || 0), 0);

  // Heaviest day insight
  if (peakDay && maxDayMinutes > 0) {
    patterns.push(`This week, ${peakDay.charAt(0) + peakDay.slice(1).toLowerCase()} was your heaviest day at ${Math.round(maxDayMinutes)} minutes.`);
  }

  // Variance insight (New)
  const activeWeekdayCounts = weekdayHeatmap.filter(d => d.minutesScrolled > 0).map(d => d.minutesScrolled);
  if (activeWeekdayCounts.length >= 3) {
    const avg = activeWeekdayCounts.reduce((a, b) => a + b, 0) / activeWeekdayCounts.length;
    let maxDiff = 0;
    activeWeekdayCounts.forEach(val => { if (Math.abs(val - avg) > maxDiff) maxDiff = Math.abs(val - avg); });
    
    // If maximum deviation is less than 20% of the average, it's consistent
    if (maxDiff < avg * 0.2) {
      patterns.push(`Your scrolling is highly consistent, remaining steady across your active days.`);
    } else if (maxDiff > avg * 1.5) {
      patterns.push(`Your scrolling is highly variable, with concentrated spikes rather than a steady routine.`);
    }
  }

  // Peak hour insight — compare to morning average
  if (peakHour !== null) {
    const morningAvg = hourlyHeatmap.filter(h => h.hour >= 6 && h.hour < 12).reduce((s, h) => s + h.minutesScrolled, 0) / 6;
    if (maxHourlyMinutes > morningAvg * 1.5 && morningAvg > 0) {
      const diff = Math.round(maxHourlyMinutes - morningAvg);
      patterns.push(`Your ${peakHourLabel} sessions this week averaged ${diff} minutes longer than morning ones.`);
    }
  }

  // Most common trigger from intention check-ins
  const topTriggerEntry = Object.entries(intentionCounts).sort((a, b) => b[1] - a[1])[0];
  if (topTriggerEntry && topTriggerEntry[1] >= 2) {
    patterns.push(`${topTriggerEntry[0].charAt(0).toUpperCase() + topTriggerEntry[0].slice(1)} was your most common trigger — ${topTriggerEntry[1]} of ${intentions.length} check-ins this week.`);
  }

  // Week-over-week comparison
  if (patterns.length < 3 && lastWeekBehavior) {
    const lastWeekMinutes = lastWeekBehavior.totalScrollMinutes || 0;
    if (lastWeekMinutes > 0 && totalMinutesThisWeek > 0) {
      const pctChange = Math.round(((totalMinutesThisWeek - lastWeekMinutes) / lastWeekMinutes) * 100);
      if (pctChange < 0) patterns.push(`This week you scrolled ${Math.abs(pctChange)}% less than last week.`);
      else if (pctChange > 0) patterns.push(`This week you scrolled ${pctChange}% more than last week.`);
    }
  }

  const finalPatterns = patterns.slice(0, 3);

  // 9. Comparison to last week
  let comparisonToLastWeek = null;
  if (lastWeekBehavior) {
    const lastTotal = lastWeekBehavior.totalScrollMinutes || 0;
    const lastPeakHour = lastWeekBehavior.peakScrollHour;
    const lastGoalPct = lastWeekBehavior.careerRelevantPercent || 0;
    comparisonToLastWeek = {
      lastWeekTotalMinutes: lastTotal,
      thisWeekTotalMinutes: totalMinutesThisWeek,
      minutesDelta: totalMinutesThisWeek - lastTotal,
      percentChange: lastTotal > 0 ? Math.round(((totalMinutesThisWeek - lastTotal) / lastTotal) * 100) : null,
      peakHourShifted: lastPeakHour != null && peakHour != null && lastPeakHour !== peakHour,
      lastWeekPeakHour: lastPeakHour != null ? formatHourLabel(lastPeakHour) : null,
      lastWeekGoalRelevance: lastGoalPct,
      direction: totalMinutesThisWeek < lastTotal ? 'down' : totalMinutesThisWeek === lastTotal ? 'same' : 'up',
    };
  }

  // 10. Progress
  const daysLogged = new Set([
    ...sessions.map(s => new Date(s.startTime).toISOString().split('T')[0]),
    ...activeDays.map(d => d.date),
  ]).size;

  const progressToFullPatterns = {
    daysLogged,
    daysNeeded: 7,
    percentComplete: Math.min(Math.round((daysLogged / 7) * 100), 100),
    unlocked: daysLogged >= 7,
  };

  // 11. YouTube only patterns fallback
  const youtubeOnlyPatterns = { available: false, peakHour: null, peakDay: null, mostActiveTimeLabel: null };
  if (activeDays.length > 0) {
    const hourCounts = {}, dayCounts = {};
    activeDays.forEach(day => {
      if (day.peakHour != null) hourCounts[day.peakHour] = (hourCounts[day.peakHour] || 0) + 1;
      if (day.date) { const dn = DAY_NAMES[new Date(day.date + 'T00:00:00Z').getUTCDay()]; dayCounts[dn] = (dayCounts[dn] || 0) + 1; }
    });
    let topH = null, topHC = -1;
    for (const [h, c] of Object.entries(hourCounts)) { if (c > topHC) { topHC = c; topH = parseInt(h); } }
    let topD = null, topDC = -1;
    for (const [d, c] of Object.entries(dayCounts)) { if (c > topDC) { topDC = c; topD = d; } }
    if (topH !== null) {
      youtubeOnlyPatterns.available = true;
      youtubeOnlyPatterns.peakHour = topH;
      youtubeOnlyPatterns.peakDay = topD;
      youtubeOnlyPatterns.mostActiveTimeLabel = formatHourLabel(topH);
    }
  }

  return {
    hasEnoughData, dataSource, weeksTracked, daysTracked,
    hourlyHeatmap, weekdayHeatmap: sortedWeekdayHeatmap,
    peakHour, peakHourLabel, peakDay,
    intentionDurations, moodByHour,
    patterns: finalPatterns,
    comparisonToLastWeek,
    progressToFullPatterns, youtubeOnlyPatterns,
    platformBreakdown: { youtube: totalYtMinutes, instagram: totalIgMinutes },
  };
};

const calculateEchoChamberScore = (topChannels, currentWeek, lastWeek, instagramTopics) => {
  instagramTopics = instagramTopics || [];
  if (!topChannels || topChannels.length === 0) {
    return { hasData: false, score: 0 };
  }

  // Aggregate duplicates by channelId or channelName
  const channelMap = new Map();
  topChannels.forEach(ch => {
    const key = ch.channelId || (ch.channelName || 'Unknown').toLowerCase();
    if (channelMap.has(key)) {
      const existing = channelMap.get(key);
      existing.count += ch.count;
      if (ch.category && existing.category === 'none') existing.category = ch.category;
    } else {
      channelMap.set(key, { ...ch });
    }
  });

  const aggregatedChannels = Array.from(channelMap.values());
  const totalChannelsTracked = aggregatedChannels.length;
  let top3Count = 0, totalCount = 0;

  const sortedChannels = aggregatedChannels.sort((a, b) => b.count - a.count);
  sortedChannels.forEach((ch, idx) => {
    totalCount += ch.count;
    if (idx < 3) top3Count += ch.count;
  });

  const topChannelConcentration = totalCount > 0 ? (top3Count / totalCount) * 100 : 0;

  // Calculate Herfindahl-Hirschman Index (HHI) for channel concentration
  let hhi = 0;
  if (totalCount > 0) {
    sortedChannels.forEach(ch => {
      const share = (ch.count / totalCount) * 100;
      hhi += (share * share);
    });
  }

  // --- Score calculation (spec: base 50, up to +30 category, +20 channel, +10 interest) ---

  // Use current week's BehaviorWeek percentages if available
  const goalPct = currentWeek?.careerRelevantPercent || 0;
  const interestPct = currentWeek?.interestPercent || 0;
  const junkPct = currentWeek?.junkPercent || 0;
  const interestBreakdown = currentWeek?.interestBreakdown instanceof Map
    ? Object.fromEntries(currentWeek.interestBreakdown)
    : (currentWeek?.interestBreakdown || {});

  let score = 0;

  // HHI component (up to 50 points)
  // HHI ranges from ~0 (perfect competition) to 10000 (monopoly).
  // Under 1500 is diverse, 1500-2500 is moderate, >2500 is highly concentrated.
  if (hhi < 1000) score += 50;
  else if (hhi < 1500) score += 40;
  else if (hhi < 2500) score += 25;
  else if (hhi < 5000) score += 10;
  else score += 0;

  // Category diversity component (up to 20)
  const activeCats = [goalPct, interestPct, junkPct].filter(p => p > 10).length;
  if (activeCats >= 3) score += 20;
  else if (activeCats === 2) score += 10;

  // Interest variety component (up to 15)
  const interestCount = Object.keys(interestBreakdown).length;
  if (interestCount >= 3) score += 15;
  else if (interestCount === 2) score += 8;

  // Instagram topic diversity component (up to 15)
  // More unique topics from Instagram = more diverse consumption
  if (instagramTopics.length >= 5) score += 15;
  else if (instagramTopics.length >= 3) score += 8;

  score = Math.max(0, Math.min(100, Math.round(score)));

  // Labels (non-judgmental)
  let scoreLabel, scoreDescription;
  if (score <= 30) {
    scoreLabel = 'FOCUSED';
    scoreDescription = 'Your content is tightly focused. Great for deep dives, but consider exploring new topics occasionally.';
  } else if (score <= 60) {
    scoreLabel = 'GROWING';
    scoreDescription = 'Your content variety is developing — keep discovering new creators and topics.';
  } else if (score <= 80) {
    scoreLabel = 'BALANCED';
    scoreDescription = 'A healthy mix of goal, interest, and entertainment content.';
  } else {
    scoreLabel = 'DIVERSE';
    scoreDescription = 'Excellent content variety across multiple categories and creators.';
  }

  // Category breakdown from current week
  const categoryBreakdown = [
    { category: 'goal', percent: Math.round(goalPct), channelCount: sortedChannels.filter(c => c.category === 'goal').length },
    { category: 'interest', percent: Math.round(interestPct), channelCount: sortedChannels.filter(c => c.category === 'interest').length },
    { category: 'junk', percent: Math.round(junkPct), channelCount: sortedChannels.filter(c => c.category === 'junk').length },
  ];

  // Weekly trend
  let weeklyTrend = 'no_data';
  if (lastWeek) {
    // We cannot realistically compute exact historical HHI here without last week's exact channels.
    // Instead we'll approximate based on category shifts.
    const lwGoal = lastWeek.careerRelevantPercent || 0;
    const lwInterest = lastWeek.interestPercent || 0;
    const lwJunk = lastWeek.junkPercent || 0;
    
    // Simplify comparison by penalizing junk + lack of goals from previous week
    const lwActiveCats = [lwGoal, lwInterest, lwJunk].filter(p => p > 10).length;
    const cwActiveCats = activeCats;
    
    if (cwActiveCats > lwActiveCats) weeklyTrend = 'improving';
    else if (cwActiveCats < lwActiveCats) weeklyTrend = 'declining';
    else if (goalPct > lwGoal + 5) weeklyTrend = 'improving';
    else if (junkPct > lwJunk + 5) weeklyTrend = 'declining';
    else weeklyTrend = 'stable';
    
    // Simulate a pseudo-score difference for UI trend delta
    const mockDelta = weeklyTrend === 'improving' ? 5 : weeklyTrend === 'declining' ? -5 : 0;
    if(mockDelta !== 0) {
      // EchoChamber UI looks for `delta` if we send it
       weeklyTrend = { direction: weeklyTrend === 'improving' ? 'up' : 'down', delta: Math.abs(mockDelta) };
    } else {
       weeklyTrend = { direction: 'stable', delta: 0 };
    }
  } else {
    weeklyTrend = { direction: 'no_data', delta: 0 };
  }

  const channelList = sortedChannels.map(ch => ({
    channelName: ch.channelName || 'Unknown Channel',
    category: ch.category || 'none',
    count: ch.count || 0,
    percentOfTotal: totalCount > 0 ? ((ch.count || 0) / totalCount) * 100 : 0,
  }));

  return {
    hasData: true,
    score, scoreLabel, scoreDescription,
    totalChannelsTracked, topChannelConcentration,
    channelHHI: Math.round(hhi),
    categoryBreakdown, weeklyTrend,
    channelList,
    instagramTopicCount: instagramTopics.length,
    instagramDataAvailable: instagramTopics.length > 0,
  };
};

const calculateHabitNudge = (sessions, intentions, cravings, user, currentHour, contentDiet, todayContext) => {
  if (sessions.length === 0 && intentions.length === 0) {
    return {
      hasData: false,
      nudges: [
        {
            id: 'generic_1',
            type: 'goal',
            title: 'Take a 10-minute break',
            description: 'Step away from the screen for a moment to rest your eyes.',
            timeEstimate: '10 MIN',
            icon: 'coffee',
            relevanceReason: 'Based on your screen time goals'
        }
      ],
      contextLabel: 'Based on your overall goals',
      resistanceStats: { totalCravings: 0, resisted: 0, resistanceRate: 0, thisWeekResisted: 0 },
      patternBasis: 'General healthy habit suggestion',
      lastNudgeShown: null
    };
  }

  // Time block context
  let timeBlock = 'night';
  if (currentHour >= 5 && currentHour < 12) timeBlock = 'morning';
  else if (currentHour >= 12 && currentHour < 18) timeBlock = 'afternoon';
  else if (currentHour >= 18 && currentHour < 22) timeBlock = 'evening';

  // Today-specific context from controller
  const todayMinutes = todayContext?.todayMinutes || 0;
  const todayIsPeakDay = todayContext?.todayIsPeakDay || false;
  const todayDayName = todayContext?.todayDayName || '';
  const todayIntention = todayContext?.todayIntention || null;
  const dailyLimit = user.dailyLimitMinutes || 90;

  // Specific time block mapping for trigger analysis
  const blockSessions = sessions.filter(s => {
      const h = new Date(s.startTime).getUTCHours();
      if (timeBlock === 'morning') return h >= 5 && h < 12;
      if (timeBlock === 'afternoon') return h >= 12 && h < 18;
      if (timeBlock === 'evening') return h >= 18 && h < 22;
      return h >= 22 || h < 5;
  });

  const triggerCounts = {};
  blockSessions.forEach(s => {
      if (s.intentionCategory) {
          triggerCounts[s.intentionCategory] = (triggerCounts[s.intentionCategory] || 0) + 1;
      }
  });

  let dominantTrigger = 'boredom'; // fallback
  let maxCount = -1;
  for (const [trig, count] of Object.entries(triggerCounts)) {
      if (count > maxCount) {
          maxCount = count;
          dominantTrigger = trig;
      }
  }

  // Resistance stats
  const totalCravings = cravings.length;
  const resisted = cravings.filter(c => c.resisted).length;
  const resistanceRate = totalCravings > 0 ? Math.round((resisted / totalCravings) * 100) : 0;
  
  const now = Date.now();
  const last7DaysCravings = cravings.filter(c => {
      const diff = now - new Date(c.timestamp).getTime();
      return diff <= 7 * 24 * 60 * 60 * 1000;
  });
  const thisWeekResisted = last7DaysCravings.filter(c => c.resisted).length;

  const resistanceStats = {
      totalCravings,
      resisted,
      resistanceRate,
      thisWeekResisted
  };

  const nudges = [];
  const goals = user.goals || [];
  const path = (user.careerPath || user.careerPathPreset || '').toLowerCase();

  // Content diet context
  const junkPct = contentDiet?.junkPercent ?? 0;
  const goalPct = contentDiet?.goalPercent ?? 0;
  const interestBreakdown = contentDiet?.interestBreakdown ?? {};
  const topInterestEntry = Object.entries(interestBreakdown).sort((a, b) => b[1] - a[1])[0];
  const topInterest = topInterestEntry ? topInterestEntry[0] : null;

  // TODAY-SPECIFIC NUDGES — take priority
  // If today is historically the user's heavy day
  if (todayIsPeakDay) {
    nudges.push({
      id: `nudge_peak_day_${Date.now()}`,
      type: 'resistance',
      title: `${todayDayName}s tend to be your longest scroll days`,
      description: `You're at ${todayMinutes} minutes so far today. Stay intentional about each session from here.`,
      timeEstimate: '5 MIN',
      icon: 'alert-triangle',
      relevanceReason: `${todayDayName} is your historically heaviest day`,
    });
  }

  // If user is past their daily limit
  if (todayMinutes > dailyLimit) {
    const over = todayMinutes - dailyLimit;
    nudges.push({
      id: `nudge_over_limit_${Date.now()}`,
      type: 'resistance',
      title: `You're ${over} minutes over your daily limit`,
      description: `You're at ${todayMinutes} minutes today — ${over} minutes over your ${dailyLimit}-minute limit. Every session you skip from here counts.`,
      timeEstimate: '0 MIN',
      icon: 'alert-triangle',
      relevanceReason: `${todayMinutes}min today exceeds your ${dailyLimit}min limit`,
    });
  }

  // If today's intention was boredom
  if (todayIntention === 'boredom') {
    let boredomAction = 'Do one thing related to your goals for 15 minutes.';
    if (path.includes('software') || path.includes('dev')) boredomAction = 'Solve one LeetCode problem or push one commit to a project.';
    else if (path.includes('design')) boredomAction = 'Sketch one UI component or review one Dribbble collection.';
    else if (path.includes('business')) boredomAction = 'Write one business idea or read one case study summary.';
    else if (path.includes('content')) boredomAction = 'Draft one paragraph of your next piece or brainstorm 5 topics.';
    nudges.push({
      id: `nudge_boredom_${Date.now()}`,
      type: 'goal',
      title: 'You opened thinking about boredom',
      description: `Instead of scrolling: ${boredomAction}`,
      timeEstimate: '15 MIN',
      icon: 'target',
      relevanceReason: "Today's intention was boredom",
    });
  }

  // Resistance encouragement
  if (thisWeekResisted > 0) {
    nudges.push({
      id: `nudge_resistance_${Date.now()}`,
      type: 'resistance',
      title: `You've resisted ${thisWeekResisted} scroll urges this week`,
      description: "Each time you resist, the habit weakens. Keep the streak going.",
      timeEstimate: '0 MIN',
      icon: 'shield',
      relevanceReason: `${thisWeekResisted} cravings resisted this week`,
    });
  }

  // NUDGE: Content diet signal
  if (junkPct >= 50) {
    let title = 'Switch to one goal-relevant video';
    let desc = `${junkPct}% of your recent watch time was junk. One intentional video choice shifts that number.`;
    if (path.includes('software') || path.includes('dev')) {
      title = 'Watch one coding tutorial instead';
      desc = `${junkPct}% junk this week. Open a JS, system design, or algorithms video — 15 min moves the needle.`;
    } else if (path.includes('design')) {
      title = 'Find a design critique video';
      desc = `${junkPct}% junk this week. A 10-min Figma or case study video counts as goal content.`;
    } else if (path.includes('data') || path.includes('science')) {
      title = 'Watch a data walkthrough';
      desc = `${junkPct}% junk this week. A short Kaggle or ML tutorial shifts your diet score.`;
    } else if (path.includes('finance') || path.includes('business')) {
      title = 'Skip the feed — read a market piece';
      desc = `${junkPct}% junk this week. A business case or finance explainer keeps your goal % above zero.`;
    }
    nudges.push({
      id: 'nudge_diet_junk',
      type: 'content_diet',
      title,
      description: desc,
      timeEstimate: '15 MIN',
      icon: 'target',
      relevanceReason: `Junk content at ${junkPct}% — above the 30% healthy threshold`,
    });
  } else if (goalPct < 20 && contentDiet) {
    nudges.push({
      id: 'nudge_diet_goal',
      type: 'content_diet',
      title: 'Boost your goal score',
      description: `Only ${goalPct}% goal-relevant content this week. Add one intentional watch session to change this.`,
      timeEstimate: '20 MIN',
      icon: 'trending-up',
      relevanceReason: `Goal content at ${goalPct}% — below 20% minimum`,
    });
  } else {
    // On track — push offline break as first nudge
    nudges.push({
      id: 'nudge_reduce_1',
      type: 'goal',
      title: 'Offline break',
      description: 'Try closing the app and taking a short walk.',
      timeEstimate: '10 MIN',
      icon: 'activity',
      relevanceReason: 'Aligns with your goal to reduce total screen time',
    });
  }

  // NUDGE 2: Career path specific action
  if (goals.includes('career_content') || path) {
    let title = 'Read one article in your field';
    let desc = 'Spend some time on career-focused content instead of general scrolling.';
    if (path.includes('software') || path.includes('dev')) { 
      title = 'Solve one LeetCode Easy'; 
      desc = 'Keep your problem-solving skills sharp with 20 minutes of focused practice.';
    } else if (path.includes('design')) { 
      title = 'Sketch one UI component'; 
      desc = 'Practice your layout skills away from the feed — 15 min of hands-on work beats passive watching.';
    } else if (path.includes('business')) { 
      title = 'Review one business case'; 
      desc = 'Focus on high-leverage knowledge that compounds over time.';
    } else if (path.includes('content') || path.includes('marketing')) { 
      title = 'Brainstorm 5 content ideas'; 
      desc = 'Switch from consuming to creating — every idea list improves your creative range.';
    } else if (path.includes('data') || path.includes('science')) { 
      title = 'Run a small data analysis'; 
      desc = 'Even 20 minutes on a toy dataset builds intuition faster than watching videos.';
    } else if (path.includes('finance')) { 
      title = 'Review your investment thesis'; 
      desc = 'Revisit your notes or read one earnings summary — active analysis beats passive content.';
    }
    nudges.push({
      id: 'nudge_career',
      type: 'goal',
      title,
      description: desc,
      timeEstimate: '20 MIN',
      icon: 'briefcase',
      relevanceReason: 'Aligns with your career path',
    });
  }

  // NUDGE 3: Trigger + interest + time-of-day aware
  if (dominantTrigger === 'stress') {
    nudges.push({
      id: 'nudge_trigger_stress',
      type: 'resistance',
      title: 'Box breathing — 4 rounds',
      description: 'Stress is your #1 scroll trigger right now. 90 seconds of box breathing resets your nervous system without opening your phone.',
      timeEstimate: '5 MIN',
      icon: 'wind',
      relevanceReason: 'Stress is your dominant scroll trigger in this time block',
    });
  } else if (dominantTrigger === 'boredom' && topInterest) {
    nudges.push({
      id: 'nudge_trigger_boredom_interest',
      type: 'interest',
      title: `Dive into ${topInterest} content`,
      description: `You scroll from boredom in the ${timeBlock}. Open a focused ${topInterest} video — at least it's on your interest list, not random junk.`,
      timeEstimate: '15 MIN',
      icon: 'book-open',
      relevanceReason: `Boredom scrolling redirected to your declared ${topInterest} interest`,
    });
  } else if (topInterest && contentDiet) {
    nudges.push({
      id: 'nudge_interest_redirect',
      type: 'interest',
      title: `Quality ${topInterest} time`,
      description: `If you're going to watch, make it count. Pick a specific ${topInterest} video you actually want — not autoplay.`,
      timeEstimate: '20 MIN',
      icon: 'compass',
      relevanceReason: `${topInterest} is your most-watched interest category`,
    });
  } else {
    nudges.push({
      id: 'nudge_time',
      type: 'resistance',
      title: timeBlock === 'morning' ? 'No-phone first 30 min' : timeBlock === 'night' ? 'Phone-free wind-down' : 'Screen-free break',
      description: timeBlock === 'morning'
        ? "Starting your morning without scrolling changes its entire tone. Keep the phone down until you've done one real task."
        : timeBlock === 'night'
        ? 'Late scrolling disrupts sleep quality significantly. Try audio-only content or a book instead.'
        : 'A 20-minute screen break in the afternoon improves focus for the rest of the day.',
      timeEstimate: timeBlock === 'morning' ? '30 MIN' : '20 MIN',
      icon: 'sunrise',
      relevanceReason: `Your scroll habits peak in the ${timeBlock}`,
    });
  }

  let contextLabel = `Based on your usual ${timeBlock} patterns`;
  if (todayMinutes > dailyLimit) contextLabel = `You're at ${todayMinutes}min today — over your ${dailyLimit}min limit`;
  else if (todayIsPeakDay) contextLabel = `${todayDayName} is your heaviest scroll day — stay intentional`;
  else if (junkPct >= 50) contextLabel = `Junk content at ${junkPct}% this week — here's what to do instead`;
  else if (dominantTrigger === 'boredom') contextLabel = `You scroll from boredom in the ${timeBlock}`;
  else if (dominantTrigger === 'stress') contextLabel = `Stress scrolling peaks for you in the ${timeBlock}`;
  else if (goalPct < 20 && contentDiet) contextLabel = `Goal content at ${goalPct}% — below the 20% minimum`;

  const nudgeId = `nudge_${Date.now()}`;

  return {
    hasData: true,
    nudgeId,
    nudges: nudges.slice(0, 3),
    contextLabel,
    resistanceStats,
    patternBasis: `Generated from your ${timeBlock} scroll patterns and content diet data.`,
    lastNudgeShown: user.lastNudgeShownAt || null,
  };
};

const processInstagramExport = (filesData, userId) => {
    // filesData: { videos_watched, ads_viewed, your_topics }
    if (!filesData || !filesData.videos_watched || !Array.isArray(filesData.videos_watched)) {
        throw new Error('Invalid Instagram export data');
    }

    const videosWatchedCount = filesData.videos_watched.length;
    let earliestTs = Infinity;
    let latestTs = 0;
    
    const dailyActivityMap = {};
    const hourCounts = {};
    const dayCounts = {};
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

    filesData.videos_watched.forEach(entry => {
        let ts = null;
        if (entry.string_map_data && entry.string_map_data.Author && entry.string_map_data.Author.timestamp) {
            ts = entry.string_map_data.Author.timestamp;
            // timestamp in json is sometimes seconds, need ms
            if (ts < 100000000000) ts *= 1000;
        } else if (entry.string_map_data && entry.string_map_data.Time && entry.string_map_data.Time.timestamp) {
            ts = entry.string_map_data.Time.timestamp;
            if (ts < 100000000000) ts *= 1000;
        } else if (entry.string_list_data && entry.string_list_data[0] && entry.string_list_data[0].timestamp) {
            ts = entry.string_list_data[0].timestamp;
            if (ts < 100000000000) ts *= 1000;
        } else if (entry.timestamp) {
            ts = entry.timestamp;
            if (ts < 100000000000) ts *= 1000;
        }

        if (ts) {
            if (ts < earliestTs) earliestTs = ts;
            if (ts > latestTs) latestTs = ts;

            const d = new Date(ts);
            const dateStr = d.toISOString().split('T')[0];
            const h = d.getUTCHours();
            const dayName = dayNames[d.getUTCDay()];

            if (!dailyActivityMap[dateStr]) dailyActivityMap[dateStr] = 0;
            dailyActivityMap[dateStr]++;
            
            hourCounts[h] = (hourCounts[h] || 0) + 1;
            dayCounts[dayName] = (dayCounts[dayName] || 0) + 1;
        }
    });

    const dailyActivity = Object.keys(dailyActivityMap).map(dateStr => {
        const count = dailyActivityMap[dateStr];
        return {
            date: dateStr,
            videoCount: count,
            estimatedMinutes: count * 1.5 // 90 seconds avg
        };
    }).sort((a, b) => a.date.localeCompare(b.date));

    let peakHour = null;
    let maxH = -1;
    for (const [h, count] of Object.entries(hourCounts)) {
        if (count > maxH) { maxH = count; peakHour = parseInt(h); }
    }

    let peakDay = null;
    let maxD = -1;
    for (const [d, count] of Object.entries(dayCounts)) {
        if (count > maxD) { maxD = count; peakDay = d; }
    }
    
    // Topics Extract
    let topics = [];
    if (filesData.your_topics && Array.isArray(filesData.your_topics)) {
        // try to extract from typical structure
        // usually { "string_map_data": { "Name": { "value": "Fashion" } }}
        filesData.your_topics.forEach(t => {
            if (t.string_map_data && t.string_map_data.Name && t.string_map_data.Name.value) {
                topics.push(t.string_map_data.Name.value);
            } else if (t.string_list_data && t.string_list_data[0] && t.string_list_data[0].value) {
                topics.push(t.string_list_data[0].value);
            } else if (typeof t === 'string') {
                topics.push(t);
            }
        });
        
        // Remove duplicates and limit
        topics = [...new Set(topics)].filter(Boolean).slice(0, 50);
    }

    return {
        success: true,
        videosWatchedCount,
        topicsCount: topics.length,
        dateRange: earliestTs !== Infinity ? {
            earliest: new Date(earliestTs).toISOString(),
            latest: new Date(latestTs).toISOString()
        } : null,
        dailyActivity,
        peakHour,
        peakDay,
        // Expose full distributions so controller can build frontend-ready heatmaps
        hourCounts,
        dayCounts,
        topics,
        processingComplete: true
    };
};

module.exports = {
  calculateTriggerPatterns,
  calculateEchoChamberScore,
  calculateHabitNudge,
  processInstagramExport,
};