const express = require('express');
const router = express.Router();
const {
  getPoolingSummary,
  createContributionAgreement
} = require('../controllers/communityController');
const { protect } = require('../middleware/authMiddleware');

router.get('/pooling-summary', protect, getPoolingSummary);
router.post('/contribute', protect, createContributionAgreement);

module.exports = router;
