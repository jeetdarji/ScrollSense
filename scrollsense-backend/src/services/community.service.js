/**
 * Community Service — Pure functions for the anonymous accountability groups feature.
 *
 * No Express. No database calls. Receives pre-fetched data as arguments,
 * returns computed results. Every function handles edge cases.
 */

// ─── Constants ──────────────────────────────────────────────────────────
const ADJECTIVES = [
  'Quiet', 'Silver', 'Amber', 'Dark', 'Calm', 'Still', 'Iron', 'Pale',
  'Slow', 'Dim', 'Grey', 'Cold', 'Swift', 'Deep', 'Hollow', 'Bright',
  'Faint', 'Gentle', 'Warm', 'Soft', 'Bold', 'Clear', 'Dusk', 'Frost',
  'Misty', 'Silent', 'Steady', 'Vast', 'Wild', 'Ancient', 'Subtle',
  'Distant', 'Hidden', 'Lone', 'Noble', 'Proud', 'Rare', 'Sharp',
  'Stone', 'Thin', 'True', 'Woven', 'Young', 'Ashen', 'Burnt',
  'Copper', 'Dusted', 'Gilded', 'Ivory', 'Scarlet',
];

const NOUNS = [
  'Fox', 'Wolf', 'Crane', 'Tide', 'Ridge', 'Hawk', 'Reed', 'Dawn',
  'River', 'Star', 'Moth', 'Fern', 'Ash', 'Dune', 'Moss', 'Wind',
  'Owl', 'Pine', 'Flame', 'Brook', 'Cliff', 'Stone', 'Wren', 'Lake',
  'Cloud', 'Thorn', 'Ember', 'Birch', 'Seal', 'Heron', 'Sage',
  'Drift', 'Peak', 'Shade', 'Bloom', 'Spark', 'Grove', 'Cove',
  'Vale', 'Marsh', 'Coral', 'Falcon', 'Otter', 'Raven', 'Finch',
  'Cedar', 'Flint', 'Pebble', 'Glacier', 'Meadow',
];

// Trigger type mapping: onboarding scrollTrigger value → group triggerType
const TRIGGER_MAP = {
  late_night:      'late_night',
  morning:         'morning',
  stressed:        'stress',
  stress:          'stress',
  boredom:         'boredom',
  bored:           'boredom',
  procrastinating: 'procrastination',
  procrastination: 'procrastination',
};

// Recommendation signal weights
const WEIGHT_TRIGGER_MATCH   = 40;
const WEIGHT_PEAK_HOUR       = 25;
const WEIGHT_INTENTION        = 15;
const WEIGHT_CRAVING          = 10;
const WEIGHT_GROUP_HEALTH     = 10;

// ─── Anonymous Name Generation ──────────────────────────────────────────

/**
 * Generate a unique two-word anonymous name for a user within a group.
 *
 * @param {string[]} excludeList – names already in use (active + retired) in the group
 * @returns {string} e.g. "Quiet Fox"
 */
function generateAnonymousName(excludeList = []) {
  const excludeSet = new Set(excludeList.map(n => n.toLowerCase()));
  const maxAttempts = 10;

  for (let i = 0; i < maxAttempts; i++) {
    const adj  = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const name = `${adj} ${noun}`;

    if (!excludeSet.has(name.toLowerCase())) {
      return name;
    }
  }

  // Fallback: append timestamp fragment for uniqueness
  const adj  = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const suffix = Date.now().toString(36).slice(-3);
  return `${adj} ${noun} ${suffix}`;
}

// ─── ISO Week Utilities ─────────────────────────────────────────────────

/**
 * Get ISO 8601 week string for a given date.
 * @param {Date} [date] – defaults to now
 * @returns {string} e.g. "2026-W16"
 */
