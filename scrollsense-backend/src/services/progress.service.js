/**
 * Progress service — pure calculation functions.
 * No database calls. No Express imports. Every function is independently testable.
 */

const MILESTONES = [
  { minutes: 300,   hours: 5,   label: '5 HOURS',   message: '5 hours back.',           sub: 'Half a workday reclaimed.' },
  { minutes: 600,   hours: 10,  label: '10 HOURS',  message: '10 hours reclaimed.',     sub: 'A full workday returned.' },
  { minutes: 1500,  hours: 25,  label: '25 HOURS',  message: '25 hours.',               sub: 'Over three full workdays.' },
  { minutes: 3000,  hours: 50,  label: '50 HOURS',  message: '50 HOURS.',               sub: 'An entire work week reclaimed.' },
  { minutes: 6000,  hours: 100, label: '100 HOURS', message: '100 HOURS.',              sub: 'Two and a half work weeks. Incredible.' },
  { minutes: 12000, hours: 200, label: '200 HOURS', message: '200 HOURS.',              sub: 'Five full work weeks. Transformed.' }
];

const GLOBAL_AVG_DAILY_MINUTES = 141;
const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/**
 * Convert a weekStart Date to a label like "MAR W1" or "APR W2".
 * Week number within the month is 1-based: ceil(dayOfMonth / 7).
 */
function getWeekLabel(weekStartDate) {
  const d = new Date(weekStartDate);
  const month = MONTH_NAMES[d.getUTCMonth()];
  const weekNum = Math.ceil(d.getUTCDate() / 7);
  return `${month} W${weekNum}`;
}

/**
 * Get the Monday (00:00:00 UTC) of the ISO week containing the given date.
 */
