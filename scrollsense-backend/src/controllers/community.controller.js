/**
 * Community Controller — All endpoints for anonymous accountability groups.
 *
 * Every response strips userId from public-facing data.
 * DeltaMinutes is always server-calculated, never accepted from client.
 */

const asyncHandler = require('../utils/asyncHandler');
const Group = require('../models/Group.model');
const GroupMembership = require('../models/GroupMembership.model');
const GroupSubmission = require('../models/GroupSubmission.model');
const GroupMessage = require('../models/GroupMessage.model');
const BehaviorWeek = require('../models/BehaviorWeek.model');
const BehaviorDay = require('../models/BehaviorDay.model');
const Session = require('../models/Session.model');
const Craving = require('../models/Craving.model');
const Intention = require('../models/Intention.model');

const { emitToGroup, getIO } = require('../config/socket');
const { getOnlineMembers } = require('../services/presence.service');

const {
  generateAnonymousName,
  getCurrentISOWeek,
  getPreviousISOWeek,
  getWeekStartDate,
  calculateWeekOfMembership,
  calculateWeeklyDelta,
  recommendGroups,
  calculateSubmissionStreak,
  detectGroupMilestones,
} = require('../services/community.service');

// ─── Constants ──────────────────────────────────────────────────────────
const MAX_GROUP_MEMBERS     = 8;
const SESSIONS_REQUIRED     = 3;
const MAX_MESSAGES_PER_GROUP = 200;
const MESSAGE_RATE_LIMIT    = 10;    // per user per hour per group
const MESSAGE_MAX_LENGTH    = 500;
const TREND_WEEKS           = 8;

// In-memory rate limit store: key = `${userId}:${groupId}`, value = { count, resetAt }
const messageRateLimits = new Map();

function checkMessageRateLimit(userId, groupId) {
  const key = `${userId}:${groupId}`;
  const now = Date.now();
  let entry = messageRateLimits.get(key);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + 60 * 60 * 1000 };
    messageRateLimits.set(key, entry);
  }

  if (entry.count >= MESSAGE_RATE_LIMIT) {
    return false;
  }

  entry.count++;
  return true;
}

// ─── Helper: Strip HTML tags from chat messages ─────────────────────────
function sanitizeMessage(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/<[^>]*>/g, '').trim();
}

// ─── Helper: Count sessions this ISO week ───────────────────────────────
async function countSessionsThisWeek(userId, isoWeek) {
  const weekStart = getWeekStartDate(isoWeek);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  return Session.countDocuments({
    userId,
    startTime: { $gte: weekStart, $lt: weekEnd },
  });
}

// ─── Helper: Get behavior weeks for delta calculation ───────────────────
async function getBehaviorWeeksForDelta(userId, isoWeek) {
  const currentWeekStart = getWeekStartDate(isoWeek);
  const prevIsoWeek = getPreviousISOWeek(isoWeek);
  const prevWeekStart = getWeekStartDate(prevIsoWeek);

  const [currentWeek, previousWeek] = await Promise.all([
    BehaviorWeek.findOne({ userId, weekStart: currentWeekStart })
      .select('totalScrollMinutes sessionsCount')
      .lean(),
    BehaviorWeek.findOne({ userId, weekStart: prevWeekStart })
      .select('totalScrollMinutes sessionsCount')
      .lean(),
  ]);

  // Fallback: if no BehaviorWeek for current week, try BehaviorDay
  let currentWeekDays = [];
  if (!currentWeek) {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const startStr = currentWeekStart.toISOString().split('T')[0];
    const endStr = weekEnd.toISOString().split('T')[0];

    currentWeekDays = await BehaviorDay.find({
      userId,
      date: { $gte: startStr, $lt: endStr },
    }).select('totalScrollMinutes').lean();
  }

  return { currentWeek, previousWeek, currentWeekDays };
}

