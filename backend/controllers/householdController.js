const Household = require('../models/Household');
const CattleRecord = require('../models/CattleRecord');
const Village = require('../models/Village');
const User = require('../models/User');
const { validateNumberInRange, collectErrors } = require('../utils/validators');
const { logAuditEvent } = require('../utils/auditLogger');

// @desc    Get all households with filters & cattle data
// @route   GET /api/households
// @access  Private
const getHouseholds = async (req, res, next) => {
  try {
    const { villageId, search, hasPlant, page = 1, limit = 20 } = req.query;

    const query = {};

    if (req.user.role === 'coordinator' && req.user.village) {
      query.village = req.user.village._id || req.user.village;
    } else if (villageId && villageId !== 'all') {
      query.village = villageId;
    }

    if (hasPlant !== undefined && hasPlant !== 'all') {
      query.hasBiogasPlant = hasPlant === 'true';
    }

    if (search) {
      query.$or = [
        { headOfFamily: { $regex: search, $options: 'i' } },
        { householdCode: { $regex: search, $options: 'i' } },
        { contactPhone: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Household.countDocuments(query);
    const households = await Household.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate('village', 'name district state')
      .populate('biogasPlant', 'plantName plantCode capacityM3 status');

    // Attach cattle counts
    const enrichedHouseholds = await Promise.all(
      households.map(async (h) => {
        const cattle = await CattleRecord.find({ household: h._id });
        const totalCattle = cattle.reduce((acc, c) => acc + c.count, 0);
        const dailyDung = cattle.reduce((acc, c) => acc + c.dailyDungTotalKg, 0);
        return {
          ...h.toObject(),
          cattleSummary: {
            totalCattle,
            dailyDungKg: dailyDung,
            records: cattle
          }
        };
      })
    );

    res.json({
      success: true,
      count: enrichedHouseholds.length,
      total,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      data: enrichedHouseholds
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register a new household and optional cattle records
// @route   POST /api/households
// @access  Private (Coordinator or Admin)
const createHousehold = async (req, res, next) => {
  try {
    const {
      headOfFamily,
      householdCode,
      villageId,
      familyMembers = 4,
      contactPhone = '',
      location,
      lpgConsumptionMonthlyCylinders = 1,
      firewoodConsumptionKgPerMonth = 50,
      waterAvailabilityLitersPerDay = 100,
      waterSource = 'Borewell',
      cattle = [] // Array of { cattleType, count, avgDungPerAnimalKg }
    } = req.body;

    const assignedVillage = villageId || (req.user.village ? req.user.village._id || req.user.village : null);

    if (!assignedVillage) {
      return res.status(400).json({
        success: false,
        message: 'Village is required'
      });
    }

    const errors = collectErrors([
      !headOfFamily || !String(headOfFamily).trim() ? 'Head of family name is required.' : null,
      validateNumberInRange(familyMembers, 'Family members', 1, 50),
      validateNumberInRange(lpgConsumptionMonthlyCylinders, 'Monthly LPG cylinders', 0, 50),
      validateNumberInRange(firewoodConsumptionKgPerMonth, 'Monthly firewood consumption (kg)', 0, 5000),
      validateNumberInRange(waterAvailabilityLitersPerDay, 'Daily water availability (liters)', 0, 50000)
    ]);
    if (Array.isArray(cattle)) {
      cattle.forEach((c) => {
        const err = validateNumberInRange(c.count, `${c.cattleType || 'Cattle'} count`, 0, 5000);
        if (err) errors.push(err);
      });
    }
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors[0], errors });
    }

    // Auto-generate household code if not provided
    const code = householdCode || `HH-${Date.now().toString().slice(-6)}`;

    // Default coordinates near village if omitted
    let finalLocation = location;
    if (!finalLocation || !finalLocation.latitude) {
      const village = await Village.findById(assignedVillage);
      finalLocation = {
        latitude: village ? village.location.latitude + (Math.random() - 0.5) * 0.008 : 25.3176,
        longitude: village ? village.location.longitude + (Math.random() - 0.5) * 0.008 : 82.9739
      };
    }

    const household = await Household.create({
      householdCode: code,
      headOfFamily,
      village: assignedVillage,
      familyMembers,
      contactPhone,
      location: finalLocation,
      lpgConsumptionMonthlyCylinders,
      firewoodConsumptionKgPerMonth,
      waterAvailabilityLitersPerDay,
      waterSource
    });

    // Save cattle records if provided
    if (cattle && Array.isArray(cattle) && cattle.length > 0) {
      for (const item of cattle) {
        if (item.count > 0) {
          const avgDung = item.avgDungPerAnimalKg || (item.cattleType === 'Buffalo' ? 15 : item.cattleType === 'Cow' ? 11 : 12);
          await CattleRecord.create({
            household: household._id,
            village: assignedVillage,
            cattleType: item.cattleType || 'Cow',
            count: Number(item.count),
            avgDungPerAnimalKg: Number(avgDung),
            dailyDungTotalKg: Number(item.count) * Number(avgDung)
          });
        }
      }
    }

    // Update village count
    await Village.findByIdAndUpdate(assignedVillage, {
      $inc: { totalHouseholds: 1 }
    });

    await logAuditEvent(req, {
      action: 'CREATE_HOUSEHOLD',
      entityType: 'Household',
      entityId: household._id,
      summary: `Registered household ${household.householdCode} (${household.headOfFamily})`,
      metadata: { villageId: String(assignedVillage), familyMembers: household.familyMembers }
    });

    res.status(201).json({
      success: true,
      data: household
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update household details
// @route   PUT /api/households/:id
// @access  Private
const updateHousehold = async (req, res, next) => {
  try {
    const household = await Household.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('village');

    if (!household) {
      return res.status(404).json({
        success: false,
        message: 'Household not found'
      });
    }

    res.json({
      success: true,
      data: household
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged-in user's household & cattle profile
// @route   GET /api/households/my-profile
// @access  Private
const getMyHouseholdProfile = async (req, res, next) => {
  try {
    let household = await Household.findOne({ user: req.user._id }).populate('village', 'name district state');
    if (!household && req.user.household) {
      household = await Household.findById(req.user.household).populate('village', 'name district state');
    }

    const cattleMap = { Cow: 0, Buffalo: 0, Bullock: 0, Calf: 0 };
    let dailyDungKg = 0;

    if (household) {
      const records = await CattleRecord.find({ household: household._id });
      records.forEach((r) => {
        if (cattleMap[r.cattleType] !== undefined) {
          cattleMap[r.cattleType] = r.count;
        }
        dailyDungKg += r.dailyDungTotalKg || 0;
      });
    }

    res.json({
      success: true,
      data: {
        household: household || null,
        cattleBreakdown: cattleMap,
        dailyDungKg: Number(dailyDungKg.toFixed(1)),
        estimatedBiogasM3PerDay: Number((dailyDungKg * 0.038).toFixed(2))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create or update current logged-in user's household & cattle profile
// @route   PUT /api/households/my-profile
// @access  Private
const updateMyHouseholdProfile = async (req, res, next) => {
  try {
    const {
      headOfFamily,
      villageId,
      familyMembers = 4,
      contactPhone = '',
      lpgConsumptionMonthlyCylinders = 1,
      firewoodConsumptionKgPerMonth = 50,
      waterAvailabilityLitersPerDay = 100,
      waterSource = 'Borewell',
      willingToPoolWaste = true,
      cattleBreakdown = {}
    } = req.body;

    const assignedVillage =
      villageId || (req.user.village ? req.user.village._id || req.user.village : null);

    if (!assignedVillage) {
      return res.status(400).json({ success: false, message: 'Please select a village for your household.' });
    }

    const errors = collectErrors([
      validateNumberInRange(familyMembers, 'Family members', 1, 50),
      validateNumberInRange(lpgConsumptionMonthlyCylinders, 'Monthly LPG cylinders', 0, 50),
      validateNumberInRange(firewoodConsumptionKgPerMonth, 'Monthly firewood consumption (kg)', 0, 5000),
      validateNumberInRange(waterAvailabilityLitersPerDay, 'Daily water availability (liters)', 0, 50000),
      ...Object.entries(cattleBreakdown || {}).map(([k, v]) =>
        validateNumberInRange(v, `${k} count`, 0, 5000)
      )
    ]);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors[0], errors });
    }

    let household = await Household.findOne({ user: req.user._id });
    if (!household && req.user.household) {
      household = await Household.findById(req.user.household);
    }

    if (household) {
      household.headOfFamily = headOfFamily || household.headOfFamily;
      household.village = assignedVillage;
      household.familyMembers = Math.max(1, Number(familyMembers) || 4);
      household.contactPhone = contactPhone;
      household.lpgConsumptionMonthlyCylinders = Math.max(0, Number(lpgConsumptionMonthlyCylinders) || 0);
      household.firewoodConsumptionKgPerMonth = Math.max(0, Number(firewoodConsumptionKgPerMonth) || 0);
      household.waterAvailabilityLitersPerDay = Math.max(0, Number(waterAvailabilityLitersPerDay) || 0);
      household.waterSource = waterSource;
      household.willingToPoolWaste = Boolean(willingToPoolWaste);
      await household.save();
    } else {
      const v = await Village.findById(assignedVillage);
      household = await Household.create({
        householdCode: `HH-${Date.now().toString().slice(-5)}${Math.floor(Math.random() * 10)}`,
        headOfFamily: headOfFamily || req.user.name,
        user: req.user._id,
        village: assignedVillage,
        familyMembers: Math.max(1, Number(familyMembers) || 4),
        contactPhone: contactPhone || req.user.phone || '',
        location: {
          latitude: v ? v.location.latitude + (Math.random() - 0.5) * 0.005 : 25.3176,
          longitude: v ? v.location.longitude + (Math.random() - 0.5) * 0.005 : 82.9739
        },
        lpgConsumptionMonthlyCylinders: Math.max(0, Number(lpgConsumptionMonthlyCylinders) || 0),
        firewoodConsumptionKgPerMonth: Math.max(0, Number(firewoodConsumptionKgPerMonth) || 0),
        waterAvailabilityLitersPerDay: Math.max(0, Number(waterAvailabilityLitersPerDay) || 0),
        waterSource,
        willingToPoolWaste: Boolean(willingToPoolWaste)
      });

      await User.findByIdAndUpdate(req.user._id, {
        household: household._id,
        village: assignedVillage
      });
    }

    // Update cattle records cleanly
    const DUNG_RATES = { Cow: 11, Buffalo: 16, Bullock: 13, Calf: 5 };
    await CattleRecord.deleteMany({ household: household._id });

    let totalDung = 0;
    for (const [type, rawCount] of Object.entries(cattleBreakdown)) {
      const count = Math.max(0, parseInt(rawCount) || 0);
      if (count > 0 && DUNG_RATES[type]) {
        const avgDung = DUNG_RATES[type];
        const dailyTotal = count * avgDung;
        totalDung += dailyTotal;
        await CattleRecord.create({
          household: household._id,
          village: assignedVillage,
          cattleType: type,
          count,
          avgDungPerAnimalKg: avgDung,
          dailyDungTotalKg: dailyTotal
        });
      }
    }

    const populated = await Household.findById(household._id).populate('village', 'name district state');

    await logAuditEvent(req, {
      action: 'UPDATE_MY_HOUSEHOLD_PROFILE',
      entityType: 'Household',
      entityId: household._id,
      summary: `Updated household profile ${household.householdCode} (${totalDung} kg/day cattle dung)`,
      metadata: { totalDung, cattleBreakdown }
    });

    res.json({
      success: true,
      data: {
        household: populated,
        cattleBreakdown,
        dailyDungKg: totalDung,
        estimatedBiogasM3PerDay: Number((totalDung * 0.038).toFixed(2))
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHouseholds,
  createHousehold,
  updateHousehold,
  getMyHouseholdProfile,
  updateMyHouseholdProfile
};
