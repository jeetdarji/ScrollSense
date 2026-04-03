const router = require('express').Router();
const {
  getCheckin,
  getCheckinStatus,
} = require('../controllers/digest.controller');

router.get('/checkin', getCheckin);
router.get('/status', getCheckinStatus);

module.exports = router;