// ═════════════════════════════════════════════════════════════════════════
// GET /api/community/my-group
// ═════════════════════════════════════════════════════════════════════════
const getMyGroup = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const isoWeek = getCurrentISOWeek();

  // 1. Find active membership
  const membership = await GroupMembership.findOne({ userId, isActive: true })
    .select('groupId anonymousName joinedAt')
    .lean();

  if (!membership) {
    return res.status(200).json({ hasMembership: false });
  }

  const groupId = membership.groupId;

  // 2. Fetch everything in parallel
  const [
    group,
    activeMemberDocs,
    weekSubmissions,
    sessionsThisWeek,
    trendSubmissions,
    recentMessages,
  ] = await Promise.all([
    Group.findById(groupId)
      .select('name triggerType description icon maxMembers isOpen')
      .lean(),

    GroupMembership.find({ groupId, isActive: true })
      .select('anonymousName submissionStreak')
      .lean(),

    GroupSubmission.find({ groupId, isoWeek })
      .select('anonymousName deltaMinutes percentChange userId')
      .sort({ deltaMinutes: 1 })
      .limit(MAX_GROUP_MEMBERS + 5) // small buffer
      .lean(),

    countSessionsThisWeek(userId, isoWeek),

    // Last N weeks of submissions for trend chart
    GroupSubmission.find({
      groupId,
      isoWeek: { $gte: getTrendStartWeek(isoWeek, TREND_WEEKS) },
    })
      .select('isoWeek deltaMinutes')
      .sort({ isoWeek: 1 })
      .limit(TREND_WEEKS * MAX_GROUP_MEMBERS)
      .lean(),

    // Last 50 messages for initial chat load
    GroupMessage.find({ groupId, isDeleted: false })
      .select('anonymousName content messageType sentAt streak reactions')
      .sort({ sentAt: -1 })
      .limit(50)
      .lean(),
  ]);

  const activeMembers = activeMemberDocs.length;

  if (!group) {
    return res.status(404).json({ error: 'Group not found', code: 'GROUP_NOT_FOUND' });
  }

  // 3. Check if user has submitted this week
  const userSubmission = weekSubmissions.find(s => s.userId.toString() === userId.toString());
  const hasSubmitted = !!userSubmission;

  // 4. Calculate pending delta if not submitted
  let pendingDelta = null;
  if (!hasSubmitted) {
    const { currentWeek, previousWeek, currentWeekDays } = await getBehaviorWeeksForDelta(userId, isoWeek);
    const delta = calculateWeeklyDelta(currentWeek, previousWeek, currentWeekDays);
    pendingDelta = delta.deltaMinutes;
  }

  // 5. Build submissions list (strip userId, add isYou + rank)
  const submissions = weekSubmissions.map((s, idx) => ({
    anonymousName: s.anonymousName,
    deltaMinutes: s.deltaMinutes,
    percentChange: s.percentChange || null,
    isYou: s.userId.toString() === userId.toString(),
    rank: idx + 1,
  }));

  // 6. Calculate group stats
  const submittedCount = submissions.length;
  const improvingCount = submissions.filter(s => s.deltaMinutes < 0).length;
  const groupAverageDelta = submittedCount > 0
    ? Math.round(submissions.reduce((sum, s) => sum + s.deltaMinutes, 0) / submittedCount)
    : 0;
  const bestDelta = submittedCount > 0
    ? Math.min(...submissions.map(s => s.deltaMinutes))
    : 0;

  // 7. Build trend data
  const groupTrend = buildGroupTrend(trendSubmissions, isoWeek);

  // 8. Build members list with online presence (no userId exposed)
  const onlineNames = getOnlineMembers(groupId.toString());
  const members = activeMemberDocs.map(m => ({
    anonymousName: m.anonymousName,
    isOnline: onlineNames.includes(m.anonymousName),
    submissionStreak: m.submissionStreak || 0,
  }));

  // 9. Build initial messages
  const messages = (recentMessages || []).reverse().map(m => ({
    id: m._id,
    anonymousName: m.anonymousName,
    content: m.content,
    messageType: m.messageType || 'user',
    sentAt: m.sentAt,
    streak: m.streak || 0,
    reactions: m.reactions || { fire: 0, clap: 0, heart: 0, strong: 0 },
  }));

  // 10. Response
  res.status(200).json({
    hasMembership: true,
    group: {
      id: group._id,
      name: group.name,
      triggerType: group.triggerType,
      description: group.description,
      icon: group.icon,
      memberCount: activeMembers,
    },
    membership: {
      anonymousName: membership.anonymousName,
      joinedAt: membership.joinedAt,
      weekOfMembership: calculateWeekOfMembership(membership.joinedAt),
    },
    currentWeek: {
      isoWeek,
      hasSubmitted,
      pendingDelta,
      sessionsThisWeek,
      sessionsRequired: SESSIONS_REQUIRED,
      canSubmit: !hasSubmitted && sessionsThisWeek >= SESSIONS_REQUIRED,
      submissions,
      groupStats: {
        groupAverageDelta,
        improvingCount,
        bestDelta,
        submittedCount,
        memberCount: activeMembers,
      },
    },
    groupTrend,
    members,
    messages,
  });
});

