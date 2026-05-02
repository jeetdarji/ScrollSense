const express = require('express');
const { 
  getMe, 
  updateInterests, 
  getSettings,
  updateSettings,
  updateNotifications,
  getDataVault,
  deleteInstagramData,
  deleteAccount 
} = require('../controllers/user.controller');

const router = express.Router();

router.get('/me', getMe);
router.put('/interests', updateInterests);

// Settings
router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.put('/notifications', updateNotifications);
router.get('/data-vault', getDataVault);

// Account deletion / data
router.delete('/instagram-data', deleteInstagramData);
router.delete('/account', deleteAccount);

module.exports = router;