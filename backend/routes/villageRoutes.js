const express = require('express');
const router = express.Router();
const {
  getVillages,
  createVillage,
  updateVillage
} = require('../controllers/villageController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', getVillages);
router.post('/', protect, authorize('admin'), createVillage);
router.put('/:id', protect, authorize('admin', 'coordinator'), updateVillage);

module.exports = router;
