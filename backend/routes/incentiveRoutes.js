const express = require('express');
const router = express.Router();
const {
  getIncentiveDashboard,
  logDailyContribution,
  exportContributionReportCsv
} = require('../controllers/incentiveController');
const { protect } = require('../middleware/authMiddleware');

router.get('/dashboard', protect, getIncentiveDashboard);
router.post('/log', protect, logDailyContribution);
router.get('/report-csv', protect, exportContributionReportCsv);

module.exports = router;