function getCurrentISOWeek(date) {
  const d = date ? new Date(date) : new Date();
  // ISO week: the week containing the year's first Thursday
  d.setHours(0, 0, 0, 0);
  // Set to nearest Thursday: current date + 4 - current day number (Monday=1, Sunday=7)
  const dayNum = d.getDay() || 7; // Convert Sunday=0 to 7
  d.setDate(d.getDate() + 4 - dayNum);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Get the ISO week string for the week before the given ISO week.
 * @param {string} isoWeek – e.g. "2026-W16"
 * @returns {string} e.g. "2026-W15"
 */
function getPreviousISOWeek(isoWeek) {
  const date = getWeekStartDate(isoWeek);
  date.setDate(date.getDate() - 7);
  return getCurrentISOWeek(date);
}

/**
 * Convert ISO week string to the Monday Date of that week.
 * @param {string} isoWeek – e.g. "2026-W16"
 * @returns {Date}
 */
function getWeekStartDate(isoWeek) {
  if (!isoWeek || typeof isoWeek !== 'string') return new Date();
  const parts = isoWeek.match(/^(\d{4})-W(\d{2})$/);
  if (!parts) return new Date();

  const year = parseInt(parts[1], 10);
  const week = parseInt(parts[2], 10);

  // Jan 4th is always in ISO week 1
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7; // Monday=1
  // Monday of week 1
  const monday1 = new Date(jan4);
  monday1.setDate(jan4.getDate() - dayOfWeek + 1);
  // Target Monday
  const target = new Date(monday1);
  target.setDate(monday1.getDate() + (week - 1) * 7);
  target.setHours(0, 0, 0, 0);
  return target;
}

/**
 * Calculate which membership week the user is in.
 * @param {Date|string} joinedAt
 * @returns {number} 1-based week number
 */
function calculateWeekOfMembership(joinedAt) {
  if (!joinedAt) return 1;
  const joined = new Date(joinedAt);
  const now = new Date();
  const diffMs = now - joined;
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
  return Math.max(1, diffWeeks + 1);
}

// ─── Delta Calculation ──────────────────────────────────────────────────

/**
 * Calculate weekly scroll time improvement delta.
 *
 * deltaMinutes = currentWeek.totalScrollMinutes - previousWeek.totalScrollMinutes
 * Negative = scrolled LESS this week = IMPROVEMENT
 * Positive = scrolled MORE this week = WORSE
 *
 * @param {object|null} currentWeekData  – BehaviorWeek doc for current week
 * @param {object|null} previousWeekData – BehaviorWeek doc for previous week
 * @param {object[]}    [currentWeekDays] – BehaviorDay docs for current week (fallback)
 * @returns {{ deltaMinutes: number|null, percentChange: number|null, baselineMinutes: number|null, isBaseline: boolean }}
 */
function calculateWeeklyDelta(currentWeekData, previousWeekData, currentWeekDays = []) {
  // Determine current week total
  let currentTotal = null;
  if (currentWeekData && typeof currentWeekData.totalScrollMinutes === 'number') {
    currentTotal = currentWeekData.totalScrollMinutes;
  } else if (currentWeekDays.length > 0) {
    // Estimate from BehaviorDay documents
    currentTotal = currentWeekDays.reduce((sum, day) => {
      return sum + (day.totalScrollMinutes || 0);
    }, 0);
  }

  // No current data at all — user hasn't tracked this week
  if (currentTotal === null) {
    return { deltaMinutes: null, percentChange: null, baselineMinutes: null, isBaseline: true };
  }

  // No previous week — this is the baseline
  if (!previousWeekData || typeof previousWeekData.totalScrollMinutes !== 'number' || previousWeekData.totalScrollMinutes === 0) {
    return {
      deltaMinutes: 0,
      percentChange: 0,
      baselineMinutes: currentTotal,
      isBaseline: true,
    };
  }

  const previousTotal = previousWeekData.totalScrollMinutes;
  const deltaMinutes = currentTotal - previousTotal;
  const percentChange = previousTotal > 0
    ? Math.round((deltaMinutes / previousTotal) * 100)
    : 0;

  return {
    deltaMinutes,
    percentChange,
    baselineMinutes: previousTotal,
    isBaseline: false,
  };
}

// ─── Group Recommendation Engine ────────────────────────────────────────

/**
 * Recommend groups for a user based on multi-signal behavioral analysis.
 *
 * @param {object}   user           – User document (scrollTriggers, etc.)
 * @param {object[]} behaviorWeeks  – Last 4 BehaviorWeek docs (newest first)
 * @param {object[]} cravings       – Last 30 days of Craving docs
 * @param {object[]} intentions     – Last 30 days of Intention docs
 * @param {object[]} groups         – All Group docs
 * @param {Map}      memberCountMap – Map<groupId string, number> of active member counts
 * @param {Map}      peakHourMap    – Map<groupId string, number[]> of member peak hours
 * @returns {object[]} Ranked array of { group, score, reason, matchedSignals }
 */
function recommendGroups(user, behaviorWeeks, cravings, intentions, groups, memberCountMap, peakHourMap) {
  if (!groups || groups.length === 0) return [];

  const userTriggers = (user.scrollTriggers || []).map(t => t.toLowerCase());

  // Pre-compute user signals
  const latestWeek = behaviorWeeks && behaviorWeeks.length > 0 ? behaviorWeeks[0] : null;
  const peakHour = latestWeek ? latestWeek.peakScrollHour : null;

  // Most common intention category
  const intentionFreq = {};
  (intentions || []).forEach(i => {
    const cat = (i.intentionCategory || '').toLowerCase();
    if (cat) intentionFreq[cat] = (intentionFreq[cat] || 0) + 1;
  });
  const topIntention = Object.keys(intentionFreq).sort((a, b) => intentionFreq[b] - intentionFreq[a])[0] || null;

  // Most common craving category
  const cravingFreq = {};
  (cravings || []).forEach(c => {
    const cat = (c.cravingCategory || '').toLowerCase();
    if (cat) cravingFreq[cat] = (cravingFreq[cat] || 0) + 1;
  });
  const topCraving = Object.keys(cravingFreq).sort((a, b) => cravingFreq[b] - cravingFreq[a])[0] || null;

  // Score each group
  const scored = [];

  for (const group of groups) {
    const gid = group._id.toString();
    const memberCount = memberCountMap.get(gid) || 0;

    // Skip full groups
    if (memberCount >= (group.maxMembers || 8)) continue;

    let score = 0;
    const matchedSignals = [];

    // ── SIGNAL 1: Trigger pattern match (weight 40) ──
    const triggerTypes = userTriggers.map(t => TRIGGER_MAP[t]).filter(Boolean);
    if (triggerTypes.includes(group.triggerType)) {
      score += WEIGHT_TRIGGER_MATCH;
      matchedSignals.push('trigger_match');
    }

    // ── SIGNAL 2: Peak scroll hour (weight 25) ──
    if (peakHour !== null && peakHour !== undefined) {
      const hourBoost = getHourBoostForTriggerType(peakHour, group.triggerType);
      score += Math.round(WEIGHT_PEAK_HOUR * hourBoost);
      if (hourBoost > 0) matchedSignals.push('peak_hour');
    }

    // ── SIGNAL 3: Intention category (weight 15) ──
    if (topIntention) {
      const intentionBoost = getIntentionBoost(topIntention, group.triggerType);
      score += Math.round(WEIGHT_INTENTION * intentionBoost);
      if (intentionBoost > 0) matchedSignals.push('intention');
    }

    // ── SIGNAL 4: Craving category (weight 10) ──
    if (topCraving) {
      const cravingBoost = getCravingBoost(topCraving, group.triggerType);
      score += Math.round(WEIGHT_CRAVING * cravingBoost);
      if (cravingBoost > 0) matchedSignals.push('craving');
    }

    // ── SIGNAL 5: Group health tie-breaker (weight 10) ──
    const healthScore = getGroupHealthScore(memberCount, group.maxMembers || 8);
    score += Math.round(WEIGHT_GROUP_HEALTH * healthScore);
    if (healthScore > 0.5) matchedSignals.push('healthy_group');

    // ── Diversity penalty ──
    if (peakHour !== null && peakHourMap) {
      const groupPeaks = peakHourMap.get(gid) || [];
      const sameCluster = groupPeaks.filter(h => Math.abs(h - peakHour) <= 1).length;
      if (sameCluster >= 3) {
        score -= 5; // Slight deprioritization for timezone clustering
      }
    }

    // Generate explanation
    const reason = generateReasonString(user, matchedSignals, group, peakHour, topIntention, topCraving, cravings);

    scored.push({
      group,
      score: Math.max(0, score),
      reason,
      matchedSignals,
      memberCount,
    });
  }

  // Sort by score descending, then by memberCount ascending (prefer less crowded)
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.memberCount - b.memberCount;
  });

  // Deduplicate by triggerType — show the best instance of each trigger type first
  const seen = new Set();
  const deduped = [];
  for (const item of scored) {
    const key = item.group.triggerType;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(item);
    } else {
      // Still add duplicates but after unique ones if we need more than 3
      deduped.push(item);
    }
  }

  return deduped.slice(0, 6); // Return top 6 (controller will slice to 3)
}