// ═════════════════════════════════════════════════════════════════════════
// GET /api/community/groups
// ═════════════════════════════════════════════════════════════════════════
const getAllGroups = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const isoWeek = getCurrentISOWeek();

  // 1. Fetch all groups
  const groups = await Group.find()
    .select('name triggerType description icon maxMembers isOpen instanceNum')
    .lean();

  // 2. Current user's group
  const userMembership = await GroupMembership.findOne({ userId, isActive: true })
    .select('groupId')
    .lean();

  const currentUserGroupId = userMembership ? userMembership.groupId.toString() : null;

  // 3. For each group: member count + weekly avg improvement
  const groupIds = groups.map(g => g._id);

  const [memberCounts, weekSubmissions] = await Promise.all([
    GroupMembership.aggregate([
      { $match: { groupId: { $in: groupIds }, isActive: true } },
      { $group: { _id: '$groupId', count: { $sum: 1 } } },
    ]),
    GroupSubmission.aggregate([
      { $match: { groupId: { $in: groupIds }, isoWeek } },
      { $group: {
        _id: '$groupId',
        avgDelta: { $avg: '$deltaMinutes' },
        count: { $sum: 1 },
      }},
    ]),
  ]);

  const memberCountMap = new Map(memberCounts.map(m => [m._id.toString(), m.count]));
  const weekStatsMap = new Map(weekSubmissions.map(w => [w._id.toString(), w]));

  // 4. Build response
  let totalMembers = 0;
  const groupList = groups.map(g => {
    const gid = g._id.toString();
    const memberCount = memberCountMap.get(gid) || 0;
    totalMembers += memberCount;
    const weekStats = weekStatsMap.get(gid);

    return {
      id: g._id,
      name: g.name,
      triggerType: g.triggerType,
      description: g.description,
      icon: g.icon,
      memberCount,
      maxMembers: g.maxMembers,
      isOpen: g.isOpen,
      isJoinable: memberCount < (g.maxMembers || MAX_GROUP_MEMBERS),
      isCurrentGroup: gid === currentUserGroupId,
      weeklyAvgImprovement: weekStats ? Math.round(weekStats.avgDelta) : 0,
      weeklySubmissionRate: weekStats && memberCount > 0
        ? Math.round((weekStats.count / memberCount) * 100)
        : 0,
    };
  });

  // Sort: joinable first, then by memberCount descending (active groups first)
  groupList.sort((a, b) => {
    if (a.isJoinable !== b.isJoinable) return a.isJoinable ? -1 : 1;
    return b.memberCount - a.memberCount;
  });

  res.status(200).json({
    groups: groupList,
    totalMembers,
    currentUserGroupId,
  });
});

// ═════════════════════════════════════════════════════════════════════════
// GET /api/community/recommendations
// ═════════════════════════════════════════════════════════════════════════
const getRecommendations = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Check if already in a group
  const existingMembership = await GroupMembership.findOne({ userId, isActive: true })
    .select('_id')
    .lean();

  if (existingMembership) {
    return res.status(200).json({ alreadyInGroup: true });
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Fetch behavioral data + groups in parallel
  const [behaviorWeeks, cravings, intentions, groups, memberCounts, memberPeaks] = await Promise.all([
    BehaviorWeek.find({ userId })
      .select('totalScrollMinutes peakScrollHour triggerPatterns sessionsCount weekStart')
      .sort({ weekStart: -1 })
      .limit(4)
      .lean(),

    Craving.find({ userId, timestamp: { $gte: thirtyDaysAgo } })
      .select('cravingCategory outcome')
      .limit(200)
      .lean(),

    Intention.find({ userId, timestamp: { $gte: thirtyDaysAgo } })
      .select('intentionCategory')
      .limit(200)
      .lean(),

    Group.find()
      .select('name triggerType description icon maxMembers isOpen instanceNum')
      .lean(),

    GroupMembership.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$groupId', count: { $sum: 1 } } },
    ]),

    // For diversity: get peak hours of existing members per group
    // by looking up their latest BehaviorWeek
    GroupMembership.aggregate([
      { $match: { isActive: true } },
      { $lookup: {
        from: 'behaviorweeks',
        let: { uid: '$userId' },
        pipeline: [
          { $match: { $expr: { $eq: ['$userId', '$$uid'] } } },
          { $sort: { weekStart: -1 } },
          { $limit: 1 },
          { $project: { peakScrollHour: 1 } },
        ],
        as: 'latest',
      }},
      { $unwind: { path: '$latest', preserveNullAndEmptyArrays: true } },
      { $group: {
        _id: '$groupId',
        peaks: { $push: '$latest.peakScrollHour' },
      }},
    ]),
  ]);

  const memberCountMap = new Map(memberCounts.map(m => [m._id.toString(), m.count]));
  const peakHourMap = new Map(memberPeaks.map(p => [p._id.toString(), p.peaks.filter(h => h !== null)]));

  const ranked = recommendGroups(req.user, behaviorWeeks, cravings, intentions, groups, memberCountMap, peakHourMap);

  const recommendations = ranked.slice(0, 3).map(r => ({
    groupId: r.group._id,
    groupName: r.group.name,
    triggerType: r.group.triggerType,
    description: r.group.description,
    icon: r.group.icon,
    memberCount: r.memberCount,
    maxMembers: r.group.maxMembers || MAX_GROUP_MEMBERS,
    matchScore: r.score,
    reason: r.reason,
    matchedSignals: r.matchedSignals,
  }));

  res.status(200).json({ recommendations });
});

