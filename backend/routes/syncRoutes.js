const express = require('express');
const router = express.Router();
const { syncBatch, getSyncLogs } = require('../controllers/syncController');
const { protect } = require('../middleware/authMiddleware');

router.post('/batch', protect, syncBatch);
router.get('/logs', protect, getSyncLogs);

module.exports = router;
