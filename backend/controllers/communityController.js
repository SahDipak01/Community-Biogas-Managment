const CommunityContribution = require('../models/CommunityContribution');
const Household = require('../models/Household');
const CattleRecord = require('../models/CattleRecord');
const Village = require('../models/Village');
const BiogasPlant = require('../models/BiogasPlant');

// @desc    Get community pooling summary for a village
// @route   GET /api/community/pooling-summary
// @access  Private
const getPoolingSummary = async (req, res, next) => {
  try {
    const { villageId } = req.query;
    const targetVillageId = villageId || (req.user.village ? req.user.village._id || req.user.village : null);

    if (!targetVillageId) {
      return res.status(400).json({
        success: false,
        message: 'Village ID is required to view pooling summary'
      });
    }

    const village = await Village.findById(targetVillageId);
    if (!village) {
      return res.status(404).json({
        success: false,
        message: 'Village not found'
      });
    }

    // 1. All contributions in village
    const contributions = await CommunityContribution.find({
      village: targetVillageId,
      agreementStatus: 'Active'
    }).populate('household', 'householdCode headOfFamily location familyMembers contactPhone');

    // 2. Aggregate combined feedstock
    const totalDungCommittedKg = contributions.reduce((acc, c) => acc + (c.dailyDungCommittedKg || 0), 0);
    const totalAgriCommittedKg = contributions.reduce((acc, c) => acc + (c.agriWasteCommittedKg || 0), 0);
    const totalKitchenCommittedKg = contributions.reduce((acc, c) => acc + (c.kitchenWasteCommittedKg || 0), 0);
    const combinedDailyFeedstockKg = totalDungCommittedKg + totalAgriCommittedKg + totalKitchenCommittedKg;

    // 3. Recommended Community Plant Capacity based on combined pool
    let recommendedCommunityCapacityM3 = 0;
    if (combinedDailyFeedstockKg >= 2000) {
      recommendedCommunityCapacityM3 = 85;
    } else if (combinedDailyFeedstockKg >= 1050) {
      recommendedCommunityCapacityM3 = 45;
    } else if (combinedDailyFeedstockKg >= 580) {
      recommendedCommunityCapacityM3 = 25;
    } else if (combinedDailyFeedstockKg >= 240) {
      recommendedCommunityCapacityM3 = 10;
    } else if (combinedDailyFeedstockKg >= 140) {
      recommendedCommunityCapacityM3 = 6;
    } else {
      recommendedCommunityCapacityM3 = Math.max(2, Math.floor(combinedDailyFeedstockKg / 25));
    }

    // 4. Feasibility threshold check for village
    const hasSufficientResources = combinedDailyFeedstockKg >= 140; // minimum 6m3 cluster plant

    // 5. Geospatial Centroid / Suitable Community Plant Locations
    // Calculate geographical center of mass of participating households
    let centerLat = village.location.latitude;
    let centerLng = village.location.longitude;

    const validHouseholdCoords = contributions
      .filter(c => c.household && c.household.location && c.household.location.latitude)
      .map(c => ({
        lat: c.household.location.latitude,
        lng: c.household.location.longitude,
        weight: c.totalDailyContributionKg || 10
      }));

    if (validHouseholdCoords.length > 0) {
      const totalWeight = validHouseholdCoords.reduce((acc, c) => acc + c.weight, 0);
      centerLat = validHouseholdCoords.reduce((acc, c) => acc + c.lat * c.weight, 0) / totalWeight;
      centerLng = validHouseholdCoords.reduce((acc, c) => acc + c.lng * c.weight, 0) / totalWeight;
    }

    const potentialPlantLocations = [
      {
        siteName: `${village.name} Central Gram Panchayat Complex`,
        latitude: Number((centerLat + 0.0015).toFixed(4)),
        longitude: Number((centerLng - 0.0010).toFixed(4)),
        suitabilityScore: 92,
        advantages: ['Close to community water borewell', 'Paved tractor access for feedstock transport', 'Central to 85% of contributor households'],
        recommendedCapacityM3: recommendedCommunityCapacityM3
      },
      {
        siteName: `${village.name} Dairy Cooperative Yard`,
        latitude: Number((centerLat - 0.0025).toFixed(4)),
        longitude: Number((centerLng + 0.0020).toFixed(4)),
        suitabilityScore: 86,
        advantages: ['Direct access to commercial dairy dung', 'Space for bio-slurry drying beds and distribution'],
        recommendedCapacityM3: Math.max(10, recommendedCommunityCapacityM3)
      }
    ];

    res.json({
      success: true,
      data: {
        village: {
          id: village._id,
          name: village.name,
          district: village.district,
          state: village.state,
          totalHouseholds: village.totalHouseholds,
          location: village.location
        },
        contributorCount: contributions.length,
        combinedFeedstock: {
          totalDungCommittedKg,
          totalAgriCommittedKg,
          totalKitchenCommittedKg,
          combinedDailyFeedstockKg: Math.round(combinedDailyFeedstockKg),
          estimatedDailyBiogasM3: Number((combinedDailyFeedstockKg * 0.038).toFixed(1)),
          dailySlurryOutputLiters: Math.round(combinedDailyFeedstockKg * 0.95)
        },
        sufficiencyAssessment: {
          hasSufficientResources,
          recommendedCommunityCapacityM3,
          beneficiaryHouseholdsServed: Math.round(recommendedCommunityCapacityM3 / 0.5),
          status: hasSufficientResources ? 'Sufficient Resources for Community Plant' : 'Resource Pooling In Progress (Needs more contributors)'
        },
        potentialPlantLocations,
        contributions
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register a new household contribution agreement
// @route   POST /api/community/contribute
// @access  Private
const createContributionAgreement = async (req, res, next) => {
  try {
    const {
      villageId,
      householdId,
      dailyDungCommittedKg,
      agriWasteCommittedKg = 0,
      kitchenWasteCommittedKg = 0,
      targetCommunityPlantId,
      notes
    } = req.body;

    const assignedVillage = villageId || (req.user.village ? req.user.village._id || req.user.village : null);

    const dung = Number(dailyDungCommittedKg) || 0;
    const agri = Number(agriWasteCommittedKg) || 0;
    const kitchen = Number(kitchenWasteCommittedKg) || 0;
    const totalDailyContributionKg = dung + agri + kitchen;

    // Slurry entitlement proportional to input (approx 90% liquid return)
    const slurryEntitlementLitersPerDay = Math.round(totalDailyContributionKg * 0.85);

    const contribution = await CommunityContribution.create({
      village: assignedVillage,
      household: householdId,
      dailyDungCommittedKg: dung,
      agriWasteCommittedKg: agri,
      kitchenWasteCommittedKg: kitchen,
      totalDailyContributionKg,
      slurryEntitlementLitersPerDay,
      targetCommunityPlant: targetCommunityPlantId || null,
      agreementStatus: 'Active',
      incentiveCredits: Math.round(totalDailyContributionKg * 10), // 10 credits per kg/month
      notes: notes || ''
    });

    res.status(201).json({
      success: true,
      data: contribution
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPoolingSummary,
  createContributionAgreement
};
