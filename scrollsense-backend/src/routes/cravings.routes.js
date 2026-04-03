const express = require('express')
const router = express.Router()
const { logCraving, getRecentCravings, getCravingStats } = require('../controllers/cravings.controller')
const asyncHandler = require('../utils/asyncHandler')

router.post('/', asyncHandler(logCraving))
router.get('/recent', asyncHandler(getRecentCravings))
router.get('/stats', asyncHandler(getCravingStats))

module.exports = router