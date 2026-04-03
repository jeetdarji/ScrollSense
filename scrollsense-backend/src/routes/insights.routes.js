const router = require('express').Router();
const {
  getDashboard,
  getInterestBudgets,
} = require('../controllers/insights.controller');

router.get('/dashboard', getDashboard);
router.get('/interest-budgets', getInterestBudgets);

module.exports = router;