function getMondayOfWeek(date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

/**
 * Determine current milestone, next milestone, and progress toward it.
 */
function calculateMilestoneStatus(totalReclaimedMinutes) {
  let currentMilestone = null;
  let nextMilestone = null;

  for (let i = MILESTONES.length - 1; i >= 0; i--) {
    if (totalReclaimedMinutes >= MILESTONES[i].minutes) {
      currentMilestone = {
        hours: MILESTONES[i].hours,
        label: MILESTONES[i].label,
        message: MILESTONES[i].message,
        sub: MILESTONES[i].sub,
      };
      if (i < MILESTONES.length - 1) {
        nextMilestone = {
          hours: MILESTONES[i + 1].hours,
          label: MILESTONES[i + 1].label,
        };
      }
      break;
    }
  }

  if (!currentMilestone) {
    nextMilestone = {
      hours: MILESTONES[0].hours,
      label: MILESTONES[0].label,
    };
  }

  const currentMinutes = currentMilestone ? currentMilestone.hours * 60 : 0;
  const nextMinutes = nextMilestone ? nextMilestone.hours * 60 : currentMinutes;
  const range = nextMinutes - currentMinutes;

  const minutesToNextMilestone = nextMilestone
    ? Math.max(0, nextMinutes - totalReclaimedMinutes)
    : 0;

  const percentToNextMilestone = nextMilestone && range > 0
    ? Math.max(0, Math.min(100, Math.round(((totalReclaimedMinutes - currentMinutes) / range) * 100)))
    : 100;

  return { currentMilestone, nextMilestone, minutesToNextMilestone, percentToNextMilestone };
}

/**
 * Deterministic daily-rotating seed from userId + day of year.
 */
function getDailySeed(userId) {
  const now = new Date();
  const start = new Date(now.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  const idStr = String(userId || '');
  let hash = 0;
  for (let i = 0; i < idStr.length; i++) {
    hash = ((hash << 5) - hash) + idStr.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash + dayOfYear);
}

/**
 * Shuffle array deterministically using a numeric seed (LCG algorithm).
 */
function seededShuffle(array, seed) {
  const shuffled = [...array];
  let s = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    const j = s % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Build the alternatives array based on reclaimed time and the user's career/goals.
 * Generates a diverse pool, then shuffles with a daily-rotating seed so the user
 * sees different suggestions each day. Returns { alternatives, needsGoalSetup }.
 */
function calculateMeaningfulAlternatives(reclaimedMinutes, user) {
  const careerPath = (user.careerPath || user.careerPathPreset || '').toLowerCase();
  const goals = user.goals || [];
  const needsGoalSetup = goals.length === 0 && !careerPath;
  const pool = [];

  // ── Universal alternatives ──
  const universalOptions = [
    { activity: 'Hours of quality sleep', minutesPer: 60, unit: 'hours', icon: 'Moon' },
    { activity: 'Books read', minutesPer: 240, unit: 'books', icon: 'BookOpen' },
    { activity: 'Walks taken', minutesPer: 30, unit: 'walks', icon: 'MapPin' },
    { activity: 'Meditation sessions', minutesPer: 15, unit: 'sessions', icon: 'Sun' },
    { activity: 'Podcast episodes finished', minutesPer: 45, unit: 'episodes', icon: 'Headphones' },
    { activity: 'Gym workouts completed', minutesPer: 60, unit: 'workouts', icon: 'Flame' },
    { activity: 'Meals cooked from scratch', minutesPer: 45, unit: 'meals', icon: 'ChefHat' },
    { activity: 'Journal entries written', minutesPer: 20, unit: 'entries', icon: 'PenTool' },
    { activity: 'Language lessons completed', minutesPer: 30, unit: 'lessons', icon: 'Globe' },
    { activity: 'Calls with friends or family', minutesPer: 20, unit: 'calls', icon: 'Phone' },
    { activity: 'Albums listened front to back', minutesPer: 45, unit: 'albums', icon: 'Music' },
    { activity: 'Yoga or stretching sessions', minutesPer: 15, unit: 'sessions', icon: 'Heart' },
  ];

  universalOptions.forEach(opt => {
    const count = Math.floor(reclaimedMinutes / opt.minutesPer);
    if (count >= 1) {
      pool.push({ activity: opt.activity, count, unit: opt.unit, icon: opt.icon, isCareerSpecific: false });
    }
  });

  // ── Career-specific alternatives ──
  const cs = careerPath;
  const careerOptions = [];

  if (cs.includes('software') || cs.includes('dev') || cs.includes('engineer') || cs.includes('code') || cs.includes('programming')) {
    careerOptions.push(
      { activity: 'LeetCode problems solved', minutesPer: 25, unit: 'problems', icon: 'Code' },
      { activity: 'Pages of technical docs read', minutesPer: 3, unit: 'pages', icon: 'FileText' },
      { activity: 'Small coding projects started', minutesPer: 120, unit: 'projects', icon: 'Laptop' },
      { activity: 'GitHub contributions made', minutesPer: 30, unit: 'commits', icon: 'Code' },
      { activity: 'Tutorial videos completed', minutesPer: 20, unit: 'tutorials', icon: 'Monitor' },
      { activity: 'Stack Overflow answers drafted', minutesPer: 15, unit: 'answers', icon: 'MessageSquare' },
    );

  } else if (cs.includes('design')) {
    careerOptions.push(
      { activity: 'UI components sketched', minutesPer: 20, unit: 'components', icon: 'Palette' },
      { activity: 'Design critiques studied', minutesPer: 15, unit: 'critiques', icon: 'Eye' },
      { activity: 'Wireframes created', minutesPer: 30, unit: 'wireframes', icon: 'Palette' },
      { activity: 'Design case studies analyzed', minutesPer: 25, unit: 'case studies', icon: 'Search' },
      { activity: 'Mood boards assembled', minutesPer: 20, unit: 'boards', icon: 'Layers' },
    );

  } else if (cs.includes('business') || cs.includes('entrepreneur') || cs.includes('mba') || cs.includes('market')) {
    careerOptions.push(
      { activity: 'Business articles read', minutesPer: 12, unit: 'articles', icon: 'Briefcase' },
      { activity: 'Case studies reviewed', minutesPer: 45, unit: 'cases', icon: 'BarChart2' },
      { activity: 'Market analyses drafted', minutesPer: 30, unit: 'analyses', icon: 'TrendingUp' },
      { activity: 'Networking emails sent', minutesPer: 10, unit: 'emails', icon: 'Mail' },
      { activity: 'Business plan sections drafted', minutesPer: 60, unit: 'sections', icon: 'FileText' },
    );

  } else if (cs.includes('content') || cs.includes('writ') || cs.includes('creator') || cs.includes('journalist')) {
    careerOptions.push(
      { activity: 'Blog paragraphs drafted', minutesPer: 10, unit: 'paragraphs', icon: 'PenTool' },
      { activity: 'Content briefs written', minutesPer: 30, unit: 'briefs', icon: 'FileText' },
      { activity: 'Video scripts outlined', minutesPer: 20, unit: 'scripts', icon: 'Film' },
      { activity: 'Social captions crafted', minutesPer: 5, unit: 'captions', icon: 'MessageSquare' },
      { activity: 'Newsletter editions planned', minutesPer: 40, unit: 'editions', icon: 'Mail' },
    );

  } else if (cs.includes('science') || cs.includes('research') || cs.includes('phd') || cs.includes('academic')) {
    careerOptions.push(
      { activity: 'Research paper abstracts read', minutesPer: 8, unit: 'abstracts', icon: 'Search' },
      { activity: 'Concept revision sessions', minutesPer: 20, unit: 'sessions', icon: 'Brain' },
      { activity: 'Lab experiments planned', minutesPer: 30, unit: 'experiments', icon: 'Search' },
      { activity: 'Study flashcards reviewed', minutesPer: 2, unit: 'cards', icon: 'Layers' },
      { activity: 'Thesis sections drafted', minutesPer: 45, unit: 'sections', icon: 'FileText' },
    );

  } else if (cs.includes('health') || cs.includes('medic') || cs.includes('nurs') || cs.includes('doctor') || cs.includes('pharma')) {
    careerOptions.push(
      { activity: 'Medical case studies reviewed', minutesPer: 20, unit: 'cases', icon: 'Heart' },
      { activity: 'Anatomy flashcards studied', minutesPer: 2, unit: 'cards', icon: 'Brain' },
      { activity: 'Clinical guidelines read', minutesPer: 15, unit: 'guidelines', icon: 'FileText' },
    );

  } else if (cs.includes('law') || cs.includes('legal') || cs.includes('attorney')) {
    careerOptions.push(
      { activity: 'Legal briefs analyzed', minutesPer: 20, unit: 'briefs', icon: 'FileText' },
      { activity: 'Case law excerpts read', minutesPer: 15, unit: 'excerpts', icon: 'BookOpen' },
      { activity: 'Contract clauses drafted', minutesPer: 25, unit: 'clauses', icon: 'PenTool' },
    );

  } else if (cs.includes('music') || cs.includes('audio')) {
    careerOptions.push(
      { activity: 'Songs practiced or learned', minutesPer: 30, unit: 'songs', icon: 'Music' },
      { activity: 'Beat sketches produced', minutesPer: 20, unit: 'sketches', icon: 'Headphones' },
      { activity: 'Music theory lessons done', minutesPer: 25, unit: 'lessons', icon: 'GraduationCap' },
    );

  } else if (cs.includes('teach') || cs.includes('education') || cs.includes('tutor')) {
    careerOptions.push(
      { activity: 'Lesson plans drafted', minutesPer: 30, unit: 'plans', icon: 'GraduationCap' },
      { activity: 'Student exercises created', minutesPer: 15, unit: 'exercises', icon: 'PenTool' },
      { activity: 'Educational articles read', minutesPer: 12, unit: 'articles', icon: 'BookOpen' },
    );

  } else if (cs.includes('data') || cs.includes('analy') || cs.includes('machine learning') || cs.includes('ai')) {
    careerOptions.push(
      { activity: 'Datasets explored', minutesPer: 25, unit: 'datasets', icon: 'BarChart2' },
      { activity: 'ML tutorials completed', minutesPer: 30, unit: 'tutorials', icon: 'Brain' },
      { activity: 'Dashboard visualizations sketched', minutesPer: 20, unit: 'dashboards', icon: 'Monitor' },
    );

  } else if (!needsGoalSetup) {
    careerOptions.push(
      { activity: 'Learning sessions', minutesPer: 30, unit: 'sessions', icon: 'GraduationCap' },
      { activity: 'Articles read', minutesPer: 10, unit: 'articles', icon: 'BookOpen' },
      { activity: 'Skill practice sessions', minutesPer: 25, unit: 'sessions', icon: 'Target' },
    );
  }

  careerOptions.forEach(opt => {
    const count = Math.floor(reclaimedMinutes / opt.minutesPer);
    if (count >= 1) {
      pool.push({ activity: opt.activity, count, unit: opt.unit, icon: opt.icon, isCareerSpecific: true });
    }
  });

  // ── Shuffle with daily rotation so suggestions change each day ──
  const seed = getDailySeed(user._id);
  const shuffled = seededShuffle(pool, seed);

  return { alternatives: shuffled, needsGoalSetup };
}

/**
 * Apply a simple moving average to the dailyAvgMinutes field.
 * First (windowSize - 1) entries get movingAverage: null.
 */
function calculateMovingAverage(weeklyDataArray, windowSize = 3) {
  return weeklyDataArray.map((entry, i) => {
    if (i < windowSize - 1) return { ...entry, movingAverage: null };
    let sum = 0;
    for (let j = i - windowSize + 1; j <= i; j++) {
      sum += weeklyDataArray[j].dailyAvgMinutes;
    }
    return { ...entry, movingAverage: Math.round((sum / windowSize) * 10) / 10 };
  });
}

/**
 * Weighted overall progress score 0-100.
 * Requires at least 4 weeks of data; returns null otherwise.
 */
function calculateOverallProgressScore(weeklyTrends) {
  if (!weeklyTrends || weeklyTrends.length < 4) return null;

  const first2 = weeklyTrends.slice(0, 2);
  const last2 = weeklyTrends.slice(-2);

  const f2Scroll = first2.reduce((s, w) => s + w.dailyAvgMinutes, 0) / 2;
  const l2Scroll = last2.reduce((s, w) => s + w.dailyAvgMinutes, 0) / 2;

  const f2Goal = first2.reduce((s, w) => s + (w.goalRelevancePercent || 0), 0) / 2;
  const l2Goal = last2.reduce((s, w) => s + (w.goalRelevancePercent || 0), 0) / 2;

  const f2MoodArr = first2.filter(w => w.averageMoodRating != null);
  const l2MoodArr = last2.filter(w => w.averageMoodRating != null);
  const f2Mood = f2MoodArr.length > 0 ? f2MoodArr.reduce((s, w) => s + w.averageMoodRating, 0) / f2MoodArr.length : null;
  const l2Mood = l2MoodArr.length > 0 ? l2MoodArr.reduce((s, w) => s + w.averageMoodRating, 0) / l2MoodArr.length : null;

  // Primary (50%): scroll time reduction
  let scrollScore = 0;
  if (f2Scroll > 0) {
    scrollScore = Math.min(1, Math.max(-1, (f2Scroll - l2Scroll) / f2Scroll)) * 100;
  }

  // Secondary (30%): goal relevance improvement
  const goalScore = Math.min(100, Math.max(-100, l2Goal - f2Goal));

  // Tertiary (20%): mood improvement
  let moodScore = 0;
  const hasMood = f2Mood != null && l2Mood != null;
  if (hasMood) {
    moodScore = Math.min(100, Math.max(-100, ((l2Mood - f2Mood) / 4) * 100));
  }

  // Redistribute mood weight to scroll+goal when mood data is unavailable
  const scrollWeight = hasMood ? 0.5 : 0.625;
  const goalWeight = hasMood ? 0.3 : 0.375;
  const moodWeight = hasMood ? 0.2 : 0;

  const combined = (scrollScore * scrollWeight) + (goalScore * goalWeight) + (moodScore * moodWeight);
  return Math.max(0, Math.min(100, Math.round(combined)));
}

function getProgressLabel(score) {
  if (score == null) return 'NOT ENOUGH DATA YET';
  if (score <= 20) return 'JUST GETTING STARTED';
  if (score <= 40) return 'BUILDING MOMENTUM';
  if (score <= 60) return 'MAKING PROGRESS';
  if (score <= 80) return 'STRONG IMPROVEMENT';
  return 'TRANSFORMED';
}

// ───────────────────────────────────────
// F9 — Time Refund Tracker
// ───────────────────────────────────────

/**
 * Calculate the complex dynamic time refund for a single week's data.
 * Applies base refund, relevance bonus, and fragmentation penalties.
 */
function calculateWeekRefundData(w, baselinePerWeek) {
  const scrollMinutes = w.totalScrollMinutes || 0;
  if (scrollMinutes === 0) {
    return { baseReclaimed: 0, relevanceBonus: 0, fragmentationPenalty: 0, finalReclaimed: 0 };
  }
  
  // 1. Base Reclaimed
  const baseReclaimed = Math.max(0, baselinePerWeek - scrollMinutes);
  
  // 2. Relevance Bonus
  // Time spent learning is partially refunded as it's not "lost" time.
  const careerPct = w.careerRelevantPercent || 0;
  const intPct = w.interestPercent || 0;
  const relevanceBonus = Math.round(scrollMinutes * ((careerPct + intPct) / 100));
  
  // 3. Fragmentation Penalty
  // Penalty for checking apps too frequently.
  // 21 sessions per week is ~3 times a day. We penalize anything above this threshold.
  const sessions = w.sessionsCount || 0;
  const fragmentationPenalty = Math.max(0, sessions - 21) * 2;
  
  const finalReclaimed = Math.max(0, baseReclaimed + relevanceBonus - fragmentationPenalty);
  
  return {
    baseReclaimed,
    relevanceBonus,
    fragmentationPenalty,
    finalReclaimed
  };
}

/**
 * Build the last-12-weeks breakdown array (oldest first).
 * Weeks without a BehaviorWeek doc or with zero scroll data get reclaimedMinutes = 0.
 */
function buildWeeklyBreakdown(validWeeks, baselinePerWeek, joinWeekMonday, now) {
  const weekMap = {};
  validWeeks.forEach(w => {
    const key = new Date(w.weekStart).toISOString().split('T')[0];
    weekMap[key] = w;
  });

  const currentMonday = getMondayOfWeek(now);
  const weeklyData = [];

  for (let i = 11; i >= 0; i--) {
    const weekMonday = new Date(currentMonday);
    weekMonday.setUTCDate(currentMonday.getUTCDate() - i * 7);

    // Skip weeks before the user's join week
    if (weekMonday < joinWeekMonday) continue;

    const weekKey = weekMonday.toISOString().split('T')[0];
    const weekDoc = weekMap[weekKey];
    const isCurrentWeek = i === 0;

    const actualMinutes = weekDoc ? (weekDoc.totalScrollMinutes || 0) : 0;
    
    let refundData = { baseReclaimed: 0, relevanceBonus: 0, fragmentationPenalty: 0, finalReclaimed: 0 };
    if (weekDoc && actualMinutes > 0) {
      refundData = calculateWeekRefundData(weekDoc, baselinePerWeek);
    }

    weeklyData.push({
      weekStart: weekKey,
      weekLabel: getWeekLabel(weekMonday),
      actualMinutes,
      baselineMinutes: baselinePerWeek,
      reclaimedMinutes: refundData.finalReclaimed,
      baseReclaimed: refundData.baseReclaimed,
      relevanceBonus: refundData.relevanceBonus,
      fragmentationPenalty: refundData.fragmentationPenalty,
      isCurrentWeek,
    });
  }

  return weeklyData;
}

/**
 * Master function for F9 — Time Refund Tracker.
 * Returns the complete response shape for GET /api/progress/time-refund.
 */
function calculateTimeRefund(user, behaviorWeeks, behaviorDaysThisWeek) {
  const dailyLimit = user.dailyLimitMinutes || null;
  const baselinePerWeek = dailyLimit ? dailyLimit * 7 : GLOBAL_AVG_DAILY_MINUTES * 7;

  const joinDate = new Date(user.createdAt);
  const now = new Date();
  const daysSinceJoining = Math.max(0, Math.floor((now - joinDate) / (1000 * 60 * 60 * 24)));

  // Calculate the Monday of the week the user joined (include that partial week)
  const joinWeekMonday = getMondayOfWeek(joinDate);

  // Defensive: only include weeks from the join week onward
  const validWeeks = behaviorWeeks.filter(w => new Date(w.weekStart) >= joinWeekMonday);
  const weeksTracked = validWeeks.length;

  const weeklyData = buildWeeklyBreakdown(validWeeks, baselinePerWeek, joinWeekMonday, now);

  // ── Cumulative total: sum ALL weeks' reclaimed minutes (always additive, never negative per week) ──
  const totalReclaimedMinutes = weeklyData.reduce((sum, w) => sum + (w.reclaimedMinutes || 0), 0);
  const totalReclaimedHours = Math.round((totalReclaimedMinutes / 60) * 10) / 10;

  // Current week stats (from BehaviorDay for freshest data)
  const currentWeekActualMinutes = (behaviorDaysThisWeek || []).reduce(
    (sum, d) => sum + (d.totalScrollMinutes || 0), 0
  );
  const utcDay = now.getUTCDay();
  const daysElapsedThisWeek = utcDay === 0 ? 7 : utcDay; // 1=Mon … 7=Sun

  const milestoneStatus = calculateMilestoneStatus(totalReclaimedMinutes);
  const { alternatives, needsGoalSetup } = calculateMeaningfulAlternatives(totalReclaimedMinutes, user);

  let projectedWeekTotal = 0;
  if (daysElapsedThisWeek > 0) {
     projectedWeekTotal = Math.round((currentWeekActualMinutes / daysElapsedThisWeek) * 7);
  }
  const projectedReclaimed = Math.max(0, baselinePerWeek - projectedWeekTotal);

  return {
    totalReclaimedMinutes,
    totalReclaimedHours,
    ...milestoneStatus,
    daysSinceJoining,
    weeksTracked,
    alternatives,
    needsGoalSetup,
    hasEnoughDataForTrend: weeksTracked >= 2,
    weeklyData,
    currentWeekActualMinutes,
    currentWeekProjectedMinutes: projectedWeekTotal,
    currentWeekProjectedReclaimed: projectedReclaimed,
    daysElapsedThisWeek,
    baselinePerWeek,
  };
}

// ───────────────────────────────────────
// F15 — Behavioral Trend Graph
// ───────────────────────────────────────

/**
 * Master function for F15 — Behavioral Trend Graph.
 * Returns the complete response shape for GET /api/progress/trends.
 */
function calculateBehavioralTrends(behaviorWeeks, cravingsPerWeek, instagramLastUploadAt) {
  const weeksTracked = behaviorWeeks.length;

  // Cold start handling
  let hasEnoughData = weeksTracked >= 2;
  const limitedData = weeksTracked >= 2 && weeksTracked < 4;
  let daysUntilTrendUnlocks = 0;

  if (!hasEnoughData && weeksTracked > 0) {
    const earliest = new Date(behaviorWeeks[0].weekStart);
    const unlockDate = new Date(earliest);
    unlockDate.setUTCDate(earliest.getUTCDate() + 14);
    daysUntilTrendUnlocks = Math.max(0, Math.ceil((unlockDate - new Date()) / (1000 * 60 * 60 * 24)));
  } else if (weeksTracked === 0) {
    daysUntilTrendUnlocks = 14;
  }

  const currentMonday = getMondayOfWeek(new Date());
  const currentMondayStr = currentMonday.toISOString().split('T')[0];

  // Days elapsed in the current incomplete week (Mon=1 … Sun=7)
  const utcDay = new Date().getUTCDay();
  const currentWeekDaysElapsed = utcDay === 0 ? 7 : utcDay;

  // Build per-week trend entries
  const weeklyTrends = behaviorWeeks.map(w => {
    const ws = new Date(w.weekStart);
    const weekKey = ws.toISOString().split('T')[0];
    const isCurrentWeek = weekKey === currentMondayStr;
    const divisor = isCurrentWeek ? currentWeekDaysElapsed : 7;
    const dailyAvgMinutes = divisor > 0 ? Math.round((w.totalScrollMinutes || 0) / divisor) : 0;

    // Craving resistance for this week
    const cd = cravingsPerWeek.get(weekKey) || null;
    let cravingResistanceRate = null;
    if (cd && cd.total > 0) {
      cravingResistanceRate = Math.round((cd.resisted / cd.total) * 100);
    }

    // Determine if this week includes Instagram data
    const weekEnd = new Date(ws);
    weekEnd.setUTCDate(ws.getUTCDate() + 6);
    const hasInstagram = instagramLastUploadAt ? new Date(instagramLastUploadAt) <= weekEnd : false;

    return {
      weekStart: weekKey,
      weekLabel: getWeekLabel(ws),
      dailyAvgMinutes,
      goalRelevancePercent: Math.round((w.careerRelevantPercent || 0) + (w.interestPercent || 0)),
      averageMoodRating: w.averageMoodRating != null
        ? Math.round(w.averageMoodRating * 10) / 10
        : null,
      sessionsCount: w.sessionsCount || 0,
      cravingResistanceRate,
      movingAverage: null, // populated below
      isCurrentWeek,
      hasInstagram,
    };
  });

  // Apply 3-week moving average
  const withMovingAvg = calculateMovingAverage(weeklyTrends, 3);

  // Overall progress score
  const overallProgressScore = calculateOverallProgressScore(withMovingAvg);
  const progressLabel = getProgressLabel(overallProgressScore);

  // Best and worst weeks
  let bestWeek = null;
  let worstWeek = null;

  if (withMovingAvg.length > 0) {
    let bestScore = -Infinity;
    let worstDailyAvg = -Infinity;

    withMovingAvg.forEach(w => {
      // Best = lowest scroll + highest goal relevance
      const score = -(w.dailyAvgMinutes) + (w.goalRelevancePercent || 0);
      if (score > bestScore) {
        bestScore = score;
        bestWeek = {
          weekStart: w.weekStart,
          dailyAvgMinutes: w.dailyAvgMinutes,
          goalPercent: w.goalRelevancePercent,
        };
      }
      if (w.dailyAvgMinutes > worstDailyAvg) {
        worstDailyAvg = w.dailyAvgMinutes;
        worstWeek = {
          weekStart: w.weekStart,
          dailyAvgMinutes: w.dailyAvgMinutes,
        };
      }
    });
  }

  return {
    hasEnoughData,
    limitedData,
    daysUntilTrendUnlocks,
    weeksTracked,
    overallProgressScore,
    progressLabel,
    weeklyTrends: withMovingAvg,
    bestWeek,
    worstWeek,
  };
}

module.exports = {
  calculateTimeRefund,
  calculateMeaningfulAlternatives,
  calculateMilestoneStatus,
  calculateBehavioralTrends,
  calculateMovingAverage,
  calculateOverallProgressScore,
  getWeekLabel,
  calculateWeekRefundData,
};
