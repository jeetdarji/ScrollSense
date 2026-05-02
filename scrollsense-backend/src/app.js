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
  origin: (origin, callback) => {
    // Allow frontend URL, Vercel preview/branch URLs, browser extensions, and requests with no origin
    if (!origin || 
        origin === process.env.FRONTEND_URL || 
        origin.endsWith('.vercel.app') ||
        origin.startsWith('chrome-extension://') || 
        origin.startsWith('moz-extension://')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
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

const patternsRouter = require('./routes/patterns.routes');
// Instagram upload payloads (aggregated from 3000-4000 entries) can reach ~25KB.
// The global 10kb limit would reject them. Route-specific override keeps other
// routes protected while allowing larger Instagram payloads.
app.use('/api/patterns', authMiddleware, express.json({ limit: '500kb' }), patternsRouter);

const progressRouter = require('./routes/progress.routes');
app.use('/api/progress', authMiddleware, progressRouter);

const communityRouter = require('./routes/community.routes');
app.use('/api/community', authMiddleware, communityRouter);

app.get('/health', (req, res) => res.json({ 
  status: 'ok', 
  timestamp: new Date().toISOString(),
  environment: process.env.NODE_ENV,
}));

app.use(errorHandler);

module.exports = app;