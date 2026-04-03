const router = require('express').Router();
const {
  connectYouTube,
  getYouTubeStatus,
  syncYouTube,
  disconnectYouTube,
} = require('../controllers/youtube.controller');

router.post('/connect', connectYouTube);
router.get('/status', getYouTubeStatus);
router.post('/sync', syncYouTube);
router.delete('/disconnect', disconnectYouTube);

module.exports = router;
