const Village = require('../models/Village');
const Household = require('../models/Household');
const BiogasPlant = require('../models/BiogasPlant');
const CattleRecord = require('../models/CattleRecord');

// @desc    Get all spatial map features for Leaflet & OpenStreetMap
// @route   GET /api/map/features
// @access  Public (or Private)
const getMapFeatures = async (req, res, next) => {
  try {
    const { villageId } = req.query;

    const villageQuery = villageId && villageId !== 'all' ? { _id: villageId } : {};
    const refQuery = villageId && villageId !== 'all' ? { village: villageId } : {};

    // 1. Villages
    const villages = await Village.find(villageQuery);

    // 2. Biogas Plants
    const plants = await BiogasPlant.find(refQuery).populate('village', 'name district state');

    // 3. Registered Households
    const households = await Household.find(refQuery).populate('village', 'name');

    // 4. Waste Collection Hubs & Potential Community Sites
    const collectionPoints = villages.map(v => ({
      id: `CP-${v._id}`,
      name: `${v.name} Organic Waste Collection Center`,
      type: 'collection_point',
      village: v.name,
      location: {
        latitude: v.location.latitude + 0.0012,
        longitude: v.location.longitude + 0.0015
      },
      capacityKgPerDay: 500,
      operationalHours: '06:00 AM - 10:00 AM'
    }));

    const potentialSites = villages.map(v => ({
      id: `POT-${v._id}`,
      name: `${v.name} Potential Community Plant Hub`,
      type: 'potential_plant',
      village: v.name,
      location: {
        latitude: v.location.latitude - 0.0018,
        longitude: v.location.longitude - 0.0012
      },
      recommendedCapacityM3: 45,
      suitabilityScore: 89,
      feedstockRadiusKm: 1.5
    }));

    // Format map pins
    const plantMarkers = plants.map(p => ({
      id: p._id,
      name: p.plantName,
      code: p.plantCode,
      type: 'biogas_plant',
      plantType: p.plantType,
      capacityM3: p.capacityM3,
      status: p.status,
      isCommunityPlant: p.isCommunityPlant,
      location: p.location,
      villageName: p.village ? p.village.name : 'Unknown Village',
      details: {
        installationCost: p.installationCost,
        subsidyReceived: p.subsidyReceived,
        gasUtilization: p.gasUtilization
      }
    }));

    const householdMarkers = households.map(h => ({
      id: h._id,
      code: h.householdCode,
      name: h.headOfFamily,
      type: 'household',
      location: h.location,
      familyMembers: h.familyMembers,
      villageName: h.village ? h.village.name : 'Unknown Village',
      hasBiogasPlant: h.hasBiogasPlant,
      waterSource: h.waterSource
    }));

    res.json({
      success: true,
      data: {
        villages,
        plants: plantMarkers,
        households: householdMarkers,
        collectionPoints,
        potentialSites
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMapFeatures
};
