const express = require('express');
const router = express.Router();
const patternsController = require('../controllers/patterns.controller');

// GET /api/patterns/trigger-detector (F7)
router.get('/trigger-detector', patternsController.getTriggerPatterns);

// GET /api/patterns/echo-chamber (F8)
router.get('/echo-chamber', patternsController.getEchoChamberScore);

// POST /api/patterns/instagram-upload (F11)
router.post('/instagram-upload', patternsController.uploadInstagram);

// DELETE /api/patterns/instagram
router.delete('/instagram', patternsController.deleteInstagramData);

// GET /api/patterns/cross-platform (F11 read)
router.get('/cross-platform', patternsController.getCrossPlatform);

// GET /api/patterns/habit-nudge (F14)
router.get('/habit-nudge', patternsController.getHabitNudge);

// POST /api/patterns/habit-nudge/feedback (F14 feedback)
router.post('/habit-nudge/feedback', patternsController.postNudgeFeedback);

module.exports = router;