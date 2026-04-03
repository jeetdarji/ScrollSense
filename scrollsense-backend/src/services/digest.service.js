const { GoogleGenerativeAI } = require('@google/generative-ai');
const Session = require('../models/Session.model');
const BehaviorWeek = require('../models/BehaviorWeek.model');
const Intention = require('../models/Intention.model');
const User = require('../models/User.model');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Determines if a check-in should be generated for a user.
 * Triggers: 3 sessions logged OR 7 days since last digest.
 */
async function shouldGenerateCheckin(userId) {
  const sessionCount = await Session.countDocuments({ userId });

  if (sessionCount < 3) {
    return { should: false, reason: null, sessionsLogged: sessionCount };
  }

  // Check last check-in date from BehaviorWeek where digestSent=true
  const lastDigest = await BehaviorWeek.findOne(
    { userId, digestSent: true },
    { digestSentAt: 1 }
  ).sort({ digestSentAt: -1 });

  if (!lastDigest) {
    // First check-in ever
    return { should: true, reason: 'sessions', sessionsLogged: sessionCount };
  }

  // Check if 3+ new sessions since last digest
  const newSessions = await Session.countDocuments({
    userId,
    startTime: { $gt: lastDigest.digestSentAt },
  });

  if (newSessions >= 3) {
    return { should: true, reason: 'sessions', sessionsLogged: sessionCount };
  }

  // Check if 7+ days since last digest
  const daysSince = (Date.now() - lastDigest.digestSentAt.getTime()) / 86400000;
  if (daysSince >= 7) {
    return { should: true, reason: 'weekly', sessionsLogged: sessionCount };
  }

  return { should: false, reason: null, sessionsLogged: sessionCount };
}

/**
 * Generates the AI insight text for the check-in.
 * behaviorData contains only aggregated metadata — no titles.
 */
