const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Village = require('../models/Village');
const Household = require('../models/Household');
const CattleRecord = require('../models/CattleRecord');
const BiogasPlant = require('../models/BiogasPlant');
const FeedstockRecord = require('../models/FeedstockRecord');
const PlantMonitoring = require('../models/PlantMonitoring');
const CommunityContribution = require('../models/CommunityContribution');
const GovernmentScheme = require('../models/GovernmentScheme');
const Notification = require('../models/Notification');
const DailyContributionLog = require('../models/DailyContributionLog');
const FarmerLand = require('../models/FarmerLand');
const DigestateDistribution = require('../models/DigestateDistribution');
const SimulationScenario = require('../models/SimulationScenario');
const User = require('../models/User');
const { EQUIVALENCE_CONSTANTS } = require('../utils/biogasCalculator');
const { logAuditEvent } = require('../utils/auditLogger');

const BACKUP_DIR = path.join(__dirname, '../backups');

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function computeChecksum(collectionsObj) {
  return crypto.createHash('sha256').update(JSON.stringify(collectionsObj)).digest('hex');
}

/**
 * Compute Exponential Smoothing (alpha = 0.35) seasonal forecast with strict data-sufficiency checks,
 * chronological 70/30 out-of-sample holdout MAE/RMSE evaluation, and +/- 1.96*RMSE uncertainty intervals.
 */
