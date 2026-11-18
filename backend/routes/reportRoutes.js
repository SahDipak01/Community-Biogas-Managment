const express = require('express');
const router = express.Router();
const {
  getAnalyticsReport,
  exportCsvReport,
  exportDatabaseBackup,
  createServerBackup,
  listServerBackups,
  downloadServerBackup,
  restoreDatabaseBackup
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/analytics', protect, getAnalyticsReport);
router.get('/export-csv', protect, exportCsvReport);
router.get('/backup', protect, authorize('admin'), exportDatabaseBackup);
router.get('/backups', protect, authorize('admin'), listServerBackups);
router.post('/backups/create', protect, authorize('admin'), createServerBackup);
router.get('/backups/:filename', protect, authorize('admin'), downloadServerBackup);
router.post('/restore', protect, authorize('admin'), restoreDatabaseBackup);

module.exports = router;