// ═════════════════════════════════════════════════════════════════════════
// POST /api/community/join/:groupId
// ═════════════════════════════════════════════════════════════════════════
const joinGroup = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { groupId } = req.params;

  if (!groupId) {
    return res.status(400).json({ error: 'groupId is required', code: 'MISSING_GROUP_ID' });
  }

  // 1. Check for existing active membership
  const existing = await GroupMembership.findOne({ userId, isActive: true })
    .select('_id')
    .lean();

  if (existing) {
    return res.status(409).json({ error: 'You are already in a group. Leave first.', code: 'ALREADY_IN_GROUP' });
  }

  // 2. Fetch group
  const group = await Group.findById(groupId)
    .select('name triggerType description icon maxMembers isOpen')
    .lean();

  if (!group) {
    return res.status(404).json({ error: 'Group not found', code: 'GROUP_NOT_FOUND' });
  }

  // 3. Atomic member count check
  const activeCount = await GroupMembership.countDocuments({ groupId: group._id, isActive: true });

  if (activeCount >= (group.maxMembers || MAX_GROUP_MEMBERS)) {
    return res.status(409).json({ error: 'Group is full', code: 'GROUP_FULL' });
  }

  // 4. Get existing names in this group (active + retired) for exclusion
  const existingNames = await GroupMembership.find({ groupId: group._id })
    .select('anonymousName')
    .lean();

  const nameList = existingNames.map(m => m.anonymousName);
  const anonymousName = generateAnonymousName(nameList);

  // 5. Create membership (partial unique index prevents duplicates on race)
  let membership;
  try {
    membership = await GroupMembership.create({
      groupId: group._id,
      userId,
      anonymousName,
      joinedAt: new Date(),
      isActive: true,
      leftAt: null,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'You are already in a group. Leave first.', code: 'ALREADY_IN_GROUP' });
    }
    throw err;
  }

  // 6. Update group isOpen if now at capacity
  const newCount = activeCount + 1;
  if (newCount >= (group.maxMembers || MAX_GROUP_MEMBERS)) {
    await Group.findByIdAndUpdate(groupId, { isOpen: false });
  }

  // 7. Emit real-time member_joined event + system message
  const systemMsg = await GroupMessage.create({
    groupId: group._id,
    anonymousName: 'SYSTEM',
    content: 'A NEW MEMBER JOINED THE GROUP',
    messageType: 'system',
    sentAt: new Date(),
  });
  emitToGroup(groupId, 'member_joined', {
    memberCount: newCount,
    message: { id: systemMsg._id, anonymousName: 'SYSTEM', content: systemMsg.content, messageType: 'system', sentAt: systemMsg.sentAt },
  });
  console.log(`[community] user joined group ${group.name} as ${membership.anonymousName}`);

  res.status(201).json({
    membership: {
      anonymousName: membership.anonymousName,
      joinedAt: membership.joinedAt,
      group: {
        id: group._id,
        name: group.name,
        triggerType: group.triggerType,
        description: group.description,
        icon: group.icon,
        memberCount: newCount,
      },
    },
  });
});