// ─── Recommendation Helpers ─────────────────────────────────────────────

function getHourBoostForTriggerType(peakHour, triggerType) {
  switch (triggerType) {
    case 'late_night':
      // 10PM-4AM → strong boost
      return (peakHour >= 22 || peakHour <= 4) ? 1.0 : 0;
    case 'morning':
      // 5AM-9AM → strong boost
      return (peakHour >= 5 && peakHour <= 9) ? 1.0 : 0;
    case 'boredom':
    case 'procrastination':
      // Afternoon scrolling 12PM-5PM → moderate boost
      return (peakHour >= 12 && peakHour <= 17) ? 0.5 : 0;
    default:
      return 0;
  }
}

function getIntentionBoost(topIntention, triggerType) {
  const stressIntentions = ['stress', 'stress_escape', 'anxiety', 'escape', 'relief'];
  const boredomIntentions = ['boredom', 'bored', 'nothing', 'killing_time', 'habit'];
  const procrastIntentions = ['procrastination', 'procrastinating', 'avoidance', 'distraction'];

  if (triggerType === 'stress' && stressIntentions.includes(topIntention)) return 1.0;
  if (triggerType === 'boredom' && boredomIntentions.includes(topIntention)) return 1.0;
  if (triggerType === 'procrastination' && procrastIntentions.includes(topIntention)) return 1.0;
  return 0;
}

