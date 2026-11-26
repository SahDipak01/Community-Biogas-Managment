const express = require('express');
const router = express.Router();
const {
  getRequests,
  createRequest,
  updateStatus,
  recordCompletion,
  getSchedules
} = require('../controllers/wasteCollectionController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, getRequests);
router.post('/', protect, createRequest);
router.get('/schedules', protect, getSchedules);
router.put('/:id/status', protect, authorize('admin', 'coordinator'), updateStatus);
router.post('/:id/complete', protect, authorize('admin', 'coordinator'), recordCompletion);

module.exports = router;
