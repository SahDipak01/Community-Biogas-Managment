const express = require('express');
const router = express.Router();
const {
  getMonitoringRecords,
  recordPlantMonitoring,
  getActiveAlerts
} = require('../controllers/monitoringController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, getMonitoringRecords);
router.post('/', protect, authorize('admin', 'coordinator', 'household'), recordPlantMonitoring);
router.get('/alerts', protect, getActiveAlerts);

module.exports = router;