function getCravingBoost(topCraving, triggerType) {
  const anxietyCravings = ['anxiety', 'stress', 'overwhelm', 'panic', 'nervous'];
  const boredomCravings = ['boredom', 'bored', 'restless', 'idle'];
  const habitCravings = ['habit', 'automatic', 'reflex', 'routine'];

  if (triggerType === 'stress' && anxietyCravings.includes(topCraving)) return 1.0;
  if (triggerType === 'boredom' && boredomCravings.includes(topCraving)) return 1.0;
  if (triggerType === 'procrastination' && habitCravings.includes(topCraving)) return 1.0;
  return 0;
}

function getGroupHealthScore(memberCount, maxMembers) {
  // Prefer groups with 4-7 members
  if (memberCount >= 4 && memberCount <= 7) return 1.0;
  // Groups with 2-3 are okay
  if (memberCount >= 2 && memberCount <= 3) return 0.7;
  // Empty or nearly empty — less appealing
  if (memberCount <= 1) return 0.3;
  // Almost full
  return 0.1;
}

function generateReasonString(user, matchedSignals, group, peakHour, topIntention, topCraving, cravings) {
  const parts = [];

  if (matchedSignals.includes('trigger_match') && matchedSignals.includes('peak_hour')) {
    const hourStr = formatHour(peakHour);
    parts.push(`Your scrolling peaks around ${hourStr} — this group tracks exactly that pattern.`);
  } else if (matchedSignals.includes('trigger_match')) {
    const triggerLabel = getTriggerLabel(group.triggerType);
    parts.push(`Your ${triggerLabel} scrolling pattern matches this group.`);
  } else if (matchedSignals.includes('peak_hour')) {
    const hourStr = formatHour(peakHour);
    parts.push(`Your peak scroll time is around ${hourStr} — fits this group's focus.`);
  }

  if (matchedSignals.includes('intention') && !matchedSignals.includes('trigger_match')) {
    parts.push(`Most of your scroll sessions start from ${topIntention} — these members understand that trigger.`);
  }

  if (matchedSignals.includes('craving')) {
    const resistedCount = (cravings || []).filter(c => c.outcome === 'resisted').length;
    if (resistedCount > 0) {
      parts.push(`You've resisted ${resistedCount} scroll urge${resistedCount > 1 ? 's' : ''} recently — this group will help reinforce that.`);
    }
  }

  if (parts.length === 0) {
    parts.push(`This group is a good fit based on your overall scrolling behavior.`);
  }

  return parts.join(' ');
}

function formatHour(hour) {
  if (hour === null || hour === undefined) return 'unknown time';
  if (hour === 0) return '12AM';
  if (hour === 12) return '12PM';
  if (hour < 12) return `${hour}AM`;
  return `${hour - 12}PM`;
}

function getTriggerLabel(triggerType) {
  const labels = {
    late_night: 'late-night',
    morning: 'morning',
    stress: 'stress-driven',
    boredom: 'boredom-driven',
    procrastination: 'procrastination',
    general: 'general',
  };
  return labels[triggerType] || triggerType;
}

