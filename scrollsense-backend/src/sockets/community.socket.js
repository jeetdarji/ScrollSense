/**
 * Community Socket Handlers — All real-time event logic for group chat.
 *
 * Registered once during server startup via registerCommunityHandlers(io).
 * By the time handlers run, socket.user is guaranteed by socketAuth middleware.
 *
 * Room naming convention:
 *   Group rooms: 'group:' + groupId.toString()
 *   User rooms:  'user:' + userId.toString()
 */

const GroupMembership = require('../models/GroupMembership.model');
const GroupMessage = require('../models/GroupMessage.model');
const socketAuthMiddleware = require('../middleware/socketAuth.middleware');
const { setOnline, setOffline, getOnlineMembers } = require('../services/presence.service');

// ─── Constants ──────────────────────────────────────────────────────────
const MAX_MESSAGES_PER_GROUP = 200;
const MESSAGE_MAX_LENGTH = 500;
const MESSAGE_RATE_LIMIT = 10;     // per user per hour
const TYPING_TIMEOUT_MS = 3000;
const VALID_REACTIONS = ['fire', 'clap', 'heart', 'strong'];

// In-memory rate limiting: userId → array of timestamps
const messageRates = new Map();

// In-memory typing timeouts: `${groupId}:${anonymousName}` → timeoutId
const typingTimeouts = new Map();

/**
 * Check message rate limit for a user.
 * @param {string} userId
 * @returns {boolean} true if allowed, false if rate-limited
 */
function checkRate(userId) {
  const key = userId.toString();
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;

  let timestamps = messageRates.get(key) || [];
  // Clean expired entries
  timestamps = timestamps.filter(t => t > oneHourAgo);
  messageRates.set(key, timestamps);

  if (timestamps.length >= MESSAGE_RATE_LIMIT) {
    return false;
  }

  timestamps.push(now);
  return true;
}

/**
 * Sanitize chat message content.
 * @param {string} text
 * @returns {string}
 */
function sanitize(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/<[^>]*>/g, '').trim();
}

/**
 * Register all community Socket.io event handlers.
 * Called once from server.js after socket initialization.
 *
 * @param {import('socket.io').Server} io
 */
