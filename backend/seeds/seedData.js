const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Village = require('../models/Village');
const Household = require('../models/Household');
const CattleRecord = require('../models/CattleRecord');
const FeedstockRecord = require('../models/FeedstockRecord');
const BiogasPlant = require('../models/BiogasPlant');
const PlantMonitoring = require('../models/PlantMonitoring');
const CommunityContribution = require('../models/CommunityContribution');
const GovernmentScheme = require('../models/GovernmentScheme');
const Notification = require('../models/Notification');
const DailyContributionLog = require('../models/DailyContributionLog');
const FarmerLand = require('../models/FarmerLand');
const DigestateDistribution = require('../models/DigestateDistribution');
const SimulationScenario = require('../models/SimulationScenario');
const { runSimulationModel } = require('../controllers/simulatorController');

async function seedDatabaseIfEmpty() {
  const userCount = await User.countDocuments();
  if (userCount > 0) {
    console.log('[Seed] Database already populated with records. Skipping seed.');
    return;
  }
  console.log('[Seed] Database is empty. Seeding realistic sample dataset for Rural Community Biogas System...');
  await runSeed();
}

async function runSeed() {
  try {
    // 1. Create Villages
    const rampur = await Village.create({
      name: 'Rampur Gram Panchayat',
      district: 'Varanasi',
      state: 'Uttar Pradesh',
      pincode: '221001',
      location: { latitude: 25.3176, longitude: 82.9739 },
      population: 1850,
      totalHouseholds: 280,
      estimatedCattle: 420,
      climateZone: 'Subtropical Humid',
      description: 'Major agrarian village along the Ganga basin with extensive dairy farming and sugarcane cultivation.'
    });

    const sundarpur = await Village.create({
      name: 'Sundarpur Village',
      district: 'Anand',
      state: 'Gujarat',
      pincode: '388001',
      location: { latitude: 22.5645, longitude: 72.9289 },
      population: 2200,
      totalHouseholds: 340,
      estimatedCattle: 680,
      climateZone: 'Arid / Semi-Arid',
      description: 'Progressive cooperative dairy belt with dedicated milk societies and high bovine concentration.'
    });

    const shantigram = await Village.create({
      name: 'Shanti Gram',
      district: 'Mandya',
      state: 'Karnataka',
      pincode: '571401',
      location: { latitude: 12.5218, longitude: 76.8951 },
      population: 1400,
      totalHouseholds: 210,
      estimatedCattle: 310,
      climateZone: 'Tropical Wet',
      description: 'Serene Kaveri river basin community with active sericulture and sugarcane residue.'
    });

    // 2. Create Users (pre-save hook in User model will hash password once)
    const admin = await User.create({
      name: 'Dr. Rajeshwar Sharma',
      email: 'admin@biogas.gov.in',
      password: 'Admin@123',
      role: 'admin',
      phone: '+91 98765 43210',
      status: 'active'
    });

    const coordinator = await User.create({
      name: 'Virendra Singh Patel',
      email: 'coordinator@biogas.gov.in',
      password: 'Coord@123',
      role: 'coordinator',
      phone: '+91 98111 22334',
      village: rampur._id,
      status: 'active'
    });

    // Link coordinator to village
    rampur.coordinator = coordinator._id;
    await rampur.save();

    const householdUser = await User.create({
      name: 'Rameshwar Lal Yadav',
      email: 'household@biogas.gov.in',
      password: 'House@123',
      role: 'household',
      phone: '+91 94150 99887',
      village: rampur._id,
      status: 'active'
    });

    // 3. Create Households in Rampur
    const householdsData = [
      {
        householdCode: 'HH-RAM-001',
        headOfFamily: 'Rameshwar Lal Yadav',
        user: householdUser._id,
        village: rampur._id,
        familyMembers: 6,
        contactPhone: '+91 94150 99887',
        location: { latitude: 25.3188, longitude: 82.9745 },
        lpgConsumptionMonthlyCylinders: 1.5,
        firewoodConsumptionKgPerMonth: 80,
        waterAvailabilityLitersPerDay: 150,
        waterSource: 'Borewell',
        hasBiogasPlant: true,
        willingToPoolWaste: true
      },
      {
        householdCode: 'HH-RAM-002',
        headOfFamily: 'Savitri Devi Maurya',
        village: rampur._id,
        familyMembers: 5,
        contactPhone: '+91 94150 11223',
        location: { latitude: 25.3165, longitude: 82.9722 },
        lpgConsumptionMonthlyCylinders: 1.0,
        firewoodConsumptionKgPerMonth: 60,
        waterAvailabilityLitersPerDay: 120,
        waterSource: 'Community Well',
        hasBiogasPlant: true,
        willingToPoolWaste: true
      },
      {
        householdCode: 'HH-RAM-003',
        headOfFamily: 'Kishan Chand Verma',
        village: rampur._id,
        familyMembers: 8,
        contactPhone: '+91 94150 33445',
        location: { latitude: 25.3195, longitude: 82.9760 },
        lpgConsumptionMonthlyCylinders: 2.0,
        firewoodConsumptionKgPerMonth: 120,
        waterAvailabilityLitersPerDay: 200,
        waterSource: 'Borewell',
        hasBiogasPlant: true,
        willingToPoolWaste: true
      },
      {
        householdCode: 'HH-RAM-004',
        headOfFamily: 'Santosh Kumar Tiwari',
        village: rampur._id,
        familyMembers: 4,
        contactPhone: '+91 94150 55667',
        location: { latitude: 25.3150, longitude: 82.9710 },
        lpgConsumptionMonthlyCylinders: 1.0,
        firewoodConsumptionKgPerMonth: 40,
        waterAvailabilityLitersPerDay: 80,
        waterSource: 'Piped Tap Water',
        hasBiogasPlant: false,
        willingToPoolWaste: true
      },
      {
        householdCode: 'HH-RAM-005',
        headOfFamily: 'Anita Bind',
        village: rampur._id,
        familyMembers: 4,
        contactPhone: '+91 94150 77889',
        location: { latitude: 25.3202, longitude: 82.9728 },
        lpgConsumptionMonthlyCylinders: 1.0,
        firewoodConsumptionKgPerMonth: 50,
        waterAvailabilityLitersPerDay: 70,
        waterSource: 'Borewell',
        hasBiogasPlant: false,
        willingToPoolWaste: true
      },
      {
        householdCode: 'HH-RAM-006',
        headOfFamily: 'Mohan Lal Gond',
        village: rampur._id,
        familyMembers: 7,
        contactPhone: '+91 94150 99001',
        location: { latitude: 25.3142, longitude: 82.9752 },
        lpgConsumptionMonthlyCylinders: 1.8,
        firewoodConsumptionKgPerMonth: 90,
        waterAvailabilityLitersPerDay: 130,
        waterSource: 'Canal / Pond',
        hasBiogasPlant: false,
        willingToPoolWaste: true
      }
    ];

    const createdHouseholds = await Household.insertMany(householdsData);
    householdUser.household = createdHouseholds[0]._id;
    await householdUser.save();

    // 4. Create Cattle Records
    const cattleData = [
      // HH-RAM-001 (Rameshwar)
      { household: createdHouseholds[0]._id, village: rampur._id, cattleType: 'Cow', count: 3, avgDungPerAnimalKg: 11, dailyDungTotalKg: 33 },
      { household: createdHouseholds[0]._id, village: rampur._id, cattleType: 'Buffalo', count: 2, avgDungPerAnimalKg: 16, dailyDungTotalKg: 32 },
      // HH-RAM-002 (Savitri)
      { household: createdHouseholds[1]._id, village: rampur._id, cattleType: 'Cow', count: 2, avgDungPerAnimalKg: 10, dailyDungTotalKg: 20 },
      { household: createdHouseholds[1]._id, village: rampur._id, cattleType: 'Bullock', count: 2, avgDungPerAnimalKg: 12, dailyDungTotalKg: 24 },
      // HH-RAM-003 (Kishan Chand)
      { household: createdHouseholds[2]._id, village: rampur._id, cattleType: 'Buffalo', count: 4, avgDungPerAnimalKg: 16, dailyDungTotalKg: 64 },
      { household: createdHouseholds[2]._id, village: rampur._id, cattleType: 'Calf', count: 2, avgDungPerAnimalKg: 5, dailyDungTotalKg: 10 },
      // HH-RAM-004 (Santosh)
      { household: createdHouseholds[3]._id, village: rampur._id, cattleType: 'Cow', count: 2, avgDungPerAnimalKg: 11, dailyDungTotalKg: 22 },
      // HH-RAM-005 (Anita)
      { household: createdHouseholds[4]._id, village: rampur._id, cattleType: 'Buffalo', count: 1, avgDungPerAnimalKg: 15, dailyDungTotalKg: 15 },
      // HH-RAM-006 (Mohan)
      { household: createdHouseholds[5]._id, village: rampur._id, cattleType: 'Cow', count: 2, avgDungPerAnimalKg: 10, dailyDungTotalKg: 20 },
      { household: createdHouseholds[5]._id, village: rampur._id, cattleType: 'Bullock', count: 1, avgDungPerAnimalKg: 13, dailyDungTotalKg: 13 }
    ];

    await CattleRecord.insertMany(cattleData);

    // 5. Create Biogas Plants
    const plant1 = await BiogasPlant.create({
      plantName: 'Yadav Dairy Biogas Plant',
      plantCode: 'BG-RAM-01',
      plantType: 'Fixed Dome (Deenabandhu)',
      capacityM3: 3.0,
      village: rampur._id,
      ownerHousehold: createdHouseholds[0]._id,
      isCommunityPlant: false,
      installationDate: new Date('2025-04-15'),
      installationCost: 58000,
      subsidyReceived: 16500,
      location: { latitude: 25.3187, longitude: 82.9744 },
      status: 'Active',
      installerAgency: 'UP New & Renewable Energy Development Agency (UPNEDA)',
      gasUtilization: 'Household Cooking',
      dailyDesignFeedstockKg: 75,
      dailyDesignWaterLiters: 75
    });

    const plant2 = await BiogasPlant.create({
      plantName: 'Maurya Farm Biogas Unit',
      plantCode: 'BG-RAM-02',
      plantType: 'Fixed Dome (Deenabandhu)',
      capacityM3: 2.0,
      village: rampur._id,
      ownerHousehold: createdHouseholds[1]._id,
      isCommunityPlant: false,
      installationDate: new Date('2025-08-20'),
      installationCost: 44000,
      subsidyReceived: 14350,
      location: { latitude: 25.3164, longitude: 82.9721 },
      status: 'Active',
      installerAgency: 'UPNEDA',
      gasUtilization: 'Household Cooking',
      dailyDesignFeedstockKg: 50,
      dailyDesignWaterLiters: 50
    });

    const plant3 = await BiogasPlant.create({
      plantName: 'Verma Dairy Cluster Plant',
      plantCode: 'BG-RAM-03',
      plantType: 'Floating Drum (KVIC)',
      capacityM3: 4.0,
      village: rampur._id,
      ownerHousehold: createdHouseholds[2]._id,
      isCommunityPlant: false,
      installationDate: new Date('2025-06-10'),
      installationCost: 74000,
      subsidyReceived: 19000,
      location: { latitude: 25.3194, longitude: 82.9759 },
      status: 'Under Maintenance',
      installerAgency: 'Khadi & Village Industries Commission (KVIC)',
      gasUtilization: 'Household Cooking',
      dailyDesignFeedstockKg: 100,
      dailyDesignWaterLiters: 100
    });

    const plantCommunity = await BiogasPlant.create({
      plantName: 'Rampur Gram Panchayat Community Biogas Hub',
      plantCode: 'BG-RAM-COMM-01',
      plantType: 'Pre-fabricated / Bag Digester',
      capacityM3: 25.0,
      village: rampur._id,
      ownerHousehold: null,
      isCommunityPlant: true,
      participatingHouseholds: [
        createdHouseholds[3]._id,
        createdHouseholds[4]._id,
        createdHouseholds[5]._id
      ],
      installationDate: new Date('2026-01-10'),
      installationCost: 480000,
      subsidyReceived: 175000,
      location: { latitude: 25.3170, longitude: 82.9735 },
      status: 'Active',
      installerAgency: 'National Bioenergy Mission / Gobardhan Scheme',
      gasUtilization: 'Community Kitchen',
      dailyDesignFeedstockKg: 625,
      dailyDesignWaterLiters: 625
    });

    // Link plants to households
    createdHouseholds[0].biogasPlant = plant1._id;
    await createdHouseholds[0].save();
    createdHouseholds[1].biogasPlant = plant2._id;
    await createdHouseholds[1].save();
    createdHouseholds[2].biogasPlant = plant3._id;
    await createdHouseholds[2].save();

    // 6. Create Community Contribution Agreements
    const contributionsData = [
      {
        village: rampur._id,
        household: createdHouseholds[3]._id,
        dailyDungCommittedKg: 20,
        agriWasteCommittedKg: 6,
        kitchenWasteCommittedKg: 2,
        totalDailyContributionKg: 28,
        slurryEntitlementLitersPerDay: 24,
        targetCommunityPlant: plantCommunity._id,
        agreementStatus: 'Active',
        incentiveCredits: 280
      },
      {
        village: rampur._id,
        household: createdHouseholds[4]._id,
        dailyDungCommittedKg: 14,
        agriWasteCommittedKg: 4,
        kitchenWasteCommittedKg: 2,
        totalDailyContributionKg: 20,
        slurryEntitlementLitersPerDay: 17,
        targetCommunityPlant: plantCommunity._id,
        agreementStatus: 'Active',
        incentiveCredits: 200
      },
      {
        village: rampur._id,
        household: createdHouseholds[5]._id,
        dailyDungCommittedKg: 30,
        agriWasteCommittedKg: 10,
        kitchenWasteCommittedKg: 3,
        totalDailyContributionKg: 43,
        slurryEntitlementLitersPerDay: 36,
        targetCommunityPlant: plantCommunity._id,
        agreementStatus: 'Active',
        incentiveCredits: 430
      }
    ];

    await CommunityContribution.insertMany(contributionsData);

    // 7. Create Feedstock Records for the past 20 days
    const feedstockList = [];
    const seasons = ['Summer', 'Winter', 'Monsoon', 'Post-Monsoon'];
    for (let i = 20; i >= 0; i--) {
      const logDate = new Date();
      logDate.setDate(logDate.getDate() - i);

      // Community plant feedstock batch
      const dailyDung = 580 + Math.round((Math.sin(i) * 35));
      const dailyAgri = 45 + Math.round((Math.cos(i) * 10));
      const dailyKitchen = 25 + Math.round((Math.sin(i * 2) * 5));

      feedstockList.push({
        village: rampur._id,
        household: null,
        collectionDate: logDate,
        dungKg: dailyDung,
        agriWasteKg: dailyAgri,
        kitchenWasteKg: dailyKitchen,
        totalKg: dailyDung + dailyAgri + dailyKitchen,
        season: 'Summer',
        collectorName: 'Rampur SHG Mahila Mandal',
        status: 'Fed to Digester',
        destinationPlant: plantCommunity._id
      });

      // Individual household feedstock (Rameshwar)
      feedstockList.push({
        village: rampur._id,
        household: createdHouseholds[0]._id,
        collectionDate: logDate,
        dungKg: 65 + (i % 5),
        agriWasteKg: 5,
        kitchenWasteKg: 2,
        totalKg: 72 + (i % 5),
        season: 'Summer',
        collectorName: 'Rameshwar Lal Yadav',
        status: 'Fed to Digester',
        destinationPlant: plant1._id
      });
    }

    await FeedstockRecord.insertMany(feedstockList);

    // 8. Create Plant Monitoring Records with simulated vs manual distinction & realistic alerts
    const monitoringList = [];
    for (let i = 15; i >= 0; i--) {
      const mDate = new Date();
      mDate.setDate(mDate.getDate() - i);

      // Plant 1: Normal healthy operation
      monitoringList.push({
        plant: plant1._id,
        date: mDate,
        feedstockInputKg: 72,
        waterAddedLiters: 70,
        gasProducedM3: 2.8,
        temperatureC: 33.5,
        phLevel: 7.2,
        slurryProducedLiters: 68,
        pressureKPa: 2.6,
        operationalStatus: 'Normal',
        readingType: i % 2 === 0 ? 'manual' : 'simulated',
        alerts: [],
        recordedBy: householdUser._id,
        notes: 'Steady blue flame observed on double-burner stove.'
      });

      // Plant 2: Low temperature alert on recent days (demonstration)
      const temp2 = i <= 2 ? 18.2 : 28.5;
      const alerts2 = [];
      if (temp2 < 20) {
        alerts2.push({
          alertType: 'LOW_TEMPERATURE',
          severity: 'high',
          message: `Low digester temperature (${temp2}°C). Methanogenic bacteria activity is critically suppressed below 20°C. Insulate digester dome, mix with lukewarm water, or employ transparent greenhouse solar sheeting.`
        });
      }

      monitoringList.push({
        plant: plant2._id,
        date: mDate,
        feedstockInputKg: 48,
        waterAddedLiters: 48,
        gasProducedM3: temp2 < 20 ? 1.1 : 1.9,
        temperatureC: temp2,
        phLevel: 7.0,
        slurryProducedLiters: 45,
        pressureKPa: 2.2,
        operationalStatus: alerts2.length > 0 ? 'Attention Needed' : 'Normal',
        readingType: 'manual',
        alerts: alerts2,
        recordedBy: coordinator._id,
        notes: temp2 < 20 ? 'Ambient temperature dipped during night. Insulating blanket draped on dome.' : 'Normal operation.'
      });

      // Plant 3: Abnormal pH / Acidification alert (under maintenance)
      const ph3 = i <= 3 ? 6.2 : 7.1;
      const alerts3 = [];
      if (ph3 < 6.5) {
        alerts3.push({
          alertType: 'ABNORMAL_PH',
          severity: 'high',
          message: `Acidification detected (pH ${ph3}). Acidogenic volatile fatty acids are accumulating faster than methanogens can consume them. Temporarily halt feeding and buffer with wood ash or calcium carbonate slurry.`
        });
      }

      monitoringList.push({
        plant: plant3._id,
        date: mDate,
        feedstockInputKg: ph3 < 6.5 ? 20 : 95,
        waterAddedLiters: 40,
        gasProducedM3: ph3 < 6.5 ? 1.4 : 3.8,
        temperatureC: 31.0,
        phLevel: ph3,
        slurryProducedLiters: 30,
        pressureKPa: 1.8,
        operationalStatus: 'Critical Anomaly',
        readingType: 'simulated',
        alerts: alerts3,
        recordedBy: coordinator._id,
        notes: 'Acid shock following high fruit waste addition. Lime water buffer added.'
      });

      // Community Plant 25m3: Steady high output
      monitoringList.push({
        plant: plantCommunity._id,
        date: mDate,
        feedstockInputKg: 640,
        waterAddedLiters: 600,
        gasProducedM3: 24.2,
        temperatureC: 35.0,
        phLevel: 7.3,
        slurryProducedLiters: 610,
        pressureKPa: 3.2,
        operationalStatus: 'Normal',
        readingType: 'manual',
        alerts: [],
        recordedBy: coordinator._id,
        notes: 'Feeding completed by 08:30 AM. Community kitchen ran noon meal cooking on biogas.'
      });
    }

    await PlantMonitoring.insertMany(monitoringList);

    // 9. Create Authentic Government Schemes
    const schemesData = [
      {
        schemeName: 'National Bioenergy Programme (CFA Subsidy Scheme)',
        shortCode: 'NBP-MNRE-01',
        implementingAgency: 'Ministry of New and Renewable Energy (MNRE), Govt. of India',
        category: 'Central Government',
        targetBeneficiaries: ['Individual Rural Households', 'Small & Marginal Farmers', 'SC/ST Beneficiaries', 'Hilly / Island States'],
        subsidyDetails: {
          subsidyPercentage: 40,
          maxSubsidyAmount: 22000,
          subsidyStructure: 'Direct Financial Assistance: ₹9,800 for 1 m³, ₹14,350 for 2-3 m³, and up to ₹22,000 for Special Category / Hilly States via DBT.'
        },
        eligiblePlantSizesM3: [1, 2, 3, 4, 6],
        eligibilityCriteria: [
          'Must possess at least 2 bovine animals (cows, buffaloes, or bullocks) for a minimum 2 m³ plant.',
          'Must have adequate open space (minimum 25-30 sq. meters) within 20 meters of the kitchen.',
          'Applicant or family member must own the homestead land.',
          'Availability of adequate daily water supply (minimum 50-70 liters/day).'
        ],
        requiredDocuments: [
          'Aadhaar Card of the applicant',
          'Land ownership document (Khasra/Khatauni or Patta)',
          'Bank passbook copy with IFSC code',
          'Photographs of cattle and proposed plant construction location'
        ],
        applicationProcess: 'Submit application online through State Nodal Agency (e.g., UPNEDA, GEDA, KREDL) or at the local Block Development Office (BDO).',
        officialPortalUrl: 'https://mnre.gov.in/bioenergy',
        verifiedSource: true,
        isActive: true,
        notes: 'Subsidy is released directly to the beneficiary account upon geo-tagged photo verification and successful commissioning.'
      },
      {
        schemeName: 'GOBAR-DHAN (Galvanizing Organic Bio-Agro Resources Dhan)',
        shortCode: 'GOBARDHAN-02',
        implementingAgency: 'Department of Drinking Water and Sanitation, Ministry of Jal Shakti',
        category: 'Central Government',
        targetBeneficiaries: ['Gram Panchayats', 'Farmer Producer Organizations (FPOs)', 'Self-Help Groups (SHGs)', 'Village Cooperatives'],
        subsidyDetails: {
          subsidyPercentage: 80,
          maxSubsidyAmount: 5000000,
          subsidyStructure: 'Financial assistance of up to ₹50 Lakh per district / cluster for setting up Community or Commercial scale Bio-CNG/Biogas units.'
        },
        eligiblePlantSizesM3: [10, 25, 45, 85],
        eligibilityCriteria: [
          'Cluster of villages having cumulative bovine population > 200 head.',
          'Gram Panchayat resolution approving land allocation for the community digester.',
          'Signed agreements with participating households for daily feedstock supply and slurry sharing.',
          'Designated Self-Help Group or Dairy Cooperative for day-to-day operation and maintenance.'
        ],
        requiredDocuments: [
          'Gram Panchayat Council Resolution',
          'Detailed Project Report (DPR) vetted by State Technical Agency',
          'List of registered contributor households with cattle counts',
          'Land lease / transfer deed for plant site'
        ],
        applicationProcess: 'Online submission on the Unified GOBARdhan Portal through the District Collector / District Swachh Bharat Mission (Grameen) Office.',
        officialPortalUrl: 'https://gobardhan.co.in',
        verifiedSource: true,
        isActive: true,
        notes: 'Focuses on turning cattle dung and solid agricultural residue into clean cooking fuel, bio-CNG, and organic bio-fertilizer.'
      },
      {
        schemeName: 'SATAT (Sustainable Alternative Towards Affordable Transportation)',
        shortCode: 'SATAT-CBG-03',
        implementingAgency: 'Ministry of Petroleum and Natural Gas (MoP&NG)',
        category: 'Central Government',
        targetBeneficiaries: ['Bio-CNG Entrepreneurs', 'Large Dairy Cooperatives', 'Sugar Mills & Distilleries'],
        subsidyDetails: {
          subsidyPercentage: 35,
          maxSubsidyAmount: 40000000,
          subsidyStructure: 'Central financial assistance up to ₹4 Crore per plant with assured Commercial Offtake Agreement at fixed Floor Price by Oil Marketing Companies (IOCL, BPCL, HPCL).'
        },
        eligiblePlantSizesM3: [45, 85],
        eligibilityCriteria: [
          'Commercial Bio-CNG / Compressed Biogas output >= 1.0 Tonne per day (TPD).',
          'Long-term biomass feedstock supply tie-ups (minimum 50-100 tonnes/day wet waste).',
          'Proximity to natural gas pipeline grid or retail fuel dispensing network.'
        ],
        requiredDocuments: [
          'Detailed Feasibility & Engineering Report (DPR)',
          'Bank Financial Closure / Loan Sanction Letter',
          'Feedstock Sourcing MoUs with dairy unions or agricultural markets',
          'Pollution Control Board Consent to Establish (CTE)'
        ],
        applicationProcess: 'Apply directly via expression of interest (EOI) on the SATAT portals of Indian Oil, Bharat Petroleum, or GAIL.',
        officialPortalUrl: 'https://satat.co.in',
        verifiedSource: true,
        isActive: true,
        notes: 'Premium commercial pathway for transforming large rural bio-waste surpluses into compressed vehicular fuel.'
      },
      {
        schemeName: 'State Bioenergy & Gobar Gas Incentive Mission',
        shortCode: 'STATE-AGRI-04',
        implementingAgency: 'State Department of Agriculture & Rural Development',
        category: 'State Government',
        targetBeneficiaries: ['Small & Marginal Farmers', 'Women SHG Members'],
        subsidyDetails: {
          subsidyPercentage: 50,
          maxSubsidyAmount: 18000,
          subsidyStructure: 'Top-up subsidy of ₹5,000 to ₹10,000 supplementing central MNRE funds for smallholder farming families.'
        },
        eligiblePlantSizesM3: [1, 2, 3],
        eligibilityCriteria: [
          'Must be a resident farmer owning land in the state.',
          'Priority given to women-led agricultural households.'
        ],
        requiredDocuments: [
          'Kisan Credit Card (KCC) or Farmer ID',
          'State Resident Certificate',
          'Aadhaar & Bank Account Copy'
        ],
        applicationProcess: 'Apply through the State Agriculture Portal or the Block Agricultural Officer.',
        officialPortalUrl: 'https://upneda.org.in',
        verifiedSource: true,
        isActive: true,
        notes: 'Includes free training on bio-slurry composting and gas stove maintenance.'
      }
    ];

    await GovernmentScheme.insertMany(schemesData);

    // 10. Create System Notifications
    const notificationsData = [
      {
        targetRole: 'all',
        village: rampur._id,
        plant: plant2._id,
        type: 'warning',
        category: 'PLANT_ANOMALY',
        title: 'Low Temperature Alert: Maurya Farm Biogas Unit',
        message: 'Digester temperature dropped to 18.2°C. Recommended action: Wrap thermal insulation around dome and feed with warm slurry.'
      },
      {
        targetRole: 'all',
        village: rampur._id,
        plant: plant3._id,
        type: 'alert',
        category: 'PLANT_ANOMALY',
        title: 'Acidification Warning: Verma Dairy Cluster Plant',
        message: 'Slurry pH dropped to 6.2 (Acidogenesis spike). Feed rate restricted. Lime buffer added to re-establish methanogenic equilibrium.'
      },
      {
        targetRole: 'coordinator',
        village: rampur._id,
        type: 'info',
        category: 'COMMUNITY_UPDATE',
        title: 'Community Feedstock Milestone Achieved',
        message: 'Rampur Gram Panchayat pooled 640 kg of feedstock today, meeting 102% of community digester design capacity.'
      },
      {
        targetRole: 'household',
        village: rampur._id,
        type: 'success',
        category: 'SUBSIDY_ALERT',
        title: 'GOBARdhan 2026 Subsidy Window Open',
        message: 'New application window for National Bioenergy Central Financial Assistance is now accepting rural household registrations.'
      }
    ];

    await Notification.insertMany(notificationsData);

    // 11. Seed Daily Household Contribution Logs (Past 25 Days for Incentive Platform)
    const dailyLogsData = [];
    const hhProfiles = [
      { hh: createdHouseholds[0], baseDung: 48, baseAgri: 8, baseKitchen: 3 },
      { hh: createdHouseholds[1], baseDung: 36, baseAgri: 6, baseKitchen: 2.5 },
      { hh: createdHouseholds[2], baseDung: 55, baseAgri: 10, baseKitchen: 4 },
      { hh: createdHouseholds[3], baseDung: 22, baseAgri: 5, baseKitchen: 2 },
      { hh: createdHouseholds[4], baseDung: 15, baseAgri: 4, baseKitchen: 2 },
      { hh: createdHouseholds[5], baseDung: 32, baseAgri: 9, baseKitchen: 3 }
    ];

    for (let dayOffset = 25; dayOffset >= 0; dayOffset--) {
      const logDate = new Date();
      logDate.setDate(logDate.getDate() - dayOffset);

      hhProfiles.forEach((profile, idx) => {
        // Slight natural day-to-day variance & occasional skip for realistic consistency metrics
        if ((dayOffset + idx) % 9 === 0 && idx > 2) return;
        const variance = 0.88 + ((dayOffset * 3 + idx * 7) % 25) / 100;
        const dung = Number((profile.baseDung * variance).toFixed(1));
        const agri = Number((profile.baseAgri * variance).toFixed(1));
        const kitchen = Number((profile.baseKitchen * variance).toFixed(1));
        const total = Number((dung + agri + kitchen).toFixed(1));

        dailyLogsData.push({
          village: rampur._id,
          household: profile.hh._id,
          contributionDate: logDate,
          dungKg: dung,
          agriWasteKg: agri,
          kitchenWasteKg: kitchen,
          totalKg: total,
          incentivePointsEarned: Math.round(dung * 1.0 + agri * 1.2 + kitchen * 1.5),
          incentiveValueINR: Number((total * 2.0).toFixed(2)),
          slurryCreditLiters: Math.round(total * 0.85),
          verified: true,
          recordedBy: coordinator._id,
          notes: 'Morning collection batch verified at Gram Panchayat hub'
        });
      });
    }
    await DailyContributionLog.insertMany(dailyLogsData);

    // 12. Seed Registered Farmers & Agricultural Land Plots (Digestate-to-Fertilizer Planner)
    const farmersData = [
      {
        farmerName: 'Rameshwar Lal Yadav',
        village: rampur._id,
        household: createdHouseholds[0]._id,
        contactPhone: '+91 94150 99887',
        landAreaAcres: 4.5,
        soilType: 'Alluvial',
        primaryCrop: 'Wheat & Sugarcane',
        croppingSeason: 'Rabi',
        fertilizerRequiredKgPerMonth: 950,
        preferredApplicationType: 'Liquid Bio-Slurry',
        location: { latitude: 25.3192, longitude: 82.9751 },
        notes: 'Irrigated canal-adjacent plots suitable for direct slurry fertigation.'
      },
      {
        farmerName: 'Savitri Devi Maurya',
        village: rampur._id,
        household: createdHouseholds[1]._id,
        contactPhone: '+91 94150 11223',
        landAreaAcres: 3.0,
        soilType: 'Alluvial',
        primaryCrop: 'Organic Vegetables (Tomato, Brinjal)',
        croppingSeason: 'Zaid',
        fertilizerRequiredKgPerMonth: 620,
        preferredApplicationType: 'Compost Enriched Slurry',
        location: { latitude: 25.3160, longitude: 82.9718 },
        notes: 'High-value horticultural beds transitioning 100% off synthetic urea.'
      },
      {
        farmerName: 'Kishan Chand Verma',
        village: rampur._id,
        household: createdHouseholds[2]._id,
        contactPhone: '+91 94150 33445',
        landAreaAcres: 6.2,
        soilType: 'Sandy Loam',
        primaryCrop: 'Sugarcane',
        croppingSeason: 'Perennial',
        fertilizerRequiredKgPerMonth: 1350,
        preferredApplicationType: 'Sun-Dried Digestate Cake',
        location: { latitude: 25.3204, longitude: 82.9768 },
        notes: 'Requires dry digestate cake for basal furrow dressing.'
      },
      {
        farmerName: 'Harishankar Chauhan',
        village: rampur._id,
        contactPhone: '+91 94152 44110',
        landAreaAcres: 2.8,
        soilType: 'Clayey',
        primaryCrop: 'Paddy (Rice)',
        croppingSeason: 'Kharif',
        fertilizerRequiredKgPerMonth: 540,
        preferredApplicationType: 'Liquid Bio-Slurry',
        location: { latitude: 25.3148, longitude: 82.9732 },
        notes: 'Participating in Gram Panchayat organic paddy cluster.'
      },
      {
        farmerName: 'Meera Devi Patel',
        village: rampur._id,
        contactPhone: '+91 94158 66201',
        landAreaAcres: 2.2,
        soilType: 'Alluvial',
        primaryCrop: 'Mustard & Pulses',
        croppingSeason: 'Rabi',
        fertilizerRequiredKgPerMonth: 410,
        preferredApplicationType: 'Compost Enriched Slurry',
        location: { latitude: 25.3179, longitude: 82.9708 },
        notes: 'Women SHG organic farming cooperative member.'
      }
    ];
    const createdFarmers = await FarmerLand.insertMany(farmersData);

    // 13. Seed Digestate Distributions
    const distributionsData = [
      {
        village: rampur._id,
        sourcePlant: plantCommunity._id,
        farmerLand: createdFarmers[0]._id,
        distributionDate: new Date(Date.now() - 2 * 86400000),
        digestateAllocatedLiters: 4200,
        solidFertilizerEquivalentKg: 504,
        chemicalFertilizerReplacedKg: 226.8,
        farmerSavingsINR: 3276,
        status: 'Applied to Field',
        recordedBy: coordinator._id,
        notes: 'Applied via irrigation channel during first wheat watering.'
      },
      {
        village: rampur._id,
        sourcePlant: plantCommunity._id,
        farmerLand: createdFarmers[1]._id,
        distributionDate: new Date(Date.now() - 4 * 86400000),
        digestateAllocatedLiters: 2800,
        solidFertilizerEquivalentKg: 336,
        chemicalFertilizerReplacedKg: 151.2,
        farmerSavingsINR: 2184,
        status: 'Applied to Field',
        recordedBy: coordinator._id,
        notes: 'Mixed with vermicompost for tomato nursery beds.'
      },
      {
        village: rampur._id,
        sourcePlant: plantCommunity._id,
        farmerLand: createdFarmers[2]._id,
        distributionDate: new Date(Date.now() - 1 * 86400000),
        digestateAllocatedLiters: 5500,
        solidFertilizerEquivalentKg: 660,
        chemicalFertilizerReplacedKg: 297,
        farmerSavingsINR: 4290,
        status: 'Delivered',
        recordedBy: coordinator._id,
        notes: 'Tractor tanker delivered to sugarcane field storage pit.'
      },
      {
        village: rampur._id,
        sourcePlant: plant1._id,
        farmerLand: createdFarmers[3]._id,
        distributionDate: new Date(),
        digestateAllocatedLiters: 1800,
        solidFertilizerEquivalentKg: 216,
        chemicalFertilizerReplacedKg: 97.2,
        farmerSavingsINR: 1404,
        status: 'Dispatched',
        recordedBy: coordinator._id,
        notes: 'Scheduled morning slurry tanker dispatch.'
      },
      {
        village: rampur._id,
        sourcePlant: plant2._id,
        farmerLand: createdFarmers[4]._id,
        distributionDate: new Date(Date.now() + 86400000),
        digestateAllocatedLiters: 1200,
        solidFertilizerEquivalentKg: 144,
        chemicalFertilizerReplacedKg: 64.8,
        farmerSavingsINR: 936,
        status: 'Scheduled',
        recordedBy: coordinator._id,
        notes: 'Booked for upcoming mustard top-dressing.'
      }
    ];
    await DigestateDistribution.insertMany(distributionsData);

    // 14. Seed Saved Digital Twin Simulation Scenarios
    const scenarioConfigs = [
      {
        scenarioName: 'Current Rampur Baseline (25 m³ Hub)',
        params: {
          householdParticipationPercent: 100,
          participatingHouseholds: 6,
          wasteAvailabilityMultiplier: 1.0,
          dailyDungKg: 253,
          dailyAgriWasteKg: 45,
          dailyKitchenWasteKg: 21,
          plantCapacityM3: 25,
          installationCostINR: 480000,
          subsidyPercent: 36,
          transportCostPerKmINR: 18,
          avgDailyTransportKm: 6.5
        },
        notes: 'Reflects current operating baseline with existing registered households in Rampur.'
      },
      {
        scenarioName: 'Phase 2 Gram Panchayat Expansion (45 m³)',
        params: {
          householdParticipationPercent: 150,
          participatingHouseholds: 15,
          wasteAvailabilityMultiplier: 1.35,
          dailyDungKg: 620,
          dailyAgriWasteKg: 110,
          dailyKitchenWasteKg: 45,
          plantCapacityM3: 45,
          installationCostINR: 850000,
          subsidyPercent: 45,
          transportCostPerKmINR: 15,
          avgDailyTransportKm: 11.0
        },
        notes: 'Models onboarding neighboring dairy ward under GOBARdhan 45% capital grant.'
      },
      {
        scenarioName: 'Winter Low-Feedstock Stress Test',
        params: {
          householdParticipationPercent: 75,
          participatingHouseholds: 6,
          wasteAvailabilityMultiplier: 0.72,
          dailyDungKg: 253,
          dailyAgriWasteKg: 45,
          dailyKitchenWasteKg: 21,
          plantCapacityM3: 25,
          installationCostINR: 480000,
          subsidyPercent: 36,
          transportCostPerKmINR: 22,
          avgDailyTransportKm: 7.5
        },
        notes: 'Evaluates resilience under 28% seasonal drop in feedstock & higher diesel transport cost.'
      }
    ];

    const scenariosToInsert = scenarioConfigs.map((cfg) => {
      const sim = runSimulationModel(cfg.params);
      return {
        scenarioName: cfg.scenarioName,
        village: rampur._id,
        createdBy: admin._id,
        parameters: sim.parameters,
        outputs: sim.outputs,
        notes: cfg.notes
      };
    });
    await SimulationScenario.insertMany(scenariosToInsert);

    console.log('[Seed] Database successfully seeded with all 14 collections including Optimizer, Incentives, Digestate Planner & Digital Twin scenarios.');
  } catch (error) {
    console.error('[Seed] Error seeding database:', error.message);
  }
}

// Allow direct CLI execution: node seeds/seedData.js
if (require.main === module) {
  require('dotenv').config();
  const { connectDB, disconnectDB } = require('../config/db');

  (async () => {
    await connectDB();
    console.log('[Seed] Running manual database re-seed...');
    // Drop existing collections for clean seed
    await Promise.all([
      User.deleteMany({}),
      Village.deleteMany({}),
      Household.deleteMany({}),
      CattleRecord.deleteMany({}),
      FeedstockRecord.deleteMany({}),
      BiogasPlant.deleteMany({}),
      PlantMonitoring.deleteMany({}),
      CommunityContribution.deleteMany({}),
      GovernmentScheme.deleteMany({}),
      Notification.deleteMany({}),
      DailyContributionLog.deleteMany({}),
      FarmerLand.deleteMany({}),
      DigestateDistribution.deleteMany({}),
      SimulationScenario.deleteMany({})
    ]);
    await runSeed();
    console.log('[Seed] Finished. Disconnecting...');
    await disconnectDB();
    process.exit(0);
  })();
}

module.exports = {
  seedDatabaseIfEmpty,
  runSeed
};
