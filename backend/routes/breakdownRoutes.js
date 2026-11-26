const express = require('express');
const router = express.Router();
const {
  getBreakdowns,
  reportBreakdown,
  updateBreakdownStatus,
  reopenBreakdown
} = require('../controllers/breakdownController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, getBreakdowns);
router.post('/', protect, reportBreakdown);
router.put('/:id/status', protect, authorize('admin', 'coordinator'), updateBreakdownStatus);
router.post('/:id/reopen', protect, reopenBreakdown);

module.exports = router;
