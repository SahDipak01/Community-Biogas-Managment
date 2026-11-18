const express = require('express');
const router = express.Router();
const {
  getHouseholds,
  createHousehold,
  updateHousehold,
  getMyHouseholdProfile,
  updateMyHouseholdProfile
} = require('../controllers/householdController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/my-profile', protect, getMyHouseholdProfile);
router.put('/my-profile', protect, updateMyHouseholdProfile);

router.get('/', protect, getHouseholds);
router.post('/', protect, authorize('admin', 'coordinator'), createHousehold);
router.put('/:id', protect, authorize('admin', 'coordinator', 'household'), updateHousehold);

module.exports = router;
