const express = require('express');
const router = express.Router();
const {
  getPlants,
  createPlant,
  updatePlant
} = require('../controllers/plantController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, getPlants);
router.post('/', protect, authorize('admin', 'coordinator'), createPlant);
router.put('/:id', protect, authorize('admin', 'coordinator'), updatePlant);

module.exports = router;
