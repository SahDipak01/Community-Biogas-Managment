const express = require('express');
const router = express.Router();
const { analyzeAllocationAndRoutes } = require('../controllers/optimizerController');
const { protect } = require('../middleware/authMiddleware');

router.get('/analyze', protect, analyzeAllocationAndRoutes);

module.exports = router;
