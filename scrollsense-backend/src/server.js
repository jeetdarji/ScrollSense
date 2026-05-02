require('dotenv').config();
const { validateEnv } = require('./config/env');

// Validate env vars before running anything else
validateEnv();

const http = require('http');
const connectDB = require('./config/db');
const passport = require('passport');
require('./config/passport')(passport);

const app = require('./app');
const { initSocket } = require('./config/socket');
const { registerCommunityHandlers } = require('./sockets/community.socket');

// Initialize scheduler for automated background updates
require('./jobs/scheduler');
// Register queue processors so workers are active at startup
require('./jobs/classification.job');
require('./jobs/digest.job');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  // Create raw HTTP server from Express app — required for Socket.io
  const server = http.createServer(app);

  // Initialize Socket.io on the HTTP server
  const io = initSocket(server);

  // Register real-time community event handlers
  registerCommunityHandlers(io);

  server.listen(PORT, () => {
    console.log(`ScrollSense API running on port ${PORT}`);
    console.log(`[socket] WebSocket server ready on port ${PORT}`);
  });
};

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down...');
  console.error(err.name, err.message, err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! Shutting down...');
  console.error(err);
  process.exit(1);
});

startServer();