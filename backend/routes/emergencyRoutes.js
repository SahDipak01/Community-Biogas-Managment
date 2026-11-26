const express = require('express');
const router = express.Router();
const {
  getIncidents,
  reportEmergency,
  updateEmergencyStatus
} = require('../controllers/emergencyController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, getIncidents);
router.post('/', protect, reportEmergency);
router.put('/:id/status', protect, authorize('admin', 'coordinator'), updateEmergencyStatus);

module.exports = router;
