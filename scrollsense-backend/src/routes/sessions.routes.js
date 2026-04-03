const express = require('express')
const router = express.Router()
const { logIntention, logSession, getTodaySessions, getSessionStats } = require('../controllers/sessions.controller')
const asyncHandler = require('../utils/asyncHandler')

router.post('/intention', asyncHandler(logIntention))
router.post('/log', asyncHandler(logSession))
router.get('/today', asyncHandler(getTodaySessions))
router.get('/stats', asyncHandler(getSessionStats))

module.exports = router