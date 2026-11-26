const express = require('express');
const router = express.Router();
const {
  getDigestateSummary,
  registerFarmerLand,
  createDigestateDistribution,
  updateDistributionStatus,
  getBatches,
  createBatch,
  requestBatchAllocation
} = require('../controllers/digestateController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/summary', protect, getDigestateSummary);
router.get('/batches', protect, getBatches);
router.post('/batches', protect, authorize('admin', 'coordinator'), createBatch);
router.post('/batches/:id/request', protect, requestBatchAllocation);
router.post('/farmers', protect, registerFarmerLand);
router.post('/distributions', protect, authorize('admin', 'coordinator'), createDigestateDistribution);
router.put('/distributions/:id', protect, authorize('admin', 'coordinator'), updateDistributionStatus);

module.exports = router;