async function generateCheckinContent(userId, behaviorData) {
  const prompt = `You are a calm, non-judgmental behavioral awareness assistant. Generate ONE specific, actionable insight based on this user's scroll behavior data.

DATA:
- Total scroll time: ${behaviorData.totalScrollMinutes} minutes
- Goal-relevant content: ${behaviorData.goalPercent}%
- Most common trigger: ${behaviorData.mostCommonTrigger}
- Heaviest scroll day: ${behaviorData.heaviestScrollDay}
- Platform: YouTube ${behaviorData.platformBreakdown.youtube}%, Instagram ${behaviorData.platformBreakdown.instagram}%
- Sessions logged: ${behaviorData.sessionsCount}

TONE: Calm, honest, specific. Not preachy. Not generic.
Like a smart friend who noticed a pattern, not a wellness app.
ONE sentence max. No emojis. No "you should". Start with an observation.

Return ONLY the insight text. No quotes. No explanation.`;

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

/**
 * Assembles the complete check-in data object.
 * Matches the checkin shape in useYouTubeData mock exactly.
 */
async function buildCheckinPayload(userId) {
  const shouldResult = await shouldGenerateCheckin(userId);

  if (!shouldResult.should) {
    return {
      available: false,
      sessionsLogged: shouldResult.sessionsLogged,
    };
  }

  // Last 7 days date range
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Fetch all sessions in range
  const sessions = await Session.find({
    userId,
    startTime: { $gte: since },
  }).lean();

  // Previous period sessions (7-14 days ago) for comparison
  const prevSince = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const prevSessions = await Session.find({
    userId,
    startTime: { $gte: prevSince, $lt: since },
  }).lean();

  // Calculate all metrics
  const totalScrollMinutes = sessions.reduce(
    (s, x) => s + x.durationMinutes,
    0
  );
  const prevTotalMinutes = prevSessions.reduce(
    (s, x) => s + x.durationMinutes,
    0
  );
  const improvementMinutes = prevTotalMinutes - totalScrollMinutes;
  // positive = improvement (fewer minutes this period)

  const ytSessions = sessions.filter(
    (s) => s.platform === 'youtube' || s.platform === 'both'
  );
  const igSessions = sessions.filter(
    (s) => s.platform === 'instagram' || s.platform === 'both'
  );
  const ytMinutes = ytSessions.reduce(
    (s, x) => s + x.durationMinutes,
    0
  );
  const igMinutes = igSessions.reduce(
    (s, x) => s + x.durationMinutes,
    0
  );
  const totalPlatformMinutes = ytMinutes + igMinutes || 1; // avoid /0

  // Most common trigger from intentions
  const intentions = await Intention.find({
    userId,
    timestamp: { $gte: since },
  }).lean();

  const triggerCounts = intentions.reduce((acc, i) => {
    acc[i.intentionCategory] = (acc[i.intentionCategory] || 0) + 1;
    return acc;
  }, {});
  const mostCommonTrigger =
    Object.keys(triggerCounts).sort(
      (a, b) => triggerCounts[b] - triggerCounts[a]
    )[0] || 'NONE';

  // Heaviest scroll day
  const dayCounts = sessions.reduce((acc, s) => {
    const day = new Date(s.startTime)
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toUpperCase();
    acc[day] = (acc[day] || 0) + s.durationMinutes;
    return acc;
  }, {});
  const heaviestScrollDay =
    Object.keys(dayCounts).sort(
      (a, b) => dayCounts[b] - dayCounts[a]
    )[0] || 'N/A';

  // Get goal percent from latest BehaviorWeek
  const latestWeek = await BehaviorWeek.findOne({ userId })
    .sort({ weekStart: -1 })
    .lean();
  const goalPercent = latestWeek
    ? Math.round(latestWeek.careerRelevantPercent)
    : 0;

  // Time reclaimed = improvement vs daily limit baseline
  const user = await User.findById(userId)
    .select('dailyLimitMinutes interests')
    .lean();
  const dailyLimit = user?.dailyLimitMinutes || 90;
  const expectedWeekly = dailyLimit * 7;
  const timeReclaimedMinutes = Math.max(0, expectedWeekly - totalScrollMinutes);

  // Check if this is the first check-in
  const lastDigest = await BehaviorWeek.findOne(
    { userId, digestSent: true },
    { digestSentAt: 1 }
  ).sort({ digestSentAt: -1 });

  // Generate AI insight
  const behaviorData = {
    totalScrollMinutes,
    goalPercent,
    mostCommonTrigger,
    heaviestScrollDay,
    sessionsCount: sessions.length,
    platformBreakdown: {
      youtube: Math.round((ytMinutes / totalPlatformMinutes) * 100),
      instagram: Math.round((igMinutes / totalPlatformMinutes) * 100),
    },
  };

  let aiInsight;
  try {
    aiInsight = await generateCheckinContent(userId, behaviorData);
  } catch (err) {
    console.error('AI insight generation failed:', err.message);
    aiInsight =
      'Your scroll patterns are being tracked — check back after your next few sessions for a personalized insight.';
  }

  // Mark check-in as sent on current BehaviorWeek
  if (latestWeek) {
    await BehaviorWeek.findByIdAndUpdate(latestWeek._id, {
      digestSent: true,
      digestSentAt: new Date(),
    });
  }

  return {
    available: true,
    isFirstCheckin: !lastDigest,
    triggerReason: shouldResult.reason,
    sessionsLogged: shouldResult.sessionsLogged,
    generatedAt: new Date().toISOString(),
    totalScrollMinutes,
    platformBreakdown: behaviorData.platformBreakdown,
    goalPercent,
    improvementMinutes,
    mostCommonTrigger: mostCommonTrigger.toUpperCase(),
    heaviestScrollDay,
    timeReclaimedMinutes,
    aiInsight,
    interestBudgetStatus: `You stayed within budget on ${
      user?.interests?.filter((i) => i.dailyMinutes > 0).length || 0
    } interests this period.`,
  };
}

module.exports = {
  shouldGenerateCheckin,
  generateCheckinContent,
  buildCheckinPayload,
};
