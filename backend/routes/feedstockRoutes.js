const express = require('express');
const router = express.Router();
const {
  getFeedstockRecords,
  createFeedstockRecord,
  getSeasonalTrends
} = require('../controllers/feedstockController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, getFeedstockRecords);
router.post('/', protect, authorize('admin', 'coordinator'), createFeedstockRecord);
router.get('/seasonal-trends', protect, getSeasonalTrends);

module.exports = router;
