const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const passport = require('passport');
const rateLimit = require('express-rate-limit');

const authRouter = require('./routes/auth.routes');
const userRouter = require('./routes/user.routes');
const onboardingRouter = require('./routes/onboarding.routes');

const authMiddleware = require('./middleware/auth.middleware');
const errorHandler = require('./middleware/errorHandler.middleware');

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(cookieParser());
app.use(passport.initialize()); // session: false everywhere

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth', authLimiter, authRouter);
app.use('/api/user', authMiddleware, userRouter);
app.use('/api/onboarding', authMiddleware, onboardingRouter);

const sessionsRouter = require('./routes/sessions.routes');
const cravingsRouter = require('./routes/cravings.routes');
app.use('/api/sessions', authMiddleware, sessionsRouter);
app.use('/api/cravings', authMiddleware, cravingsRouter);

const youtubeRouter  = require('./routes/youtube.routes');
const insightsRouter = require('./routes/insights.routes');
const digestRouter   = require('./routes/digest.routes');
const dailyRouter    = require('./routes/daily.routes');

app.use('/api/youtube',  authMiddleware, youtubeRouter);
app.use('/api/insights', authMiddleware, insightsRouter);
app.use('/api/digest',   authMiddleware, digestRouter);
app.use('/api/daily',    authMiddleware, dailyRouter);

app.get('/health', (req, res) => res.json({ 
  status: 'ok', 
  timestamp: new Date().toISOString(),
  environment: process.env.NODE_ENV,
}));

app.use(errorHandler);

module.exports = app;