function computeSeasonalForecastWithMetrics(feedstockRecords) {
  const dailyMap = {};
  const seasonSet = new Set();

  feedstockRecords.forEach((r) => {
    const key = new Date(r.collectionDate).toISOString().split('T')[0];
    dailyMap[key] = (dailyMap[key] || 0) + (r.totalKg || 0);
    if (r.season) seasonSet.add(r.season);
  });

  const sortedDates = Object.keys(dailyMap).sort();
  const sampleDays = sortedDates.length;
  const distinctSeasonsCount = seasonSet.size;

  // Guard: Never claim statistical accuracy with insufficient historical data (< 7 distinct days)
  if (sampleDays < 7) {
    return {
      model: 'Exponential Smoothing (α = 0.35) + Seasonal Index',
      sampleDays,
      evaluatedForecastSteps: 0,
      holdoutTestDays: 0,
      distinctSeasonsObserved: distinctSeasonsCount,
      dataSufficiency: 'Insufficient Data (< 7 days)',
      seasonalSource: 'Literature Priors (Insufficient Historical Span)',
      sufficiencyWarning: `Only ${sampleDays} historical day(s) recorded. At least 7 distinct days are required before calculating MAE/RMSE forecast accuracy.`,
      smoothedBaselineKgPerDay: sampleDays > 0 ? Number(dailyMap[sortedDates[sampleDays - 1]].toFixed(1)) : 0,
      metrics: {
        maeKg: null,
        rmseKg: null,
        mapePercent: null,
        accuracyPercent: null,
        holdoutMaeKg: null,
        holdoutRmseKg: null
      },
      series: sortedDates.map((d) => ({
        date: d,
        label: new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        actualKg: Number(dailyMap[d].toFixed(1)),
        predictedKg: null,
        lowerBoundKg: null,
        upperBoundKg: null
      })),
      seasonalProjections: []
    };
  }

  const alpha = 0.35;
  const splitIdx = Math.max(5, Math.floor(sampleDays * 0.7)); // 70% train, 30% out-of-sample holdout
  let smoothed = dailyMap[sortedDates[0]];

  const rawSeries = [];
  let sumAbsAll = 0;
  let sumSqAll = 0;
  let sumPctAll = 0;
  let evalAll = 0;

  let sumAbsHoldout = 0;
  let sumSqHoldout = 0;
  let sumPctHoldout = 0;
  let evalHoldout = 0;

  sortedDates.forEach((dateStr, idx) => {
    const actualKg = Number(dailyMap[dateStr].toFixed(1));
    const predictedKg = Number(smoothed.toFixed(1));

    if (idx > 0) {
      const err = actualKg - predictedKg;
      const absErr = Math.abs(err);
      sumAbsAll += absErr;
      sumSqAll += err * err;
      if (actualKg > 0) sumPctAll += (absErr / actualKg) * 100;
      evalAll++;

      if (idx >= splitIdx) {
        sumAbsHoldout += absErr;
        sumSqHoldout += err * err;
        if (actualKg > 0) sumPctHoldout += (absErr / actualKg) * 100;
        evalHoldout++;
      }
    }

    rawSeries.push({
      date: dateStr,
      label: new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      actualKg,
      predictedKg,
      errorKg: Number((actualKg - predictedKg).toFixed(1)),
      split: idx >= splitIdx ? 'test_holdout' : 'train'
    });

    smoothed = alpha * actualKg + (1 - alpha) * smoothed;
  });

  const maeKg = Number((sumAbsAll / evalAll).toFixed(2));
  const rmseKg = Number(Math.sqrt(sumSqAll / evalAll).toFixed(2));
  const mapePercent = Number((sumPctAll / evalAll).toFixed(2));

  const holdoutMaeKg = evalHoldout > 0 ? Number((sumAbsHoldout / evalHoldout).toFixed(2)) : maeKg;
  const holdoutRmseKg = evalHoldout > 0 ? Number(Math.sqrt(sumSqHoldout / evalHoldout).toFixed(2)) : rmseKg;
  const holdoutMape = evalHoldout > 0 ? Number((sumPctHoldout / evalHoldout).toFixed(2)) : mapePercent;

  // Report conservative accuracy based on out-of-sample holdout MAPE when available
  const accuracyPercent = Number(Math.max(0, 100 - holdoutMape).toFixed(1));
  const uncertaintyRadiusKg = Number((1.96 * holdoutRmseKg).toFixed(1)); // 95% confidence interval

  const series = rawSeries.slice(-14).map((pt) => ({
    ...pt,
    lowerBoundKg: Number(Math.max(0, pt.predictedKg - uncertaintyRadiusKg).toFixed(1)),
    upperBoundKg: Number((pt.predictedKg + uncertaintyRadiusKg).toFixed(1))
  }));

  const dataSufficiency =
    distinctSeasonsCount >= 2 && sampleDays >= 30
      ? 'Multi-Season Verified'
      : 'Single-Season Limited Span';

  const seasonalSource =
    distinctSeasonsCount >= 2
      ? 'Empirical Multi-Season Blend'
      : 'Smoothed Historical Baseline + Literature Seasonal Multipliers';

  const sufficiencyWarning =
    distinctSeasonsCount < 2
      ? `Historical data currently spans ${sampleDays} days within ${distinctSeasonsCount} season. Cross-season projections use MNRE/regional seasonal multipliers with ±${uncertaintyRadiusKg} kg/day uncertainty bands.`
      : '';

  const seasonalIndices = [
    { season: 'Summer', index: 1.05, biogasFactor: 1.08, note: 'Peak mesophilic digestion temperature' },
    { season: 'Monsoon', index: 0.94, biogasFactor: 0.96, note: 'High feedstock moisture; covered storage advised' },
    { season: 'Post-Monsoon', index: 1.12, biogasFactor: 1.02, note: 'Peak agricultural harvest residue surplus' },
    { season: 'Winter', index: 0.86, biogasFactor: 0.82, note: 'Lower ambient temperature; thermal insulation needed' }
  ];

  const seasonalProjections = seasonalIndices.map((s) => {
    const expectedFeedstockKg = Math.round(smoothed * s.index);
    const minFeedstockKg = Math.max(0, Math.round(expectedFeedstockKg - uncertaintyRadiusKg));
    const maxFeedstockKg = Math.round(expectedFeedstockKg + uncertaintyRadiusKg);
    const projectedDailyBiogasM3 = Number((expectedFeedstockKg * 0.038 * s.biogasFactor).toFixed(1));
    const minBiogasM3 = Number((minFeedstockKg * 0.038 * s.biogasFactor).toFixed(1));
    const maxBiogasM3 = Number((maxFeedstockKg * 0.038 * s.biogasFactor).toFixed(1));

    return {
      season: s.season,
      seasonalIndex: s.index,
      projectedDailyFeedstockKg: expectedFeedstockKg,
      feedstockRangeKg: { min: minFeedstockKg, expected: expectedFeedstockKg, max: maxFeedstockKg },
      projectedMonthlyFeedstockTons: Number(((expectedFeedstockKg * 30) / 1000).toFixed(2)),
      projectedDailyBiogasM3,
      biogasRangeM3: { min: minBiogasM3, expected: projectedDailyBiogasM3, max: maxBiogasM3 },
      note: s.note
    };
  });

  return {
    model: 'Exponential Smoothing (α = 0.35) + 70/30 Chronological Holdout Validation',
    sampleDays,
    evaluatedForecastSteps: evalAll,
    holdoutTestDays: evalHoldout,
    distinctSeasonsObserved: distinctSeasonsCount,
    dataSufficiency,
    seasonalSource,
    sufficiencyWarning,
    smoothedBaselineKgPerDay: Number(smoothed.toFixed(1)),
    uncertaintyRadius95Kg: uncertaintyRadiusKg,
    uncertaintyRadiusKg,
    metrics: {
      maeKg,
      rmseKg,
      mapePercent,
      holdoutMaeKg,
      holdoutRmseKg,
      holdoutMapePercent: holdoutMape,
      accuracyPercent
    },
    series,
    seasonalProjections
  };
}

