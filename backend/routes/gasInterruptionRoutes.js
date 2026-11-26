const express = require('express');
const router = express.Router();
const {
  getInterruptions,
  createInterruption,
  updateInterruptionStatus
} = require('../controllers/gasInterruptionController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, getInterruptions);
router.post('/', protect, authorize('admin', 'coordinator'), createInterruption);
router.put('/:id/status', protect, authorize('admin', 'coordinator'), updateInterruptionStatus);

module.exports = router;
