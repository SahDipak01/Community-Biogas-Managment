const BiogasPlant = require('../models/BiogasPlant');
const Household = require('../models/Household');
const Village = require('../models/Village');
const { validateNumberInRange, collectErrors } = require('../utils/validators');
const { logAuditEvent } = require('../utils/auditLogger');

// @desc    Get all biogas plants with filtering
// @route   GET /api/plants
// @access  Private
const getPlants = async (req, res, next) => {
  try {
    const { villageId, status, isCommunity, search } = req.query;

    const query = {};

    if (req.user.role === 'coordinator' && req.user.village) {
      query.village = req.user.village._id || req.user.village;
    } else if (villageId && villageId !== 'all') {
      query.village = villageId;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (isCommunity !== undefined && isCommunity !== 'all') {
      query.isCommunityPlant = isCommunity === 'true';
    }

    if (search) {
      query.$or = [
        { plantName: { $regex: search, $options: 'i' } },
        { plantCode: { $regex: search, $options: 'i' } },
        { plantType: { $regex: search, $options: 'i' } }
      ];
    }

    const plants = await BiogasPlant.find(query)
      .sort({ createdAt: -1 })
      .populate('village', 'name district state location')
      .populate('ownerHousehold', 'householdCode headOfFamily')
      .populate('participatingHouseholds', 'householdCode headOfFamily');

    res.json({
      success: true,
      count: plants.length,
      data: plants
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register a new biogas plant
// @route   POST /api/plants
// @access  Private (Coordinator or Admin)
const createPlant = async (req, res, next) => {
  try {
    const {
      plantName,
      plantCode,
      plantType,
      capacityM3,
      villageId,
      ownerHouseholdId,
      isCommunityPlant = false,
      participatingHouseholdIds = [],
      installationCost,
      subsidyReceived,
      location,
      gasUtilization,
      notes
    } = req.body;

    const assignedVillage = villageId || (req.user.village ? req.user.village._id || req.user.village : null);

    if (!assignedVillage) {
      return res.status(400).json({
        success: false,
        message: 'Village ID is required'
      });
    }

    const errors = collectErrors([
      !plantName || !String(plantName).trim() ? 'Plant name is required.' : null,
      validateNumberInRange(capacityM3, 'Plant capacity (m3)', 0.5, 500, { required: true }),
      validateNumberInRange(installationCost, 'Installation cost (INR)', 0, 100000000),
      validateNumberInRange(subsidyReceived, 'Subsidy amount (INR)', 0, 100000000)
    ]);

    const resolvedCap = Number(capacityM3);
    const resolvedCost =
      installationCost !== undefined && installationCost !== '' && installationCost !== null
        ? Number(installationCost)
        : resolvedCap * 22000;
    const resolvedSubsidy =
      subsidyReceived !== undefined && subsidyReceived !== '' && subsidyReceived !== null
        ? Number(subsidyReceived)
        : resolvedCap * 7000;

    if (Number.isFinite(resolvedCost) && Number.isFinite(resolvedSubsidy) && resolvedSubsidy > resolvedCost) {
      errors.push('Subsidy amount cannot exceed total installation cost.');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors[0],
        errors
      });
    }

    // Default coordinates near village if omitted
    let finalLocation = location;
    if (!finalLocation || !finalLocation.latitude) {
      const v = await Village.findById(assignedVillage);
      finalLocation = {
        latitude: v ? v.location.latitude + (Math.random() - 0.5) * 0.005 : 25.3176,
        longitude: v ? v.location.longitude + (Math.random() - 0.5) * 0.005 : 82.9739
      };
    }

    const code = plantCode || `BG-${Date.now().toString().slice(-5)}`;

    const plant = await BiogasPlant.create({
      plantName: String(plantName).trim(),
      plantCode: code,
      plantType: plantType || 'Fixed Dome (Deenabandhu)',
      capacityM3: resolvedCap,
      village: assignedVillage,
      ownerHousehold: ownerHouseholdId || null,
      isCommunityPlant: Boolean(isCommunityPlant),
      participatingHouseholds: participatingHouseholdIds || [],
      installationCost: resolvedCost,
      subsidyReceived: resolvedSubsidy,
      location: finalLocation,
      gasUtilization: gasUtilization || 'Household Cooking',
      dailyDesignFeedstockKg: resolvedCap * 25,
      dailyDesignWaterLiters: resolvedCap * 25,
      status: 'Active',
      notes: notes || ''
    });

    // If owner household specified, mark it
    if (ownerHouseholdId) {
      await Household.findByIdAndUpdate(ownerHouseholdId, {
        hasBiogasPlant: true,
        biogasPlant: plant._id
      });
    }

    await logAuditEvent(req, {
      action: 'CREATE_PLANT',
      entityType: 'BiogasPlant',
      entityId: plant._id,
      summary: `Registered ${plant.capacityM3} m3 plant "${plant.plantName}" (${plant.plantCode})`,
      metadata: { capacityM3: plant.capacityM3, installationCost: plant.installationCost, subsidyReceived: plant.subsidyReceived }
    });

    res.status(201).json({
      success: true,
      data: plant
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update plant details or status
// @route   PUT /api/plants/:id
// @access  Private (Coordinator or Admin)
const updatePlant = async (req, res, next) => {
  try {
    const existing = await BiogasPlant.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Biogas plant not found'
      });
    }

    const errors = collectErrors([
      validateNumberInRange(req.body.capacityM3, 'Plant capacity (m3)', 0.5, 500),
      validateNumberInRange(req.body.installationCost, 'Installation cost (INR)', 0, 100000000),
      validateNumberInRange(req.body.subsidyReceived, 'Subsidy amount (INR)', 0, 100000000)
    ]);

    const nextCost = req.body.installationCost !== undefined ? Number(req.body.installationCost) : existing.installationCost;
    const nextSubsidy = req.body.subsidyReceived !== undefined ? Number(req.body.subsidyReceived) : existing.subsidyReceived;
    if (Number.isFinite(nextCost) && Number.isFinite(nextSubsidy) && nextSubsidy > nextCost) {
      errors.push('Subsidy amount cannot exceed total installation cost.');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors[0],
        errors
      });
    }

    const plant = await BiogasPlant.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('village');

    await logAuditEvent(req, {
      action: 'UPDATE_PLANT',
      entityType: 'BiogasPlant',
      entityId: plant._id,
      summary: `Updated plant "${plant.plantName}" (${plant.status})`,
      metadata: { updatedFields: Object.keys(req.body || {}) }
    });

    res.json({
      success: true,
      data: plant
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPlants,
  createPlant,
  updatePlant
};
