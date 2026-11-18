const BiogasPlant = require('../models/BiogasPlant');
const PlantMonitoring = require('../models/PlantMonitoring');
const FeedstockRecord = require('../models/FeedstockRecord');
const FarmerLand = require('../models/FarmerLand');
const DigestateDistribution = require('../models/DigestateDistribution');
const Village = require('../models/Village');
const { haversineDistanceKm } = require('../utils/routeOptimizer');
const { EQUIVALENCE_CONSTANTS } = require('../utils/biogasCalculator');
const { validateNumberInRange, collectErrors } = require('../utils/validators');
const { logAuditEvent } = require('../utils/auditLogger');

// Unified Digestate Agronomy Constants (IARI / FAO bio-slurry standards)
// Effluent bio-slurry exits at ~7.5% Total Solids (0.075 kg dry matter per liter)
const DIGESTATE_CONSTANTS = {
  liquidSlurryLitersPerKgFeedstock: 1.84, // (1 kg feedstock + 1 L water) * 0.92 after gas loss
  dryManureKgPerLiter: EQUIVALENCE_CONSTANTS.digestedSlurryDrySolidsKgPerLiter, // 0.075 kg/L
  baseNpkDryWeightPercent: {
    dung: { n: 1.6, p: 1.1, k: 1.2 },
    agriWaste: { n: 1.1, p: 0.6, k: 1.5 },
    kitchenWaste: { n: 2.2, p: 0.9, k: 1.0 }
  },
  storageLossesByMethod: {
    'Liquid Bio-Slurry': { nitrogenLossPercent: 10, handlingVolumeLossPercent: 5 },
    'Compost Enriched Slurry': { nitrogenLossPercent: 20, handlingVolumeLossPercent: 10 },
    'Sun-Dried Digestate Cake': { nitrogenLossPercent: 28, handlingVolumeLossPercent: 12 }
  },
  safeApplicationRateLitersPerAcrePerMonth: 3500, // Prevents nitrate runoff
  chemicalNpkReplacementRatio: 0.42,
  savingsPerKgDryEquivalentINR: EQUIVALENCE_CONSTANTS.bioFertilizerValuePerKgINR, // ₹6.00/kg
  disclaimer:
    'NPK nutrient values and chemical fertilizer replacements are engineering estimates based on IARI/FAO literature for anaerobic digestate. Laboratory soil & slurry testing is required for lab-verified agronomic certification.'
};

function computeFeedstockWeightedNpk(feedstockRecords) {
  let dung = 0;
  let agri = 0;
  let kitchen = 0;
  feedstockRecords.forEach((r) => {
    dung += r.dungKg || 0;
    agri += r.agriWasteKg || 0;
    kitchen += r.kitchenWasteKg || 0;
  });
  const total = dung + agri + kitchen;
  if (total <= 0) {
    return {
      shares: { dungPercent: 85, agriPercent: 10, kitchenPercent: 5 },
      npkPercent: { n: 1.58, p: 1.04, k: 1.22 }
    };
  }
  const wD = dung / total;
  const wA = agri / total;
  const wK = kitchen / total;
  const b = DIGESTATE_CONSTANTS.baseNpkDryWeightPercent;
  return {
    shares: {
      dungPercent: Math.round(wD * 100),
      agriPercent: Math.round(wA * 100),
      kitchenPercent: Math.round(wK * 100)
    },
    npkPercent: {
      n: Number((wD * b.dung.n + wA * b.agriWaste.n + wK * b.kitchenWaste.n).toFixed(2)),
      p: Number((wD * b.dung.p + wA * b.agriWaste.p + wK * b.kitchenWaste.p).toFixed(2)),
      k: Number((wD * b.dung.k + wA * b.agriWaste.k + wK * b.kitchenWaste.k).toFixed(2))
    }
  };
}