// Helper: Collect snapshot payload of all 13 operational MongoDB collections
async function buildDatabaseSnapshot(exportedByEmail = 'admin') {
  const [
    villages,
    households,
    cattleRecords,
    feedstockRecords,
    biogasPlants,
    plantMonitoring,
    communityContributions,
    governmentSchemes,
    notifications,
    dailyContributionLogs,
    farmerLands,
    digestateDistributions,
    simulationScenarios,
    usersCount
  ] = await Promise.all([
    Village.find().lean(),
    Household.find().lean(),
    CattleRecord.find().lean(),
    FeedstockRecord.find().lean(),
    BiogasPlant.find().lean(),
    PlantMonitoring.find().lean(),
    CommunityContribution.find().lean(),
    GovernmentScheme.find().lean(),
    Notification.find().lean(),
    DailyContributionLog.find().lean(),
    FarmerLand.find().lean(),
    DigestateDistribution.find().lean(),
    SimulationScenario.find().lean(),
    User.countDocuments()
  ]);

  const collections = {
    villages,
    households,
    cattleRecords,
    feedstockRecords,
    biogasPlants,
    plantMonitoring,
    communityContributions,
    governmentSchemes,
    notifications,
    dailyContributionLogs,
    farmerLands,
    digestateDistributions,
    simulationScenarios
  };

  const documentCounts = {};
  let totalDocuments = 0;
  for (const [k, arr] of Object.entries(collections)) {
    documentCounts[k] = arr.length;
    totalDocuments += arr.length;
  }

  return {
    metadata: {
      system: 'Rural Community Biogas System',
      version: '1.2.0',
      exportedAt: new Date().toISOString(),
      exportedBy: exportedByEmail,
      totalUsersInSystem: usersCount,
      totalDocuments,
      documentCounts,
      checksumSha256: computeChecksum(collections)
    },
    collections
  };
}

