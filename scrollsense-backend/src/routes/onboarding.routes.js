const express = require('express');
const { completeOnboarding } = require('../controllers/onboarding.controller');

const router = express.Router();

router.post('/', completeOnboarding);

module.exports = router;