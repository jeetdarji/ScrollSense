const express = require('express');
const { getMe, updateInterests, deleteAccount } = require('../controllers/user.controller');

const router = express.Router();

router.get('/me', getMe);
router.put('/interests', updateInterests);
router.delete('/account', deleteAccount);

module.exports = router;