// ─── Submission Streak Calculation ───────────────────────────────────────

/**
 * Calculate consecutive submission weeks ending at currentIsoWeek.
 *
 * @param {object[]} submissions – GroupSubmission docs for a user, sorted by isoWeek desc
 * @param {string}   currentIsoWeek – e.g. "2026-W16"
 * @returns {{ currentStreak: number, longestStreak: number }}
 */
function calculateSubmissionStreak(submissions, currentIsoWeek) {
  if (!submissions || submissions.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const submittedWeeks = new Set(submissions.map(s => s.isoWeek));

  let currentStreak = 0;
  let week = currentIsoWeek;

  // Walk backward checking if each week was submitted
  while (submittedWeeks.has(week)) {
    currentStreak++;
    week = getPreviousISOWeek(week);
    if (currentStreak > 52) break; // safety
  }

  // Longest streak — scan all submitted weeks sequentially
  let longest = 0;
  let tempStreak = 0;
  const sortedWeeks = [...submittedWeeks].sort();

  for (let i = 0; i < sortedWeeks.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const prevExpected = getPreviousISOWeek(sortedWeeks[i]);
      if (prevExpected === sortedWeeks[i - 1]) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }
    if (tempStreak > longest) longest = tempStreak;
  }

  return {
    currentStreak,
    longestStreak: Math.max(longest, currentStreak),
  };
}

// ─── Group Milestone Detection ──────────────────────────────────────────

/**
 * Detect group milestones reached this week.
 *
 * @param {{ submissionCount: number, memberCount: number, avgDeltaMinutes: number, improvingCount: number }} stats
 * @param {object[]} previousResults – past weekly result objects sorted by isoWeek asc
 * @returns {object[]} Array of { type, message, celebrationText }
 */
function detectGroupMilestones(stats, previousResults = []) {
  const milestones = [];
  const { submissionCount, memberCount, avgDeltaMinutes, improvingCount } = stats;
  const prev = previousResults || [];

  // 1. First week all members submitted
  if (submissionCount > 0 && submissionCount >= memberCount) {
    const hadAllBefore = prev.some(r => r.submissionCount >= r.memberCount);
    if (!hadAllBefore) {
      milestones.push({
        type: 'first_all_submitted',
        message: '🎯 MILESTONE: Every member submitted this week — the first time ever!',
        celebrationText: 'FULL PARTICIPATION UNLOCKED',
      });
    }
  }

  // 2. Three-week improvement streak (group avg negative 3 weeks in a row)
  if (prev.length >= 2) {
    const last3 = [...prev.slice(-2), { avgDeltaMinutes }];
    if (last3.length >= 3 && last3.every(r => r.avgDeltaMinutes < 0)) {
      milestones.push({
        type: 'three_week_improvement',
        message: '🔥 MILESTONE: The group improved 3 weeks in a row!',
        celebrationText: 'THREE-WEEK STREAK',
      });
    }
  }

  // 3. Collective 10 hours reclaimed (600 negative minutes)
  const totalPrev = prev.reduce((sum, r) => sum + (r.avgDeltaMinutes || 0) * (r.submissionCount || 1), 0);
  const totalNow = totalPrev + avgDeltaMinutes * submissionCount;
  if (totalNow <= -600 && totalPrev > -600) {
    milestones.push({
      type: 'collective_10_hours',
      message: '💪 MILESTONE: The group has collectively reclaimed over 10 hours!',
      celebrationText: '10 HOURS RECLAIMED',
    });
  }

  // 4. First time half are improving
  if (improvingCount > 0 && improvingCount > memberCount / 2) {
    const hadHalfBefore = prev.some(r => (r.improvingCount || 0) > (r.memberCount || 1) / 2);
    if (!hadHalfBefore) {
      milestones.push({
        type: 'half_improving',
        message: '📊 MILESTONE: More than half the group is improving!',
        celebrationText: 'MAJORITY IMPROVING',
      });
    }
  }

  return milestones;
}

// ─── Exports ────────────────────────────────────────────────────────────

module.exports = {
  generateAnonymousName,
  getCurrentISOWeek,
  getPreviousISOWeek,
  getWeekStartDate,
  calculateWeekOfMembership,
  calculateWeeklyDelta,
  recommendGroups,
  calculateSubmissionStreak,
  detectGroupMilestones,
  TRIGGER_MAP,
};
