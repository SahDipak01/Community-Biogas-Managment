const express = require('express');
const router = express.Router();
const {
  getFeedstockRecords,
  createFeedstockRecord,
  updateFeedstockRecord,
  deleteFeedstockRecord,
  getSeasonalTrends
} = require('../controllers/feedstockController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, getFeedstockRecords);
router.post('/', protect, authorize('admin', 'coordinator'), createFeedstockRecord);
router.put('/:id', protect, authorize('admin', 'coordinator'), updateFeedstockRecord);
router.delete('/:id', protect, authorize('admin', 'coordinator'), deleteFeedstockRecord);
router.get('/seasonal-trends', protect, getSeasonalTrends);

module.exports = router;
