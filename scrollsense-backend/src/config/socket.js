/**
 * Socket.io Configuration — Centralized socket server initialization.
 *
 * Imported by server.js once to attach to the HTTP server.
 * Imported by controllers/services via getIO() and emitToGroup() to
 * broadcast events without circular dependency on server.js.
 */

const { Server } = require('socket.io');

let io = null;

/**
 * Initialize Socket.io on the given HTTP server.
 * Must be called exactly once during server startup.
 *
 * @param {import('http').Server} httpServer
 * @returns {import('socket.io').Server}
 */
function initSocket(httpServer) {
  if (io) {
    console.warn('[socket] initSocket called more than once — returning existing instance');
    return io;
  }

  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6, // 1 MB — enough for chat messages
    transports: ['websocket', 'polling'],
  });

  console.log('[socket] Socket.io server initialized');
  return io;
}

/**
 * Get the initialized Socket.io server instance.
 * Throws if called before initSocket().
 *
 * @returns {import('socket.io').Server}
 */
function getIO() {
  if (!io) {
    throw new Error('[socket] getIO() called before initSocket() — check server.js startup order');
  }
  return io;
}

/**
 * Broadcast an event to all sockets in a group room.
 *
 * @param {string} groupId — MongoDB ObjectId as string
 * @param {string} event — event name (e.g. 'new_message')
 * @param {object} data — payload
 */
function emitToGroup(groupId, event, data) {
  if (!io) {
    console.warn(`[socket] emitToGroup called before init — dropping event '${event}'`);
    return;
  }
  io.to(`group:${groupId.toString()}`).emit(event, data);
}

/**
 * Get count of connected sockets in a group room.
 *
 * @param {string} groupId
 * @returns {Promise<number>}
 */
async function getGroupRoomSize(groupId) {
  if (!io) return 0;
  const room = io.sockets.adapter.rooms.get(`group:${groupId.toString()}`);
  return room ? room.size : 0;
}

module.exports = { initSocket, getIO, emitToGroup, getGroupRoomSize };
