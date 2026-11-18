const Village = require('../models/Village');
const Household = require('../models/Household');
const CattleRecord = require('../models/CattleRecord');
const BiogasPlant = require('../models/BiogasPlant');
const CommunityContribution = require('../models/CommunityContribution');
const {
  computeOptimalFacilityLocation,
  optimizeCollectionRoutes,
  evaluateCandidateSites,
  haversineDistanceKm
} = require('../utils/routeOptimizer');

// @desc    Analyze village locations, distances, transport costs, and optimize collection routes
// @route   GET /api/optimizer/analyze
// @access  Private
const analyzeAllocationAndRoutes = async (req, res, next) => {
  try {
    const {
      villageId,
      vehicleCapacityKg = 250,
      plantCapacityM3 = 25,
      transportCostPerKmINR = 18,
      selectedSiteId = 'optimal_median'
    } = req.query;

    // Resolve village
    let village = null;
    if (villageId && villageId !== 'all') {
      village = await Village.findById(villageId);
    } else if (req.user?.village) {
      village = await Village.findById(req.user.village._id || req.user.village);
    }
    if (!village) {
      village = await Village.findOne();
    }
    if (!village) {
      return res.status(404).json({ success: false, message: 'No registered villages found' });
    }

    // Fetch real households, cattle records, community agreements, and existing plants
    const [households, cattleRecords, contributions, existingPlants] = await Promise.all([
      Household.find({ village: village._id }),
      CattleRecord.find({ village: village._id }),
      CommunityContribution.find({ village: village._id, agreementStatus: 'Active' }),
      BiogasPlant.find({ village: village._id })
    ]);

    // Map daily dung/feedstock per household from real DB records
    const dungByHousehold = {};
    cattleRecords.forEach((c) => {
      const hId = c.household.toString();
      dungByHousehold[hId] = (dungByHousehold[hId] || 0) + (c.dailyDungTotalKg || 0);
    });

    const contributionByHousehold = {};
    contributions.forEach((c) => {
      const hId = c.household.toString();
      contributionByHousehold[hId] = c.totalDailyContributionKg || 0;
    });

    const enrichedHouseholds = households.map((h) => {
      const hId = h._id.toString();
      const cattleDung = dungByHousehold[hId] || 0;
      const committed = contributionByHousehold[hId] || 0;
      // Use actual cattle dung + kitchen/agri estimate or community commitment
      const dailyFeedstockKg = Number(Math.max(cattleDung, committed, 12).toFixed(1));

      return {
        id: hId,
        code: h.householdCode,
        name: h.headOfFamily,
        familyMembers: h.familyMembers,
        waterSource: h.waterSource,
        hasBiogasPlant: h.hasBiogasPlant,
        latitude: h.location.latitude,
        longitude: h.location.longitude,
        cattleDungKg: cattleDung,
        committedKg: committed,
        dailyFeedstockKg,
        weight: dailyFeedstockKg
      };
    });

    // If village has no registered households yet, generate synthetic cluster around village center for planning
    const planningHouseholds =
      enrichedHouseholds.length > 0
        ? enrichedHouseholds
        : [
            {
              id: 'cluster-north',
              code: 'CL-N1',
              name: `${village.name} North Dairy Cluster`,
              latitude: village.location.latitude + 0.0025,
              longitude: village.location.longitude + 0.0018,
              dailyFeedstockKg: Math.round((village.estimatedCattle || 120) * 3.5),
              weight: Math.round((village.estimatedCattle || 120) * 3.5)
            },
            {
              id: 'cluster-south',
              code: 'CL-S1',
              name: `${village.name} South Farm Cluster`,
              latitude: village.location.latitude - 0.0022,
              longitude: village.location.longitude - 0.0015,
              dailyFeedstockKg: Math.round((village.estimatedCattle || 120) * 2.8),
              weight: Math.round((village.estimatedCattle || 120) * 2.8)
            },
            {
              id: 'cluster-east',
              code: 'CL-E1',
              name: `${village.name} East Livestock Sheds`,
              latitude: village.location.latitude + 0.0011,
              longitude: village.location.longitude - 0.0028,
              dailyFeedstockKg: Math.round((village.estimatedCattle || 120) * 2.2),
              weight: Math.round((village.estimatedCattle || 120) * 2.2)
            }
          ];

    // 1. Compute Weiszfeld Optimal Plant Location (Geometric Median weighted by feedstock)
    const optimalMedianCoord = computeOptimalFacilityLocation(planningHouseholds);

    // 2. Build Candidate Plant Locations (Optimal Median + Existing Community Hub + Panchayat & Dairy sites)
    const candidateRaw = [
      {
        siteId: 'optimal_median',
        siteName: `${village.name} Optimal Geometric Median Site`,
        siteType: 'Recommended Optimal Site',
        latitude: optimalMedianCoord.latitude,
        longitude: optimalMedianCoord.longitude,
        infrastructureBonus: 5,
        advantages: [
          'Mathematically minimizes weighted feedstock haulage distance',
          'Lowest daily collection fuel and labor expenditure',
          'Balanced proximity to major bovine livestock households'
        ]
      },
      {
        siteId: 'panchayat_depot',
        siteName: `${village.name} Gram Panchayat Land Parcel`,
        siteType: 'Public Land Candidate',
        latitude: Number((village.location.latitude + 0.0014).toFixed(5)),
        longitude: Number((village.location.longitude - 0.0011).toFixed(5)),
        infrastructureBonus: 3,
        advantages: [
          'Zero land acquisition cost (Gram Sabha community parcel)',
          'Existing paved road access and 3-phase power line',
          'Proximity to community borewell for 1:1 slurry dilution'
        ]
      },
      {
        siteId: 'dairy_coop',
        siteName: `${village.name} Dairy Cooperative & Waste Hub`,
        siteType: 'Agri-Cooperative Candidate',
        latitude: Number((village.location.latitude - 0.0021).toFixed(5)),
        longitude: Number((village.location.longitude + 0.0019).toFixed(5)),
        infrastructureBonus: 2,
        advantages: [
          'Adjacent to milk collection society for morning dung drop-off',
          'Open buffer zone for bio-slurry drying beds',
          'Downwind from main residential settlement'
        ]
      }
    ];

    // Include existing community plant as an option if present
    const communityPlant = existingPlants.find((p) => p.isCommunityPlant);
    if (communityPlant && communityPlant.location) {
      candidateRaw.push({
        siteId: `plant_${communityPlant._id}`,
        siteName: `${communityPlant.plantName} (Existing Hub)`,
        siteType: 'Existing Community Plant',
        latitude: communityPlant.location.latitude,
        longitude: communityPlant.location.longitude,
        infrastructureBonus: 4,
        advantages: [
          'Existing digester infrastructure and gas distribution pipeline',
          `Rated capacity: ${communityPlant.capacityM3} m³/day`,
          'Immediate operational readiness without CAPEX delay'
        ]
      });
    }

    const costPerKm = Math.max(1, Number(transportCostPerKmINR) || 18);
    const vCap = Math.max(30, Number(vehicleCapacityKg) || 250);
    const pCap = Math.max(2, Number(plantCapacityM3) || 25);

    const evaluatedSites = evaluateCandidateSites(candidateRaw, planningHouseholds, costPerKm);

    // Choose active depot for route optimization
    const activeDepot =
      evaluatedSites.find((s) => s.siteId === selectedSiteId) || evaluatedSites[0];

    // 3. Optimize Collection Routes around the selected depot
    const routeOptimization = optimizeCollectionRoutes({
      depot: activeDepot,
      households: planningHouseholds,
      vehicleCapacityKg: vCap,
      plantCapacityM3: pCap,
      transportCostPerKmINR: costPerKm
    });

    // 4. Collection Points (Aggregation Hubs)
    const collectionPoints = [
      {
        id: `hub-1-${village._id}`,
        name: `${village.name} Primary Dung Aggregation Depot`,
        latitude: Number((village.location.latitude + 0.0012).toFixed(5)),
        longitude: Number((village.location.longitude + 0.0015).toFixed(5)),
        distanceToPlantKm: Number(
          (
            haversineDistanceKm(
              activeDepot.latitude,
              activeDepot.longitude,
              village.location.latitude + 0.0012,
              village.location.longitude + 0.0015
            ) * 1.25
          ).toFixed(2)
        ),
        intakeCapacityKg: 500
      },
      {
        id: `hub-2-${village._id}`,
        name: `${village.name} Agricultural Residue Shredding Yard`,
        latitude: Number((village.location.latitude - 0.0016).toFixed(5)),
        longitude: Number((village.location.longitude - 0.0009).toFixed(5)),
        distanceToPlantKm: Number(
          (
            haversineDistanceKm(
              activeDepot.latitude,
              activeDepot.longitude,
              village.location.latitude - 0.0016,
              village.location.longitude - 0.0009
            ) * 1.25
          ).toFixed(2)
        ),
        intakeCapacityKg: 350
      }
    ];

    const totalAvailableFeedstockKg = Number(
      planningHouseholds.reduce((acc, h) => acc + h.dailyFeedstockKg, 0).toFixed(1)
    );

    res.json({
      success: true,
      data: {
        village: {
          id: village._id,
          name: village.name,
          district: village.district,
          state: village.state,
          location: village.location
        },
        parameters: {
          vehicleCapacityKg: vCap,
          plantCapacityM3: pCap,
          transportCostPerKmINR: costPerKm,
          selectedSiteId: activeDepot.siteId
        },
        resourceOverview: {
          totalHouseholdsAnalyzed: planningHouseholds.length,
          totalAvailableFeedstockKg,
          recommendedCapacityM3: Math.max(4, Math.round(totalAvailableFeedstockKg / 25)),
          estimatedDailyBiogasM3: Number((totalAvailableFeedstockKg * 0.038).toFixed(1))
        },
        activeDepot,
        candidateSites: evaluatedSites,
        collectionPoints,
        households: planningHouseholds,
        existingPlants: existingPlants.map((p) => ({
          id: p._id,
          plantName: p.plantName,
          plantCode: p.plantCode,
          capacityM3: p.capacityM3,
          status: p.status,
          isCommunityPlant: p.isCommunityPlant,
          location: p.location
        })),
        routeOptimization
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  analyzeAllocationAndRoutes
};