function registerCommunityHandlers(io) {
  // Apply JWT authentication middleware
  io.use(socketAuthMiddleware);

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();

    try {
      // Look up user's active group membership
      const membership = await GroupMembership.findOne({ userId: socket.user._id, isActive: true })
        .select('groupId anonymousName submissionStreak')
        .lean();

      if (!membership) {
        socket.emit('no_group');
        console.log(`[socket] User ${userId} connected — no active group`);
        // Still join user room for private events
        socket.join(`user:${userId}`);
        return;
      }

      const groupId = membership.groupId.toString();
      const anonName = membership.anonymousName;

      // Join rooms
      socket.join(`group:${groupId}`);
      socket.join(`user:${userId}`);

      // Store membership info on socket for quick access in handlers
      socket.membership = {
        groupId,
        anonymousName: anonName,
        submissionStreak: membership.submissionStreak || 0,
      };

      // Mark user online
      setOnline(groupId, anonName, socket.id);

      // Notify the group
      socket.to(`group:${groupId}`).emit('member_online', { anonymousName: anonName });

      // Send connection confirmation with membership info and online members
      socket.emit('connected', {
        groupId,
        anonymousName: anonName,
        onlineMembers: getOnlineMembers(groupId),
      });

      // Send last 50 messages as initial load
      const messages = await GroupMessage.find({ groupId: membership.groupId, isDeleted: false })
        .select('anonymousName content messageType sentAt streak reactions')
        .sort({ sentAt: -1 })
        .limit(50)
        .lean();

      socket.emit('initial_messages', {
        messages: messages.reverse().map(m => ({
          id: m._id,
          anonymousName: m.anonymousName,
          content: m.content,
          messageType: m.messageType || 'user',
          sentAt: m.sentAt,
          streak: m.streak || 0,
          reactions: m.reactions || { fire: 0, clap: 0, heart: 0, strong: 0 },
        })),
      });

      console.log(`[socket] User connected, in group ${groupId} as ${anonName}`);
    } catch (error) {
      console.error('[socket] Connection setup error:', error.message);
      socket.emit('error', { message: 'Failed to set up connection' });
    }

    // ═══════════════════════════════════════════════════════════════════
    // EVENT: send_message
    // ═══════════════════════════════════════════════════════════════════
    socket.on('send_message', async (payload) => {
      try {
        if (!socket.membership) {
          return socket.emit('error', { message: 'You are not in a group' });
        }

        const { content } = payload || {};

        // Validate content
        if (!content || typeof content !== 'string') {
          return socket.emit('error', { message: 'Message content is required' });
        }

        const sanitized = sanitize(content);

        if (sanitized.length === 0) {
          return socket.emit('error', { message: 'Message cannot be empty' });
        }

        if (sanitized.length > MESSAGE_MAX_LENGTH) {
          return socket.emit('error', { message: `Message too long (max ${MESSAGE_MAX_LENGTH} characters)` });
        }

        // Rate limit
        if (!checkRate(userId)) {
          return socket.emit('rate_limited', {
            message: `Slow down — max ${MESSAGE_RATE_LIMIT} messages per hour`,
          });
        }

        const { groupId, anonymousName, submissionStreak } = socket.membership;

        // Save message — NO userId stored
        const message = await GroupMessage.create({
          groupId,
          anonymousName,
          content: sanitized,
          messageType: 'user',
          sentAt: new Date(),
          streak: submissionStreak,
          isDeleted: false,
        });

        // FIFO cleanup
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

        const broadcastPayload = {
          id: message._id,
          anonymousName,
          content: sanitized,
          messageType: 'user',
          sentAt: message.sentAt,
          streak: submissionStreak,
          reactions: { fire: 0, clap: 0, heart: 0, strong: 0 },
        };

        // Broadcast to entire group room (including sender)
        io.to(`group:${groupId}`).emit('new_message', broadcastPayload);

        // Confirmation to sender
        socket.emit('message_sent', { id: message._id });
      } catch (error) {
        console.error('[socket] send_message error:', error.message);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ═══════════════════════════════════════════════════════════════════
    // EVENT: typing_start
    // ═══════════════════════════════════════════════════════════════════
    socket.on('typing_start', () => {
      if (!socket.membership) return;

      const { groupId, anonymousName } = socket.membership;
      const key = `${groupId}:${anonymousName}`;

      // Broadcast typing indicator to group (except sender)
      socket.to(`group:${groupId}`).emit('member_typing', { anonymousName });

      // Clear existing timeout and set new one
      if (typingTimeouts.has(key)) {
        clearTimeout(typingTimeouts.get(key));
      }

      const timeout = setTimeout(() => {
        socket.to(`group:${groupId}`).emit('member_stopped_typing', { anonymousName });
        typingTimeouts.delete(key);
      }, TYPING_TIMEOUT_MS);

      typingTimeouts.set(key, timeout);
    });

    // ═══════════════════════════════════════════════════════════════════
    // EVENT: typing_stop
    // ═══════════════════════════════════════════════════════════════════
    socket.on('typing_stop', () => {
      if (!socket.membership) return;

      const { groupId, anonymousName } = socket.membership;
      const key = `${groupId}:${anonymousName}`;

      // Clear typing timeout
      if (typingTimeouts.has(key)) {
        clearTimeout(typingTimeouts.get(key));
        typingTimeouts.delete(key);
      }

      socket.to(`group:${groupId}`).emit('member_stopped_typing', { anonymousName });
    });

    // ═══════════════════════════════════════════════════════════════════
    // EVENT: add_reaction
    // ═══════════════════════════════════════════════════════════════════
    socket.on('add_reaction', async (payload) => {
      try {
        if (!socket.membership) {
          return socket.emit('error', { message: 'You are not in a group' });
        }

        const { messageId, reaction } = payload || {};

        if (!messageId || !reaction) {
          return socket.emit('error', { message: 'messageId and reaction required' });
        }

        if (!VALID_REACTIONS.includes(reaction)) {
          return socket.emit('error', { message: `Invalid reaction. Allowed: ${VALID_REACTIONS.join(', ')}` });
        }

        const updateKey = `reactions.${reaction}`;
        const updated = await GroupMessage.findByIdAndUpdate(
          messageId,
          { $inc: { [updateKey]: 1 } },
          { new: true, select: 'reactions' }
        ).lean();

        if (!updated) {
          return socket.emit('error', { message: 'Message not found' });
        }

        io.to(`group:${socket.membership.groupId}`).emit('reaction_updated', {
          messageId,
          reactions: updated.reactions,
        });
      } catch (error) {
        console.error('[socket] add_reaction error:', error.message);
        socket.emit('error', { message: 'Failed to add reaction' });
      }
    });

    // ═══════════════════════════════════════════════════════════════════
    // EVENT: remove_reaction
    // ═══════════════════════════════════════════════════════════════════
    socket.on('remove_reaction', async (payload) => {
      try {
        if (!socket.membership) {
          return socket.emit('error', { message: 'You are not in a group' });
        }

        const { messageId, reaction } = payload || {};

        if (!messageId || !reaction || !VALID_REACTIONS.includes(reaction)) {
          return socket.emit('error', { message: 'Invalid payload' });
        }

        // Decrement but floor at 0
        const msg = await GroupMessage.findById(messageId).select('reactions').lean();
        if (!msg) {
          return socket.emit('error', { message: 'Message not found' });
        }

        const currentCount = (msg.reactions && msg.reactions[reaction]) || 0;
        if (currentCount <= 0) return;

        const updateKey = `reactions.${reaction}`;
        const updated = await GroupMessage.findByIdAndUpdate(
          messageId,
          { $inc: { [updateKey]: -1 } },
          { new: true, select: 'reactions' }
        ).lean();

        io.to(`group:${socket.membership.groupId}`).emit('reaction_updated', {
          messageId,
          reactions: updated.reactions,
        });
      } catch (error) {
        console.error('[socket] remove_reaction error:', error.message);
        socket.emit('error', { message: 'Failed to remove reaction' });
      }
    });

    // ═══════════════════════════════════════════════════════════════════
    // EVENT: load_more_messages
    // ═══════════════════════════════════════════════════════════════════
    socket.on('load_more_messages', async (payload) => {
      try {
        if (!socket.membership) {
          return socket.emit('error', { message: 'You are not in a group' });
        }

        const { before, limit: rawLimit } = payload || {};
        const limit = Math.min(Math.max(parseInt(rawLimit) || 50, 1), 50);

        const query = {
          groupId: socket.membership.groupId,
          isDeleted: false,
        };

        if (before) {
          query.sentAt = { $lt: new Date(before) };
        }

        const messages = await GroupMessage.find(query)
          .select('anonymousName content messageType sentAt streak reactions')
          .sort({ sentAt: -1 })
          .limit(limit + 1)
          .lean();

        const hasMore = messages.length > limit;
        const result = hasMore ? messages.slice(0, limit) : messages;

        socket.emit('messages_loaded', {
          messages: result.reverse().map(m => ({
            id: m._id,
            anonymousName: m.anonymousName,
            content: m.content,
            messageType: m.messageType || 'user',
            sentAt: m.sentAt,
            streak: m.streak || 0,
            reactions: m.reactions || { fire: 0, clap: 0, heart: 0, strong: 0 },
          })),
          hasMore,
        });
      } catch (error) {
        console.error('[socket] load_more_messages error:', error.message);
        socket.emit('error', { message: 'Failed to load messages' });
      }
    });

    // ═══════════════════════════════════════════════════════════════════
    // EVENT: join_group_room (after HTTP join)
    // ═══════════════════════════════════════════════════════════════════
    socket.on('join_group_room', async (payload) => {
      try {
        const { groupId } = payload || {};
        if (!groupId) {
          return socket.emit('error', { message: 'groupId required' });
        }

        // Verify membership
        const membership = await GroupMembership.findOne({
          userId: socket.user._id,
          groupId,
          isActive: true,
        }).select('anonymousName submissionStreak').lean();

        if (!membership) {
          return socket.emit('error', { message: 'You are not a member of this group' });
        }

        // Leave any previous group room
        if (socket.membership) {
          socket.leave(`group:${socket.membership.groupId}`);
          setOffline(socket.membership.groupId, socket.membership.anonymousName);
          socket.to(`group:${socket.membership.groupId}`).emit('member_offline', {
            anonymousName: socket.membership.anonymousName,
          });
        }

        // Join new room
        socket.join(`group:${groupId}`);
        socket.membership = {
          groupId: groupId.toString(),
          anonymousName: membership.anonymousName,
          submissionStreak: membership.submissionStreak || 0,
        };

        setOnline(groupId.toString(), membership.anonymousName, socket.id);

        socket.to(`group:${groupId}`).emit('member_online', {
          anonymousName: membership.anonymousName,
        });

        // Send initial messages
        const messages = await GroupMessage.find({ groupId, isDeleted: false })
          .select('anonymousName content messageType sentAt streak reactions')
          .sort({ sentAt: -1 })
          .limit(50)
          .lean();

        socket.emit('initial_messages', {
          messages: messages.reverse().map(m => ({
            id: m._id,
            anonymousName: m.anonymousName,
            content: m.content,
            messageType: m.messageType || 'user',
            sentAt: m.sentAt,
            streak: m.streak || 0,
            reactions: m.reactions || { fire: 0, clap: 0, heart: 0, strong: 0 },
          })),
        });

        socket.emit('connected', {
          groupId: groupId.toString(),
          anonymousName: membership.anonymousName,
          onlineMembers: getOnlineMembers(groupId.toString()),
        });

        console.log(`[socket] User joined group room ${groupId} as ${membership.anonymousName}`);
      } catch (error) {
        console.error('[socket] join_group_room error:', error.message);
        socket.emit('error', { message: 'Failed to join group room' });
      }
    });

    // ═══════════════════════════════════════════════════════════════════
    // EVENT: disconnect
    // ═══════════════════════════════════════════════════════════════════
    socket.on('disconnect', () => {
      if (socket.membership) {
        const { groupId, anonymousName } = socket.membership;

        // Clear any typing timeout
        const typingKey = `${groupId}:${anonymousName}`;
        if (typingTimeouts.has(typingKey)) {
          clearTimeout(typingTimeouts.get(typingKey));
          typingTimeouts.delete(typingKey);
        }

        // Remove from presence
        setOffline(groupId, anonymousName);

        // Notify group
        socket.to(`group:${groupId}`).emit('member_offline', { anonymousName });

        console.log(`[socket] User disconnected from group ${groupId} (${anonymousName})`);
      }
    });
  });

  console.log('[socket] Community handlers registered');
}

module.exports = { registerCommunityHandlers };
