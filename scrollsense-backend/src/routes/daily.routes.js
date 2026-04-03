const express = require('express');
const { getWeekData } = require('../controllers/daily.controller');
const router = express.Router();

router.get('/week', getWeekData);

module.exports = router;