// ═════════════════════════════════════════════════════════════════════════
// POST /api/community/submit-week
// ═════════════════════════════════════════════════════════════════════════
const submitWeek = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const isoWeek = getCurrentISOWeek();

  // 1. Find active membership
  const membership = await GroupMembership.findOne({ userId, isActive: true })
    .select('groupId anonymousName')
    .lean();

  if (!membership) {
    return res.status(400).json({ error: 'You are not in a group', code: 'NO_MEMBERSHIP' });
  }

  // 2. Check for duplicate submission
  const existingSub = await GroupSubmission.findOne({ userId, isoWeek })
    .select('_id')
    .lean();

  if (existingSub) {
    return res.status(409).json({ error: 'Already submitted this week', code: 'ALREADY_SUBMITTED' });
  }

  // 3. Check session count
  const sessionsThisWeek = await countSessionsThisWeek(userId, isoWeek);

  if (sessionsThisWeek < SESSIONS_REQUIRED) {
    return res.status(400).json({
      error: `Log at least ${SESSIONS_REQUIRED} sessions to submit`,
      code: 'INSUFFICIENT_SESSIONS',
      details: { sessionsThisWeek, sessionsRequired: SESSIONS_REQUIRED },
    });
  }

  // 4. Server-side delta calculation
  const { currentWeek, previousWeek, currentWeekDays } = await getBehaviorWeeksForDelta(userId, isoWeek);
  const delta = calculateWeeklyDelta(currentWeek, previousWeek, currentWeekDays);

  if (delta.deltaMinutes === null) {
    return res.status(400).json({
      error: 'Not enough behavior data to calculate your weekly delta',
      code: 'NO_BEHAVIOR_DATA',
    });
  }

  // 5. Create submission
  const submission = await GroupSubmission.create({
    groupId: membership.groupId,
    userId,
    anonymousName: membership.anonymousName,
    isoWeek,
    deltaMinutes: delta.deltaMinutes,
    percentChange: delta.percentChange,
    baselineMinutes: delta.baselineMinutes,
    sessionsThisWeek,
  });

  // 6. Update submission streak
  const allUserSubs = await GroupSubmission.find({ userId })
    .select('isoWeek')
    .sort({ isoWeek: -1 })
    .lean();
  const streakResult = calculateSubmissionStreak(allUserSubs, isoWeek);
  await GroupMembership.findOneAndUpdate(
    { userId, isActive: true },
    { submissionStreak: streakResult.currentStreak, longestStreak: streakResult.longestStreak }
  );

  // 7. Count submissions this week for system message
  const totalSubmitted = await GroupSubmission.countDocuments({ groupId: membership.groupId, isoWeek });
  const totalMembers = await GroupMembership.countDocuments({ groupId: membership.groupId, isActive: true });

  // 8. Emit submission_received event + system message
  const sysContent = `${membership.anonymousName} submitted their number this week. ${totalSubmitted} of ${totalMembers} submitted.`;
  const sysMsg = await GroupMessage.create({
    groupId: membership.groupId,
    anonymousName: 'SYSTEM',
    content: sysContent,
    messageType: 'system',
    sentAt: new Date(),
  });
  emitToGroup(membership.groupId, 'submission_received', {
    anonymousName: membership.anonymousName,
    submittedCount: totalSubmitted,
    memberCount: totalMembers,
    message: { id: sysMsg._id, anonymousName: 'SYSTEM', content: sysContent, messageType: 'system', sentAt: sysMsg.sentAt },
  });
  console.log(`[community] submission for week ${isoWeek}: delta ${delta.deltaMinutes} min`);

  // 9. Check for group milestones
  const improvingCount = await GroupSubmission.countDocuments({
    groupId: membership.groupId, isoWeek, deltaMinutes: { $lt: 0 },
  });
  const weekSubs = await GroupSubmission.find({ groupId: membership.groupId, isoWeek })
    .select('deltaMinutes').lean();
  const avgDelta = weekSubs.length > 0
    ? Math.round(weekSubs.reduce((s, sub) => s + sub.deltaMinutes, 0) / weekSubs.length)
    : 0;

  const startWeek = getTrendStartWeek(isoWeek, TREND_WEEKS);
  const prevTrendSubs = await GroupSubmission.find({
    groupId: membership.groupId,
    isoWeek: { $gte: startWeek, $lt: isoWeek },
  }).select('isoWeek deltaMinutes').lean();

  // Build previous weekly results for milestone detection
  const prevWeekMap = new Map();
  for (const s of prevTrendSubs) {
    if (!prevWeekMap.has(s.isoWeek)) prevWeekMap.set(s.isoWeek, []);
    prevWeekMap.get(s.isoWeek).push(s.deltaMinutes);
  }
  const prevResults = [...prevWeekMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([wk, deltas]) => ({
    isoWeek: wk,
    avgDeltaMinutes: Math.round(deltas.reduce((s, d) => s + d, 0) / deltas.length),
    submissionCount: deltas.length,
    memberCount: totalMembers,
    improvingCount: deltas.filter(d => d < 0).length,
  }));

  const milestones = detectGroupMilestones(
    { submissionCount: totalSubmitted, memberCount: totalMembers, avgDeltaMinutes: avgDelta, improvingCount },
    prevResults
  );

  for (const ms of milestones) {
    const msMsg = await GroupMessage.create({
      groupId: membership.groupId,
      anonymousName: 'SYSTEM',
      content: ms.message,
      messageType: 'milestone',
      sentAt: new Date(),
    });
    emitToGroup(membership.groupId, 'group_milestone', {
      type: ms.type,
      celebrationText: ms.celebrationText,
      message: { id: msMsg._id, anonymousName: 'SYSTEM', content: ms.message, messageType: 'milestone', sentAt: msMsg.sentAt },
    });
    console.log(`[community] milestone reached: ${ms.type}`);
  }

  res.status(201).json({
    submission: {
      anonymousName: submission.anonymousName,
      deltaMinutes: submission.deltaMinutes,
      percentChange: submission.percentChange,
      isoWeek: submission.isoWeek,
    },
  });
});

