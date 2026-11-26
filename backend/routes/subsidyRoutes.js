const express = require('express');
const router = express.Router();
const {
  getApplications,
  applyForSubsidy,
  updateApplicationStatus
} = require('../controllers/subsidyController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, getApplications);
router.post('/', protect, applyForSubsidy);
router.put('/:id/status', protect, authorize('admin', 'coordinator'), updateApplicationStatus);

module.exports = router;
