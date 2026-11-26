const express = require('express');
const router = express.Router();
const {
  getComplaints,
  createComplaint,
  updateComplaintStatus,
  reopenComplaint,
  submitFeedback
} = require('../controllers/complaintController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, getComplaints);
router.post('/', protect, createComplaint);
router.put('/:id/status', protect, authorize('admin', 'coordinator'), updateComplaintStatus);
router.post('/:id/reopen', protect, reopenComplaint);
router.post('/:id/feedback', protect, submitFeedback);

module.exports = router;