// ═════════════════════════════════════════════════════════════════════════
// POST /api/community/leave
// ═════════════════════════════════════════════════════════════════════════
const leaveGroup = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const membership = await GroupMembership.findOne({ userId, isActive: true });

  if (!membership) {
    return res.status(400).json({ error: 'You are not in a group', code: 'NO_MEMBERSHIP' });
  }

  const groupId = membership.groupId;
  const anonName = membership.anonymousName;

  // Deactivate membership
  membership.isActive = false;
  membership.leftAt = new Date();
  await membership.save();

  // Re-open group if it was at capacity
  const remainingCount = await GroupMembership.countDocuments({ groupId, isActive: true });
  const group = await Group.findById(groupId).select('maxMembers isOpen').lean();

  if (group && !group.isOpen && remainingCount < (group.maxMembers || MAX_GROUP_MEMBERS)) {
    await Group.findByIdAndUpdate(groupId, { isOpen: true });
  }

  // Emit member_left event + system message
  const sysMsg = await GroupMessage.create({
    groupId,
    anonymousName: 'SYSTEM',
    content: 'A MEMBER HAS LEFT THE GROUP',
    messageType: 'system',
    sentAt: new Date(),
  });
  emitToGroup(groupId, 'member_left', {
    memberCount: remainingCount,
    message: { id: sysMsg._id, anonymousName: 'SYSTEM', content: sysMsg.content, messageType: 'system', sentAt: sysMsg.sentAt },
  });
  // Force-disconnect leaving user from socket room (emit to user-specific room, not group)
  try {
    const io = getIO();
    io.to(`user:${userId.toString()}`).emit('force_leave_room');
  } catch (_) { /* socket not initialized */ }

  res.status(200).json({
    success: true,
    message: 'Your anonymous name is retired. You can join a new group anytime.',
  });
});

// ═════════════════════════════════════════════════════════════════════════
// GET /api/community/messages/:groupId
// ═════════════════════════════════════════════════════════════════════════
const getMessages = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { groupId } = req.params;
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const before = req.query.before ? new Date(req.query.before) : null;

  // Verify membership
  const membership = await GroupMembership.findOne({ userId, groupId, isActive: true })
    .select('_id anonymousName')
    .lean();

  if (!membership) {
    return res.status(403).json({ error: 'You are not a member of this group', code: 'NOT_A_MEMBER' });
  }

  // Build query
  const query = { groupId, isDeleted: false };
  if (before) {
    query.sentAt = { $lt: before };
  }

  const messages = await GroupMessage.find(query)
    .select('anonymousName content messageType sentAt streak reactions')
    .sort({ sentAt: -1 })
    .limit(limit + 1) // fetch one extra to detect hasMore
    .lean();

  const hasMore = messages.length > limit;
  const result = hasMore ? messages.slice(0, limit) : messages;

  res.status(200).json({
    messages: result.map(m => ({
      id: m._id,
      anonymousName: m.anonymousName,
      content: m.content,
      messageType: m.messageType || 'user',
      sentAt: m.sentAt,
      streak: m.streak || 0,
      reactions: m.reactions || { fire: 0, clap: 0, heart: 0, strong: 0 },
    })),
    hasMore,
    myAnonymousName: membership.anonymousName,
  });
});

// ═════════════════════════════════════════════════════════════════════════
// POST /api/community/messages/:groupId
// ═════════════════════════════════════════════════════════════════════════
const sendMessage = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { groupId } = req.params;
  const { content } = req.body;

  // Validate content
  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'Message content is required', code: 'MISSING_CONTENT' });
  }

  const sanitized = sanitizeMessage(content);

  if (sanitized.length === 0) {
    return res.status(400).json({ error: 'Message cannot be empty', code: 'EMPTY_CONTENT' });
  }

  if (sanitized.length > MESSAGE_MAX_LENGTH) {
    return res.status(400).json({
      error: `Message too long (max ${MESSAGE_MAX_LENGTH} characters)`,
      code: 'CONTENT_TOO_LONG',
    });
  }

  // Verify membership
  const membership = await GroupMembership.findOne({ userId, groupId, isActive: true })
    .select('anonymousName submissionStreak')
    .lean();

  if (!membership) {
    return res.status(403).json({ error: 'You are not a member of this group', code: 'NOT_A_MEMBER' });
  }

  // Rate limit
  if (!checkMessageRateLimit(userId.toString(), groupId)) {
    return res.status(429).json({
      error: `Slow down — max ${MESSAGE_RATE_LIMIT} messages per hour`,
      code: 'RATE_LIMITED',
    });
  }

  // Get streak for badge (from same membership doc)
  const streak = membership.submissionStreak || 0;

  // Create message — NO userId stored
  const message = await GroupMessage.create({
    groupId,
    anonymousName: membership.anonymousName,
    content: sanitized,
    messageType: 'user',
    sentAt: new Date(),
    isDeleted: false,
    streak,
  });

  // FIFO cleanup: if group has too many messages, delete oldest
  const totalMessages = await GroupMessage.countDocuments({ groupId });
  if (totalMessages > MAX_MESSAGES_PER_GROUP) {
    const excess = totalMessages - MAX_MESSAGES_PER_GROUP;
    const oldest = await GroupMessage.find({ groupId })
      .select('_id')
      .sort({ sentAt: 1 })
      .limit(excess)
      .lean();

    if (oldest.length > 0) {
      await GroupMessage.deleteMany({ _id: { $in: oldest.map(m => m._id) } });
    }
  }

  // Broadcast via Socket.io
  const broadcastPayload = {
    id: message._id,
    anonymousName: message.anonymousName,
    content: message.content,
    messageType: 'user',
    sentAt: message.sentAt,
    streak,
    reactions: { fire: 0, clap: 0, heart: 0, strong: 0 },
  };
  emitToGroup(groupId, 'new_message', broadcastPayload);

  res.status(201).json({ message: broadcastPayload });
});

