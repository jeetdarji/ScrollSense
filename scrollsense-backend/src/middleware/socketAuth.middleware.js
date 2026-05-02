/**
 * Socket.io Authentication Middleware — JWT-validated WebSocket connections.
 *
 * Runs on every socket connection attempt via io.use().
 * Extracts the access token from handshake, verifies it, and attaches
 * the full user document to socket.user.
 *
 * If authentication fails, the connection is rejected before any event
 * handlers run.
 */

const { verifyAccessToken } = require('../utils/jwt.utils');
const User = require('../models/User.model');

/**
 * Socket.io authentication middleware.
 * Usage: io.use(socketAuthMiddleware)
 *
 * @param {import('socket.io').Socket} socket
 * @param {Function} next
 */
async function socketAuthMiddleware(socket, next) {
  try {
    // 1. Extract token — prefer handshake auth, fall back to header
    let token = null;

    if (socket.handshake.auth && socket.handshake.auth.token) {
      token = socket.handshake.auth.token;
    } else if (socket.handshake.headers.authorization) {
      const authHeader = socket.handshake.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      return next(new Error('Authentication failed: no token provided'));
    }

    // 2. Verify the JWT
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new Error('Authentication failed: token expired'));
      }
      return next(new Error('Authentication failed: invalid token'));
    }

    // 3. Fetch user from database
    const user = await User.findById(decoded.sub).select('_id email displayName isActive scrollTriggers');

    if (!user) {
      return next(new Error('Authentication failed: user not found'));
    }

    if (!user.isActive) {
      return next(new Error('Authentication failed: account deactivated'));
    }

    // 4. Attach user to socket — available in all event handlers
    socket.user = user;
    next();
  } catch (error) {
    console.error('[socket] Auth middleware error:', error.message);
    next(new Error('Authentication failed'));
  }
}

module.exports = socketAuthMiddleware;