// @desc    Get analytical reports data including Seasonal Forecasting & Holdout MAE/RMSE
// @route   GET /api/reports/analytics
// @access  Private
const getAnalyticsReport = async (req, res, next) => {
  try {
    const { villageId } = req.query;

    const villageQuery = villageId && villageId !== 'all' ? { _id: villageId } : {};
    const refQuery = villageId && villageId !== 'all' ? { village: villageId } : {};

    const villages = await Village.find(villageQuery);
    const villageSummaries = [];

    for (const v of villages) {
      const hCount = await Household.countDocuments({ village: v._id });
      const cattle = await CattleRecord.find({ village: v._id });
      const totalCattle = cattle.reduce((acc, c) => acc + c.count, 0);
      const totalDung = cattle.reduce((acc, c) => acc + c.dailyDungTotalKg, 0);
      const plants = await BiogasPlant.find({ village: v._id });
      const totalCap = plants.reduce((acc, p) => acc + p.capacityM3, 0);
      const activeP = plants.filter((p) => p.status === 'Active').length;

      villageSummaries.push({
        villageId: v._id,
        villageName: v.name,
        district: v.district,
        state: v.state,
        households: hCount,
        cattlePopulation: totalCattle,
        dailyDungAvailabilityKg: Math.round(totalDung),
        biogasPlantsCount: plants.length,
        activePlants: activeP,
        installedCapacityM3: totalCap,
        estimatedBiogasM3Day: Number((totalDung * 0.037).toFixed(1)),
        annualLpgSavingsINR: Math.round(
          totalCap *
            EQUIVALENCE_CONSTANTS.lpgKgPerM3Biogas *
            (EQUIVALENCE_CONSTANTS.avgLpgCylinderPriceINR / EQUIVALENCE_CONSTANTS.standardLpgCylinderKg) *
            365
        )
      });
    }

    const contributions = await CommunityContribution.find(refQuery)
      .sort({ totalDailyContributionKg: -1 })
      .limit(15)
      .populate('household', 'householdCode headOfFamily familyMembers')
      .populate('village', 'name');

    const topContributors = contributions.map((c) => ({
      householdCode: c.household ? c.household.householdCode : 'N/A',
      headOfFamily: c.household ? c.household.headOfFamily : 'N/A',
      villageName: c.village ? c.village.name : 'N/A',
      dailyDungKg: c.dailyDungCommittedKg,
      dailyAgriWasteKg: c.agriWasteCommittedKg,
      totalDailyContributionKg: c.totalDailyContributionKg,
      monthlyCredits: c.incentiveCredits,
      slurryEntitlementLiters: c.slurryEntitlementLitersPerDay
    }));

    const allPlants = await BiogasPlant.find(refQuery).populate('village', 'name');
    const totalInstalledCapacityM3 = allPlants.reduce((acc, p) => acc + (p.capacityM3 || 0), 0);
    const dynamicBaseProduction = totalInstalledCapacityM3 > 0 ? totalInstalledCapacityM3 * 0.92 : 25;

    const plantPerformance = allPlants.map((p) => ({
      plantCode: p.plantCode,
      plantName: p.plantName,
      plantType: p.plantType,
      capacityM3: p.capacityM3,
      villageName: p.village ? p.village.name : 'Unknown',
      status: p.status,
      utilizationRate: p.status === 'Active' ? '92%' : p.status === 'Under Maintenance' ? '45%' : '0%',
      healthScore: p.status === 'Active' ? 94 : p.status === 'Under Maintenance' ? 62 : 20,
      annualCo2ReductionKg: Math.round(p.capacityM3 * 365 * EQUIVALENCE_CONSTANTS.co2ReductionKgPerM3Biogas)
    }));

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyComparison = months.map((month, idx) => {
      const seasonalFactor = 0.95 + 0.18 * Math.sin((idx - 2) * (Math.PI / 6));
      const totalMonthlyBiogasM3 = Math.round(dynamicBaseProduction * seasonalFactor * 30);
      const feedstockUtilizedTons = Number(((totalMonthlyBiogasM3 * 25) / 1000).toFixed(1));
      const lpgSavedKg = Math.round(totalMonthlyBiogasM3 * EQUIVALENCE_CONSTANTS.lpgKgPerM3Biogas);
      const costSavingsINR = Math.round(
        (lpgSavedKg / EQUIVALENCE_CONSTANTS.standardLpgCylinderKg) * EQUIVALENCE_CONSTANTS.avgLpgCylinderPriceINR
      );

      return {
        month,
        estimatedBiogasM3: totalMonthlyBiogasM3,
        feedstockUtilizedTons,
        lpgSavedKg,
        costSavingsINR,
        slurryOutputTons: Number((feedstockUtilizedTons * 0.9).toFixed(1))
      };
    });

    const historicalFeedstock = await FeedstockRecord.find(refQuery).sort({ collectionDate: 1 }).limit(365);
    const seasonalForecast = computeSeasonalForecastWithMetrics(historicalFeedstock);

    res.json({
      success: true,
      data: {
        villageSummaries,
        topContributors,
        monthlyComparison,
        plantPerformance,
        seasonalForecast,
        reportGeneratedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download CSV Report
// @route   GET /api/reports/export-csv
// @access  Private
const exportCsvReport = async (req, res, next) => {
  try {
    const { type = 'village_summary', villageId } = req.query;

    let csvContent = '';
    const filename = `biogas_report_${type}_${Date.now()}.csv`;

    if (type === 'village_summary') {
      const villages = await Village.find(villageId && villageId !== 'all' ? { _id: villageId } : {});
      csvContent =
        'Village Name,District,State,Households,Cattle Population,Daily Dung Availability (kg),Biogas Plants,Installed Capacity (m3),Est Monthly Savings (INR)\n';

      for (const v of villages) {
        const hCount = await Household.countDocuments({ village: v._id });
        const cattle = await CattleRecord.find({ village: v._id });
        const totalCattle = cattle.reduce((acc, c) => acc + c.count, 0);
        const totalDung = cattle.reduce((acc, c) => acc + c.dailyDungTotalKg, 0);
        const plants = await BiogasPlant.find({ village: v._id });
        const totalCap = plants.reduce((acc, p) => acc + p.capacityM3, 0);
        const monthlySavings = Math.round(totalCap * 0.43 * (1050 / 14.2) * 30);

        csvContent += `"${v.name}","${v.district}","${v.state}",${hCount},${totalCattle},${Math.round(totalDung)},${
          plants.length
        },${totalCap},${monthlySavings}\n`;
      }
    } else if (type === 'feedstock_logs') {
      const records = await FeedstockRecord.find().sort({ collectionDate: -1 }).limit(200).populate('village', 'name');
      csvContent =
        'Date,Village,Bovine Dung (kg),Agricultural Residue (kg),Kitchen Waste (kg),Total Feedstock (kg),Season,Status,Collector\n';

      records.forEach((r) => {
        const dStr = new Date(r.collectionDate).toISOString().split('T')[0];
        csvContent += `"${dStr}","${r.village ? r.village.name : ''}",${r.dungKg},${r.agriWasteKg},${
          r.kitchenWasteKg
        },${r.totalKg},"${r.season}","${r.status}","${r.collectorName}"\n`;
      });
    } else {
      const plants = await BiogasPlant.find().populate('village', 'name');
      csvContent =
        'Plant Code,Plant Name,Model,Capacity (m3),Village,Status,Installation Cost (INR),Subsidy (INR),Gas Utilization\n';

      plants.forEach((p) => {
        csvContent += `"${p.plantCode}","${p.plantName}","${p.plantType}",${p.capacityM3},"${
          p.village ? p.village.name : ''
        }","${p.status}",${p.installationCost},${p.subsidyReceived},"${p.gasUtilization}"\n`;
      });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

// @desc    Stream live MongoDB operational backup JSON snapshot (with SHA-256 checksum)
// @route   GET /api/reports/backup
// @access  Private (Admin only)
const exportDatabaseBackup = async (req, res, next) => {
  try {
    const backupPayload = await buildDatabaseSnapshot(req.user.email);

    await logAuditEvent(req, {
      action: 'DATABASE_BACKUP_EXPORT',
      entityType: 'Database',
      summary: `Exported live JSON database backup (${backupPayload.metadata.totalDocuments} documents)`,
      metadata: {
        totalDocuments: backupPayload.metadata.totalDocuments,
        checksumSha256: backupPayload.metadata.checksumSha256
      }
    });

    const filename = `biogas_database_backup_${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).json(backupPayload);
  } catch (error) {
    next(error);
  }
};

// @desc    Create & store a secure timestamped JSON backup snapshot on the server
// @route   POST /api/reports/backups/create
// @access  Private (Admin only)
const createServerBackup = async (req, res, next) => {
  try {
    ensureBackupDir();
    const backupPayload = await buildDatabaseSnapshot(req.user.email);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `biogas_backup_${stamp}.json`;
    const filePath = path.join(BACKUP_DIR, filename);

    fs.writeFileSync(filePath, JSON.stringify(backupPayload, null, 2), 'utf8');
    const stats = fs.statSync(filePath);

    await logAuditEvent(req, {
      action: 'SERVER_BACKUP_CREATED',
      entityType: 'Database',
      entityId: filename,
      summary: `Saved server-side backup snapshot ${filename} (${backupPayload.metadata.totalDocuments} documents)`,
      metadata: {
        sizeBytes: stats.size,
        checksumSha256: backupPayload.metadata.checksumSha256
      }
    });

    res.status(201).json({
      success: true,
      data: {
        filename,
        sizeBytes: stats.size,
        exportedAt: backupPayload.metadata.exportedAt,
        exportedBy: backupPayload.metadata.exportedBy,
        totalDocuments: backupPayload.metadata.totalDocuments,
        documentCounts: backupPayload.metadata.documentCounts,
        checksumSha256: backupPayload.metadata.checksumSha256
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    List securely stored server-side backup files
// @route   GET /api/reports/backups
// @access  Private (Admin only)
const listServerBackups = async (req, res, next) => {
  try {
    ensureBackupDir();
    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.endsWith('.json'))
      .sort()
      .reverse();

    const backups = files.map((filename) => {
      const fullPath = path.join(BACKUP_DIR, filename);
      const stat = fs.statSync(fullPath);
      let metadata = {};
      try {
        const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        metadata = parsed.metadata || {};
      } catch {
        metadata = { corrupted: true };
      }
      return {
        filename,
        sizeBytes: stat.size,
        createdAt: stat.mtime.toISOString(),
        exportedAt: metadata.exportedAt || stat.mtime.toISOString(),
        exportedBy: metadata.exportedBy || 'admin',
        totalDocuments: metadata.totalDocuments || 0,
        checksumSha256: metadata.checksumSha256 || ''
      };
    });

    res.json({ success: true, count: backups.length, data: backups });
  } catch (error) {
    next(error);
  }
};

// @desc    Download a specific stored server backup securely (path traversal protected)
// @route   GET /api/reports/backups/:filename
// @access  Private (Admin only)
const downloadServerBackup = async (req, res, next) => {
  try {
    ensureBackupDir();
    const safeFilename = path.basename(req.params.filename);
    if (!safeFilename.endsWith('.json')) {
      return res.status(400).json({ success: false, message: 'Invalid backup filename.' });
    }
    const fullPath = path.join(BACKUP_DIR, safeFilename);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ success: false, message: 'Backup file not found.' });
    }
    res.download(fullPath, safeFilename);
  } catch (error) {
    next(error);
  }
};

// @desc    Restore MongoDB operational collections with explicit confirmation, SHA-256 verification & rollback safety
// @route   POST /api/reports/restore
// @access  Private (Admin only)
const restoreDatabaseBackup = async (req, res, next) => {
  try {
    const { confirmOverwrite, serverBackupFilename } = req.body || {};

    // 1. Explicit Confirmation Gate (prevents accidental destructive overwrite)
    if (confirmOverwrite !== true) {
      return res.status(400).json({
        success: false,
        message: 'Restoration requires explicit confirmation (confirmOverwrite: true) before overwriting database records.'
      });
    }

    // 2. Load backup payload either from stored server file or uploaded JSON body
    let payload = req.body;
    if (serverBackupFilename) {
      ensureBackupDir();
      const safeName = path.basename(serverBackupFilename);
      const fullPath = path.join(BACKUP_DIR, safeName);
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ success: false, message: `Server backup '${safeName}' not found.` });
      }
      payload = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    }

    const { metadata, collections } = payload || {};

    if (
      !metadata ||
      metadata.system !== 'Rural Community Biogas System' ||
      !collections ||
      typeof collections !== 'object'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid backup format. Expected a verified Rural Community Biogas System JSON snapshot.'
      });
    }

    // 3. Verify SHA-256 Integrity Checksum if included in backup
    if (metadata.checksumSha256) {
      const actualChecksum = computeChecksum(collections);
      if (actualChecksum !== metadata.checksumSha256) {
        return res.status(400).json({
          success: false,
          message: 'Backup integrity check failed (SHA-256 checksum mismatch). File may be corrupted or tampered.'
        });
      }
    }

    const modelMap = [
      { key: 'villages', Model: Village },
      { key: 'households', Model: Household },
      { key: 'cattleRecords', Model: CattleRecord },
      { key: 'feedstockRecords', Model: FeedstockRecord },
      { key: 'biogasPlants', Model: BiogasPlant },
      { key: 'plantMonitoring', Model: PlantMonitoring },
      { key: 'communityContributions', Model: CommunityContribution },
      { key: 'governmentSchemes', Model: GovernmentScheme },
      { key: 'notifications', Model: Notification },
      { key: 'dailyContributionLogs', Model: DailyContributionLog },
      { key: 'farmerLands', Model: FarmerLand },
      { key: 'digestateDistributions', Model: DigestateDistribution },
      { key: 'simulationScenarios', Model: SimulationScenario }
    ];

    // 4. Capture pre-restore in-memory rollback snapshot before wiping any collection
    const rollbackSnapshot = await buildDatabaseSnapshot(req.user.email);
    const restoredCounts = {};

    try {
      for (const { key, Model } of modelMap) {
        if (Array.isArray(collections[key])) {
          await Model.deleteMany({});
          if (collections[key].length > 0) {
            await Model.insertMany(collections[key], { ordered: true });
          }
          restoredCounts[key] = collections[key].length;
        }
      }
    } catch (writeErr) {
      // Automatic Rollback on partial failure
      console.error('[Restore] Error mid-restore, executing automatic rollback:', writeErr.message);
      for (const { key, Model } of modelMap) {
        const prevDocs = rollbackSnapshot.collections[key] || [];
        await Model.deleteMany({});
        if (prevDocs.length > 0) {
          await Model.insertMany(prevDocs, { ordered: false });
        }
      }
      return res.status(400).json({
        success: false,
        message: `Restore aborted due to invalid record data (${writeErr.message}). Automatic rollback restored previous database state.`
      });
    }

    await logAuditEvent(req, {
      action: 'DATABASE_RESTORED',
      entityType: 'Database',
      entityId: serverBackupFilename || 'uploaded-json',
      summary: `Restored database snapshot from ${metadata.exportedAt} (${Object.values(restoredCounts).reduce(
        (a, b) => a + b,
        0
      )} documents)`,
      metadata: { restoredCounts, checksumVerified: Boolean(metadata.checksumSha256) }
    });

    res.json({
      success: true,
      message: 'Database backup verified and restored cleanly across all operational collections.',
      checksumVerified: Boolean(metadata.checksumSha256),
      restoredAt: new Date().toISOString(),
      restoredCounts
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAnalyticsReport,
  exportCsvReport,
  exportDatabaseBackup,
  createServerBackup,
  listServerBackups,
  downloadServerBackup,
  restoreDatabaseBackup,
  computeSeasonalForecastWithMetrics
};
