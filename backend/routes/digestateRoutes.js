const express = require('express');
const router = express.Router();
const {
  getDigestateSummary,
  registerFarmerLand,
  createDigestateDistribution,
  updateDistributionStatus
} = require('../controllers/digestateController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/summary', protect, getDigestateSummary);
router.post('/farmers', protect, registerFarmerLand);
router.post('/distributions', protect, authorize('admin', 'coordinator'), createDigestateDistribution);
router.put('/distributions/:id', protect, authorize('admin', 'coordinator'), updateDistributionStatus);

module.exports = router;
