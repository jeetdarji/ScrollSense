require('dotenv').config();
const { validateEnv } = require('./config/env');

// Validate env vars before running anything else
validateEnv();

const connectDB = require('./config/db');
const passport = require('passport');
require('./config/passport')(passport);

const app = require('./app');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  
  app.listen(PORT, () => {
    console.log(`ScrollSense API running on port ${PORT}`);
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