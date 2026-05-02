const express = require('express');
const router = express.Router();
const { getTimeRefund, getTrends } = require('../controllers/progress.controller');

router.get('/time-refund', getTimeRefund);
router.get('/trends', getTrends);

module.exports = router;