// @desc    Get Digestate-to-Fertilizer Planner Summary, NPK Mass, Storage Losses & Land Adequacy
// @route   GET /api/digestate/summary
// @access  Private
const getDigestateSummary = async (req, res, next) => {
  try {
    const { villageId } = req.query;

    const filter = {};
    if (req.user.role === 'coordinator' && req.user.village) {
      filter.village = req.user.village._id || req.user.village;
    } else if (villageId && villageId !== 'all') {
      filter.village = villageId;
    }

    const [plants, farmers, distributions, recentFeedstock] = await Promise.all([
      BiogasPlant.find({ ...filter, status: { $in: ['Active', 'Under Maintenance'] } }).populate(
        'village',
        'name district'
      ),
      FarmerLand.find(filter).sort({ createdAt: -1 }).populate('village', 'name district'),
      DigestateDistribution.find(filter)
        .sort({ distributionDate: -1 })
        .populate('sourcePlant', 'plantName plantCode capacityM3')
        .populate('farmerLand', 'farmerName primaryCrop landAreaAcres')
        .populate('village', 'name'),
      FeedstockRecord.find(filter).sort({ collectionDate: -1 }).limit(60)
    ]);

    const feedstockProfile = computeFeedstockWeightedNpk(recentFeedstock);

    // 1. Estimate Daily and Monthly Digestate Production per plant (after 8% average storage/handling loss)
    const avgHandlingRetention = 0.92;
    const plantSupplies = await Promise.all(
      plants.map(async (p) => {
        const recentLogs = await PlantMonitoring.find({ plant: p._id }).sort({ date: -1 }).limit(7);
        const rawDailySlurryLiters =
          recentLogs.length > 0
            ? recentLogs.reduce((acc, l) => acc + (l.slurryProducedLiters || 0), 0) / recentLogs.length
            : (p.dailyDesignFeedstockKg || p.capacityM3 * 25) * DIGESTATE_CONSTANTS.liquidSlurryLitersPerKgFeedstock;

        const dailySlurryLiters = Math.round(rawDailySlurryLiters);
        const netUsableDailyLiters = Math.round(dailySlurryLiters * avgHandlingRetention);
        const monthlySlurryLiters = netUsableDailyLiters * 30;
        const monthlyDryEquivalentKg = Math.round(monthlySlurryLiters * DIGESTATE_CONSTANTS.dryManureKgPerLiter);

        return {
          plantId: p._id,
          plantName: p.plantName,
          plantCode: p.plantCode,
          villageId: p.village ? p.village._id : null,
          villageName: p.village ? p.village.name : 'Village',
          capacityM3: p.capacityM3,
          status: p.status,
          location: p.location,
          dailySlurryLiters,
          netUsableDailyLiters,
          monthlySlurryLiters,
          monthlyDryEquivalentKg
        };
      })
    );

    const totalDailyDigestateLiters = plantSupplies.reduce((acc, p) => acc + p.dailySlurryLiters, 0);
    const totalNetUsableMonthlyLiters = plantSupplies.reduce((acc, p) => acc + p.monthlySlurryLiters, 0);
    const totalMonthlyDryFertilizerKg = Math.round(
      totalNetUsableMonthlyLiters * DIGESTATE_CONSTANTS.dryManureKgPerLiter
    );

    // Explicit Monthly N, P, K Mass Output (kg/month) accounting for average 15% N volatilization loss
    const monthlyNpkSupplyKg = {
      nitrogenKg: Number(((totalMonthlyDryFertilizerKg * (feedstockProfile.npkPercent.n / 100)) * 0.85).toFixed(1)),
      phosphorusKg: Number((totalMonthlyDryFertilizerKg * (feedstockProfile.npkPercent.p / 100)).toFixed(1)),
      potassiumKg: Number((totalMonthlyDryFertilizerKg * (feedstockProfile.npkPercent.k / 100)).toFixed(1)),
      verificationStatus: 'Estimated (Literature Model)'
    };

    // Safe Land Area Requirement (acres required to absorb monthly slurry safely)
    const recommendedLandRequiredAcres = Number(
      (totalNetUsableMonthlyLiters / DIGESTATE_CONSTANTS.safeApplicationRateLitersPerAcrePerMonth).toFixed(2)
    );

    // 2. Compute Total Agricultural Demand
    const totalAgriculturalAcres = Number(farmers.reduce((acc, f) => acc + (f.landAreaAcres || 0), 0).toFixed(2));
    const totalMonthlyFertilizerDemandKg = Math.round(
      farmers.reduce((acc, f) => acc + (f.fertilizerRequiredKgPerMonth || 0), 0)
    );
    const demandFulfillmentPercent =
      totalMonthlyFertilizerDemandKg > 0
        ? Math.min(100, Math.round((totalMonthlyDryFertilizerKg / totalMonthlyFertilizerDemandKg) * 100))
        : 100;

    // 3. Automated Supply-to-Demand Matching Algorithm (accounts for farmer's preferred application method & storage loss)
    const remainingPlantSupply = plantSupplies.map((p) => ({
      ...p,
      remainingDryKg: p.monthlyDryEquivalentKg,
      remainingLiters: p.monthlySlurryLiters
    }));

    const matchingPlan = farmers.map((f) => {
      const neededKg = f.fertilizerRequiredKgPerMonth;
      const lossSpec =
        DIGESTATE_CONSTANTS.storageLossesByMethod[f.preferredApplicationType] ||
        DIGESTATE_CONSTANTS.storageLossesByMethod['Liquid Bio-Slurry'];

      const rankedPlants = [...remainingPlantSupply]
        .filter((p) => p.remainingDryKg > 0)
        .map((p) => ({
          plant: p,
          sameVillage: p.villageId && f.village && p.villageId.toString() === f.village._id.toString(),
          distanceKm:
            p.location && f.location
              ? Number(
                  (
                    haversineDistanceKm(
                      p.location.latitude,
                      p.location.longitude,
                      f.location.latitude,
                      f.location.longitude
                    ) * 1.25
                  ).toFixed(2)
                )
              : 1.5
        }))
        .sort((a, b) => {
          if (a.sameVillage !== b.sameVillage) return a.sameVillage ? -1 : 1;
          return a.distanceKm - b.distanceKm;
        });

      const bestMatch = rankedPlants[0];
      let allocatedDryKg = 0;
      let allocatedLiters = 0;
      let matchedPlantName = 'Insufficient Local Supply';
      let matchedPlantId = null;
      let distanceKm = 0;

      if (bestMatch) {
        // Also cap allocation to safe agronomic land ceiling (acres * 3500 L/ac/mo)
        const safeMaxLitersForPlot = f.landAreaAcres * DIGESTATE_CONSTANTS.safeApplicationRateLitersPerAcrePerMonth;
        const safeMaxDryForPlot = safeMaxLitersForPlot * DIGESTATE_CONSTANTS.dryManureKgPerLiter;
        allocatedDryKg = Math.min(neededKg, bestMatch.plant.remainingDryKg, safeMaxDryForPlot);
        allocatedLiters = Math.round(allocatedDryKg / DIGESTATE_CONSTANTS.dryManureKgPerLiter);
        bestMatch.plant.remainingDryKg -= allocatedDryKg;
        bestMatch.plant.remainingLiters -= allocatedLiters;
        matchedPlantName = bestMatch.plant.plantName;
        matchedPlantId = bestMatch.plant.plantId;
        distanceKm = bestMatch.distanceKm;
      }

      const nRetained = 1 - lossSpec.nitrogenLossPercent / 100;
      const estimatedNpkKg = {
        nitrogenKg: Number(((allocatedDryKg * (feedstockProfile.npkPercent.n / 100)) * nRetained).toFixed(2)),
        phosphorusKg: Number((allocatedDryKg * (feedstockProfile.npkPercent.p / 100)).toFixed(2)),
        potassiumKg: Number((allocatedDryKg * (feedstockProfile.npkPercent.k / 100)).toFixed(2))
      };

      const matchCoveragePercent = neededKg > 0 ? Math.round((allocatedDryKg / neededKg) * 100) : 0;
      const estimatedMonthlySavingsINR = Math.round(allocatedDryKg * DIGESTATE_CONSTANTS.savingsPerKgDryEquivalentINR);

      return {
        farmerId: f._id,
        farmerName: f.farmerName,
        villageName: f.village ? f.village.name : 'Village',
        landAreaAcres: f.landAreaAcres,
        primaryCrop: f.primaryCrop,
        soilType: f.soilType,
        preferredApplicationType: f.preferredApplicationType,
        nitrogenLossPercent: lossSpec.nitrogenLossPercent,
        fertilizerRequiredKgPerMonth: neededKg,
        matchedPlantId,
        matchedPlantName,
        distanceKm,
        recommendedAllocationLiters: allocatedLiters,
        recommendedSolidEquivalentKg: Math.round(allocatedDryKg),
        estimatedNpkKg,
        nutrientVerificationSource: 'estimated',
        matchCoveragePercent,
        estimatedMonthlySavingsINR
      };
    });

    // 4. Distribution Totals
    const totalDistributedLiters = distributions.reduce((acc, d) => acc + (d.digestateAllocatedLiters || 0), 0);
    const totalChemicalReplacedKg = Math.round(
      distributions.reduce((acc, d) => acc + (d.chemicalFertilizerReplacedKg || 0), 0)
    );
    const totalFarmerSavingsINR = Math.round(
      distributions.reduce((acc, d) => acc + (d.farmerSavingsINR || 0), 0)
    );
    const appliedToFieldCount = distributions.filter((d) => d.status === 'Applied to Field').length;
    const labVerifiedCount = distributions.filter((d) => d.nutrientVerificationSource === 'lab_verified').length;

    const supplyDemandChart = matchingPlan.map((m) => ({
      farmer: m.farmerName.split(' ')[0],
      crop: m.primaryCrop,
      demandKg: m.fertilizerRequiredKgPerMonth,
      matchedSupplyKg: m.recommendedSolidEquivalentKg
    }));

    res.json({
      success: true,
      data: {
        metrics: {
          totalDailyDigestateLiters,
          totalMonthlyDigestateLiters: totalNetUsableMonthlyLiters,
          totalMonthlyDryFertilizerKg,
          totalAgriculturalAcres,
          recommendedLandRequiredAcres,
          landCapacityAdequate: totalAgriculturalAcres >= recommendedLandRequiredAcres,
          totalMonthlyFertilizerDemandKg,
          demandFulfillmentPercent,
          totalDistributedLiters,
          totalChemicalReplacedKg,
          totalFarmerSavingsINR,
          appliedToFieldCount,
          labVerifiedCount,
          registeredFarmersCount: farmers.length
        },
        feedstockComposition: feedstockProfile,
        monthlyNpkSupplyKg,
        agronomyConstants: DIGESTATE_CONSTANTS,
        plantSupplies,
        farmers,
        matchingPlan,
        distributions,
        supplyDemandChart
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register farmer & agricultural land plot with strict validation
// @route   POST /api/digestate/farmers
// @access  Private
const registerFarmerLand = async (req, res, next) => {
  try {
    const {
      farmerName,
      villageId,
      contactPhone,
      landAreaAcres,
      soilType,
      primaryCrop,
      croppingSeason,
      fertilizerRequiredKgPerMonth,
      preferredApplicationType,
      notes
    } = req.body;

    const errors = collectErrors([
      !farmerName || !farmerName.trim() ? 'Farmer name is required.' : null,
      !primaryCrop || !primaryCrop.trim() ? 'Primary crop is required.' : null,
      validateNumberInRange(landAreaAcres, 'Land area (acres)', 0.1, 500, { required: true }),
      validateNumberInRange(fertilizerRequiredKgPerMonth, 'Monthly fertilizer required (kg)', 10, 50000, {
        required: true
      })
    ]);

    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }

    const assignedVillage = villageId || (req.user.village ? req.user.village._id || req.user.village : null);
    if (!assignedVillage) {
      return res.status(400).json({ success: false, message: 'Village ID is required' });
    }

    const village = await Village.findById(assignedVillage);
    const location = {
      latitude: village ? village.location.latitude + (Math.random() - 0.5) * 0.008 : 25.3176,
      longitude: village ? village.location.longitude + (Math.random() - 0.5) * 0.008 : 82.9739
    };

    const farmer = await FarmerLand.create({
      farmerName: farmerName.trim(),
      village: assignedVillage,
      contactPhone: contactPhone || '',
      landAreaAcres: Number(landAreaAcres),
      soilType: soilType || 'Alluvial',
      primaryCrop: primaryCrop.trim(),
      croppingSeason: croppingSeason || 'Rabi',
      fertilizerRequiredKgPerMonth: Number(fertilizerRequiredKgPerMonth),
      preferredApplicationType: preferredApplicationType || 'Liquid Bio-Slurry',
      location,
      notes: notes || ''
    });

    await logAuditEvent(req, {
      action: 'FARMER_LAND_REGISTERED',
      entityType: 'FarmerLand',
      entityId: farmer._id,
      summary: `Registered farmland for ${farmer.farmerName} (${farmer.landAreaAcres} acres, ${farmer.primaryCrop})`
    });

    res.status(201).json({
      success: true,
      data: farmer
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Record a digestate distribution batch (with storage losses, NPK mass & estimated/lab distinction)
// @route   POST /api/digestate/distributions
// @access  Private
const createDigestateDistribution = async (req, res, next) => {
  try {
    const {
      villageId,
      sourcePlantId,
      farmerLandId,
      distributionDate,
      digestateAllocatedLiters,
      applicationMethod = 'Liquid Bio-Slurry',
      nutrientVerificationSource = 'estimated',
      labReportReference = '',
      status = 'Scheduled',
      notes = ''
    } = req.body;

    const errors = collectErrors([
      !sourcePlantId ? 'Source biogas plant is required.' : null,
      !farmerLandId ? 'Recipient farmer land is required.' : null,
      validateNumberInRange(digestateAllocatedLiters, 'Digestate volume (L)', 10, 100000, { required: true })
    ]);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }

    const farmer = await FarmerLand.findById(farmerLandId);
    if (!farmer) {
      return res.status(404).json({ success: false, message: 'Registered farmer land not found' });
    }

    const lossSpec =
      DIGESTATE_CONSTANTS.storageLossesByMethod[applicationMethod] ||
      DIGESTATE_CONSTANTS.storageLossesByMethod['Liquid Bio-Slurry'];

    const liters = Number(digestateAllocatedLiters);
    const effectiveLiters = liters * (1 - lossSpec.handlingVolumeLossPercent / 100);
    const solidEquivalentKg = Number((effectiveLiters * DIGESTATE_CONSTANTS.dryManureKgPerLiter).toFixed(1));
    const nRetention = 1 - lossSpec.nitrogenLossPercent / 100;

    const estimatedNpkKg = {
      nitrogenKg: Number((solidEquivalentKg * 0.016 * nRetention).toFixed(2)),
      phosphorusKg: Number((solidEquivalentKg * 0.0105).toFixed(2)),
      potassiumKg: Number((solidEquivalentKg * 0.012).toFixed(2))
    };

    const chemicalReplacedKg = Number(
      (solidEquivalentKg * DIGESTATE_CONSTANTS.chemicalNpkReplacementRatio).toFixed(1)
    );
    const farmerSavingsINR = Math.round(solidEquivalentKg * DIGESTATE_CONSTANTS.savingsPerKgDryEquivalentINR);

    const distribution = await DigestateDistribution.create({
      village: villageId || farmer.village,
      sourcePlant: sourcePlantId,
      farmerLand: farmerLandId,
      distributionDate: distributionDate ? new Date(distributionDate) : new Date(),
      digestateAllocatedLiters: liters,
      applicationMethod,
      storageLossPercent: lossSpec.nitrogenLossPercent,
      solidFertilizerEquivalentKg: solidEquivalentKg,
      estimatedNpkKg,
      nutrientVerificationSource: nutrientVerificationSource === 'lab_verified' ? 'lab_verified' : 'estimated',
      labReportReference: labReportReference || '',
      chemicalFertilizerReplacedKg: chemicalReplacedKg,
      farmerSavingsINR,
      status,
      recordedBy: req.user._id,
      notes
    });

    await logAuditEvent(req, {
      action: 'DIGESTATE_ALLOCATED',
      entityType: 'DigestateDistribution',
      entityId: distribution._id,
      summary: `Allocated ${liters} L (${solidEquivalentKg} kg dry eq, ${nutrientVerificationSource}) to ${farmer.farmerName}`,
      metadata: { estimatedNpkKg, storageLossPercent: lossSpec.nitrogenLossPercent }
    });

    res.status(201).json({
      success: true,
      data: distribution
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update digestate distribution utilization status
// @route   PUT /api/digestate/distributions/:id
// @access  Private
const updateDistributionStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const allowedStatuses = ['Scheduled', 'Dispatched', 'Delivered', 'Applied to Field'];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid distribution status.' });
    }

    const updated = await DigestateDistribution.findByIdAndUpdate(
      req.params.id,
      { ...(status ? { status } : {}), ...(notes !== undefined ? { notes } : {}) },
      { new: true, runValidators: true }
    )
      .populate('sourcePlant', 'plantName')
      .populate('farmerLand', 'farmerName primaryCrop');

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Distribution record not found' });
    }

    await logAuditEvent(req, {
      action: 'DIGESTATE_STATUS_UPDATED',
      entityType: 'DigestateDistribution',
      entityId: updated._id,
      summary: `Updated digestate batch status to "${updated.status}" for ${updated.farmerLand?.farmerName || 'Farmer'}`
    });

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDigestateSummary,
  registerFarmerLand,
  createDigestateDistribution,
  updateDistributionStatus,
  DIGESTATE_CONSTANTS
};
