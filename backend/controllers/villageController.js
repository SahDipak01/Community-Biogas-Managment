const Village = require('../models/Village');
const Household = require('../models/Household');
const BiogasPlant = require('../models/BiogasPlant');
const CattleRecord = require('../models/CattleRecord');

// @desc    Get all registered villages
// @route   GET /api/villages
// @access  Public (or Private)
const getVillages = async (req, res, next) => {
  try {
    const villages = await Village.find().populate('coordinator', 'name email phone');

    // Dynamically calculate actual registered households, cattle, and plants
    const enrichedVillages = await Promise.all(
      villages.map(async (v) => {
        const householdCount = await Household.countDocuments({ village: v._id });
        const plantCount = await BiogasPlant.countDocuments({ village: v._id });
        const cattleRecords = await CattleRecord.find({ village: v._id });
        const actualCattle = cattleRecords.reduce((acc, c) => acc + c.count, 0);
        const dailyDung = cattleRecords.reduce((acc, c) => acc + c.dailyDungTotalKg, 0);

        return {
          ...v.toObject(),
          householdCount,
          plantCount,
          actualCattle,
          dailyDungKg: Math.round(dailyDung)
        };
      })
    );

    res.json({
      success: true,
      count: enrichedVillages.length,
      data: enrichedVillages
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new village
// @route   POST /api/villages
// @access  Private (Admin)
const createVillage = async (req, res, next) => {
  try {
    const village = await Village.create(req.body);
    res.status(201).json({
      success: true,
      data: village
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a village
// @route   PUT /api/villages/:id
// @access  Private (Admin or Coordinator)
const updateVillage = async (req, res, next) => {
  try {
    const village = await Village.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!village) {
      return res.status(404).json({
        success: false,
        message: 'Village not found'
      });
    }

    res.json({
      success: true,
      data: village
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getVillages,
  createVillage,
  updateVillage
};
