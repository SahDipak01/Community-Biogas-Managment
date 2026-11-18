const express = require('express');
const router = express.Router();
const {
  evaluateFeasibility,
  getHouseholdCalculatorDefaults,
  getEngineeringAssumptions
} = require('../controllers/calculatorController');
const { protect } = require('../middleware/authMiddleware');

router.post('/evaluate', evaluateFeasibility);
router.get('/household-defaults', protect, getHouseholdCalculatorDefaults);
router.get('/assumptions', getEngineeringAssumptions);

module.exports = router;