// ═════════════════════════════════════════════════════════════════════════
// DELETE /api/community/messages/:messageId
// ═════════════════════════════════════════════════════════════════════════
const deleteMessage = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { messageId } = req.params;

  // Find the message
  const message = await GroupMessage.findById(messageId)
    .select('groupId anonymousName isDeleted')
    .lean();

  if (!message) {
    return res.status(404).json({ error: 'Message not found', code: 'MESSAGE_NOT_FOUND' });
  }

  if (message.isDeleted) {
    return res.status(400).json({ error: 'Message already deleted', code: 'ALREADY_DELETED' });
  }

  // Verify membership in the same group
  const membership = await GroupMembership.findOne({
    userId,
    groupId: message.groupId,
    isActive: true,
  }).select('anonymousName').lean();

  if (!membership) {
    return res.status(403).json({ error: 'You are not a member of this group', code: 'NOT_A_MEMBER' });
  }

  // Verify ownership via anonymousName match
  if (membership.anonymousName !== message.anonymousName) {
    return res.status(403).json({ error: 'You can only delete your own messages', code: 'NOT_YOUR_MESSAGE' });
  }

  // Soft delete
  await GroupMessage.findByIdAndUpdate(messageId, { isDeleted: true });

  // Broadcast deletion via Socket.io
  emitToGroup(message.groupId, 'message_deleted', { messageId });

  res.status(200).json({ success: true });
});

// ═════════════════════════════════════════════════════════════════════════
// POST /api/community/request-new-group
// ═════════════════════════════════════════════════════════════════════════
const requestNewGroup = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // 1. Leave current group if any
  const membership = await GroupMembership.findOne({ userId, isActive: true });

  if (membership) {
    const groupId = membership.groupId;
    membership.isActive = false;
    membership.leftAt = new Date();
    await membership.save();

    // Re-open group if needed
    const remainingCount = await GroupMembership.countDocuments({ groupId, isActive: true });
    const group = await Group.findById(groupId).select('maxMembers isOpen').lean();

    if (group && !group.isOpen && remainingCount < (group.maxMembers || MAX_GROUP_MEMBERS)) {
      await Group.findByIdAndUpdate(groupId, { isOpen: true });
    }
  }

  // 2. Return fresh recommendations (reuse getRecommendations logic)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [behaviorWeeks, cravings, intentions, groups, memberCounts, memberPeaks] = await Promise.all([
    BehaviorWeek.find({ userId })
      .select('totalScrollMinutes peakScrollHour triggerPatterns sessionsCount weekStart')
      .sort({ weekStart: -1 })
      .limit(4)
      .lean(),
    Craving.find({ userId, timestamp: { $gte: thirtyDaysAgo } })
      .select('cravingCategory outcome')
      .limit(200)
      .lean(),
    Intention.find({ userId, timestamp: { $gte: thirtyDaysAgo } })
      .select('intentionCategory')
      .limit(200)
      .lean(),
    Group.find()
      .select('name triggerType description icon maxMembers isOpen instanceNum')
      .lean(),
    GroupMembership.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$groupId', count: { $sum: 1 } } },
    ]),
    GroupMembership.aggregate([
      { $match: { isActive: true } },
      { $lookup: {
        from: 'behaviorweeks',
        let: { uid: '$userId' },
        pipeline: [
          { $match: { $expr: { $eq: ['$userId', '$$uid'] } } },
          { $sort: { weekStart: -1 } },
          { $limit: 1 },
          { $project: { peakScrollHour: 1 } },
        ],
        as: 'latest',
      }},
      { $unwind: { path: '$latest', preserveNullAndEmptyArrays: true } },
      { $group: {
        _id: '$groupId',
        peaks: { $push: '$latest.peakScrollHour' },
      }},
    ]),
  ]);

  const memberCountMap = new Map(memberCounts.map(m => [m._id.toString(), m.count]));
  const peakHourMap = new Map(memberPeaks.map(p => [p._id.toString(), p.peaks.filter(h => h !== null)]));
  const ranked = recommendGroups(req.user, behaviorWeeks, cravings, intentions, groups, memberCountMap, peakHourMap);

  const recommendations = ranked.slice(0, 3).map(r => ({
    groupId: r.group._id,
    groupName: r.group.name,
    triggerType: r.group.triggerType,
    description: r.group.description,
    icon: r.group.icon,
    memberCount: r.memberCount,
    maxMembers: r.group.maxMembers || MAX_GROUP_MEMBERS,
    matchScore: r.score,
    reason: r.reason,
    matchedSignals: r.matchedSignals,
  }));

  res.status(200).json({
    leftPreviousGroup: !!membership,
    recommendations,
  });
});

