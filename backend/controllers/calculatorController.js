const { calculateBiogasFeasibility, PLANT_CAPACITY_MATRIX, BIOGAS_YIELDS, EQUIVALENCE_CONSTANTS } = require('../utils/biogasCalculator');
const { validateNumberInRange, collectErrors } = require('../utils/validators');
const Household = require('../models/Household');
const CattleRecord = require('../models/CattleRecord');

// @desc    Calculate biogas feasibility
// @route   POST /api/calculator/evaluate
// @access  Public (or Private)
const evaluateFeasibility = async (req, res, next) => {
  try {
    const input = req.body || {};

    const errors = collectErrors([
      validateNumberInRange(input.cattleCount, 'Cattle count', 0, 10000),
      validateNumberInRange(input.avgDungPerCattleKg, 'Average dung per cattle (kg)', 1, 30),
      validateNumberInRange(input.agriWasteKgPerDay, 'Agricultural waste (kg/day)', 0, 25000),
      validateNumberInRange(input.kitchenWasteKgPerDay, 'Kitchen waste (kg/day)', 0, 5000),
      validateNumberInRange(input.participatingHouseholds, 'Participating households', 1, 2000),
      validateNumberInRange(input.availableWaterLitersPerDay, 'Available water (L/day)', 0, 200000),
      validateNumberInRange(input.installationBudgetINR, 'Installation budget (INR)', 0, 100000000)
    ]);

    if (input.cattleBreakdown && typeof input.cattleBreakdown === 'object') {
      for (const [species, val] of Object.entries(input.cattleBreakdown)) {
        const err = validateNumberInRange(val, `${species} count`, 0, 10000);
        if (err) errors.push(err);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors.join(' ')
      });
    }

    const result = calculateBiogasFeasibility(input);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Pre-fill calculator for logged in household
// @route   GET /api/calculator/household-defaults
// @access  Private
const getHouseholdCalculatorDefaults = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const household = await Household.findOne({ user: userId }).populate('village');

    if (!household) {
      return res.json({
        success: true,
        data: {
          cattleCount: 3,
          avgDungPerCattleKg: 12,
          agriWasteKgPerDay: 5,
          kitchenWasteKgPerDay: 2,
          participatingHouseholds: 1,
          availableWaterLitersPerDay: 60,
          installationBudgetINR: 50000
        }
      });
    }

    const cattleRecords = await CattleRecord.find({ household: household._id });
    const cattleCount = cattleRecords.reduce((acc, c) => acc + c.count, 0);
    const totalDung = cattleRecords.reduce((acc, c) => acc + c.dailyDungTotalKg, 0);
    const avgDung = cattleCount > 0 ? Math.round(totalDung / cattleCount) : 12;

    const cattleBreakdown = {};
    cattleRecords.forEach(c => {
      cattleBreakdown[c.cattleType] = c.count;
    });

    res.json({
      success: true,
      data: {
        householdCode: household.householdCode,
        headOfFamily: household.headOfFamily,
        villageName: household.village ? household.village.name : '',
        cattleCount: cattleCount || 3,
        cattleBreakdown,
        avgDungPerCattleKg: avgDung || 12,
        agriWasteKgPerDay: 5,
        kitchenWasteKgPerDay: 2,
        participatingHouseholds: 1,
        availableWaterLitersPerDay: household.waterAvailabilityLitersPerDay || 60,
        installationBudgetINR: 50000
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get engineering reference matrix and assumptions
// @route   GET /api/calculator/assumptions
// @access  Public
const getEngineeringAssumptions = (req, res) => {
  res.json({
    success: true,
    data: {
      capacityMatrix: PLANT_CAPACITY_MATRIX,
      biogasYields: BIOGAS_YIELDS,
      equivalenceConstants: EQUIVALENCE_CONSTANTS,
      description: 'Standard parameters aligned with MNRE, IARI & Bureau of Indian Standards (BIS) specifications for rural biogas plants.'
    }
  });
};

module.exports = {
  evaluateFeasibility,
  getHouseholdCalculatorDefaults,
  getEngineeringAssumptions
};
