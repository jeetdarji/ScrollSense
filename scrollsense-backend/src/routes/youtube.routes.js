const router = require('express').Router();
const cors = require('cors');
const {
  connectYouTube,
  getYouTubeStatus,
  syncYouTube,
  disconnectYouTube,
  reportWatchTime,
} = require('../controllers/youtube.controller');

router.post('/connect', connectYouTube);
router.get('/status', getYouTubeStatus);
router.post('/sync', syncYouTube);
router.delete('/disconnect', disconnectYouTube);

// The watch-time endpoint is called by the browser extension.
// Extensions have a chrome-extension:// or moz-extension:// origin, which
// won't match the FRONTEND_URL in the global CORS config.
// We apply a per-route CORS override here to allow extension origins while
// still requiring a valid Bearer token (enforced by authMiddleware upstream).
const extensionCors = cors({
  origin: (origin, cb) => {
    // Allow: no origin (curl / Postman), frontend, Chrome extension, Firefox extension
    if (
      !origin ||
      origin === process.env.FRONTEND_URL ||
      origin.startsWith('chrome-extension://') ||
      origin.startsWith('moz-extension://')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'));
    }
  },
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

router.options('/watch-time', extensionCors); // preflight
router.post('/watch-time', extensionCors, reportWatchTime);

module.exports = router;