// ─── Trend Helpers ──────────────────────────────────────────────────────

function getTrendStartWeek(currentIsoWeek, weekCount) {
  let week = currentIsoWeek;
  for (let i = 0; i < weekCount; i++) {
    week = getPreviousISOWeek(week);
  }
  return week;
}

function buildGroupTrend(submissions, currentIsoWeek) {
  if (!submissions || submissions.length === 0) return [];

  // Group submissions by isoWeek
  const weekMap = new Map();
  for (const sub of submissions) {
    if (!weekMap.has(sub.isoWeek)) {
      weekMap.set(sub.isoWeek, []);
    }
    weekMap.get(sub.isoWeek).push(sub.deltaMinutes);
  }

  // Build trend array sorted by week
  const trend = [];
  const sortedWeeks = [...weekMap.keys()].sort();

  for (let i = 0; i < sortedWeeks.length; i++) {
    const week = sortedWeeks[i];
    const deltas = weekMap.get(week);
    const avgDelta = Math.round(deltas.reduce((s, d) => s + d, 0) / deltas.length);

    trend.push({
      isoWeek: week,
      weekLabel: `W${i + 1}`,
      avgDelta,
      submissionCount: deltas.length,
    });
  }

  return trend;
}

// ═════════════════════════════════════════════════════════════════════════
// POST /api/community/react/:messageId
// ═════════════════════════════════════════════════════════════════════════
const VALID_REACTIONS = ['fire', 'clap', 'heart', 'strong'];

const addReaction = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { messageId } = req.params;
  const { reaction, action } = req.body;

  if (!reaction || !VALID_REACTIONS.includes(reaction)) {
    return res.status(400).json({ error: `Invalid reaction. Allowed: ${VALID_REACTIONS.join(', ')}`, code: 'INVALID_REACTION' });
  }

  if (!action || !['add', 'remove'].includes(action)) {
    return res.status(400).json({ error: 'Action must be add or remove', code: 'INVALID_ACTION' });
  }

  // Verify user is in a group
  const membership = await GroupMembership.findOne({ userId, isActive: true })
    .select('groupId')
    .lean();

  if (!membership) {
    return res.status(403).json({ error: 'You are not in a group', code: 'NO_MEMBERSHIP' });
  }

  const updateKey = `reactions.${reaction}`;
  const increment = action === 'add' ? 1 : -1;

  if (action === 'remove') {
    // Floor at 0
    const msg = await GroupMessage.findById(messageId).select('reactions').lean();
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    const currentCount = (msg.reactions && msg.reactions[reaction]) || 0;
    if (currentCount <= 0) {
      return res.status(200).json({ reactions: msg.reactions });
    }
  }

  const updated = await GroupMessage.findByIdAndUpdate(
    messageId,
    { $inc: { [updateKey]: increment } },
    { new: true, select: 'reactions groupId' }
  ).lean();

  if (!updated) {
    return res.status(404).json({ error: 'Message not found', code: 'MESSAGE_NOT_FOUND' });
  }

  // Broadcast to group
  emitToGroup(updated.groupId, 'reaction_updated', {
    messageId,
    reactions: updated.reactions,
  });

  res.status(200).json({ reactions: updated.reactions });
});

// ─── Exports ────────────────────────────────────────────────────────────

module.exports = {
  getMyGroup,
  getAllGroups,
  getRecommendations,
  joinGroup,
  submitWeek,
  leaveGroup,
  getMessages,
  sendMessage,
  deleteMessage,
  requestNewGroup,
  addReaction,
};

