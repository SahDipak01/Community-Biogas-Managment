const OfflineSyncLog = require('../models/OfflineSyncLog');
const DailyContributionLog = require('../models/DailyContributionLog');
const WasteCollectionRequest = require('../models/WasteCollectionRequest');
const PlantMonitoring = require('../models/PlantMonitoring');
const PlantBreakdownReport = require('../models/PlantBreakdownReport');
const AuditLog = require('../models/AuditLog');

// @desc    Batch sync offline mutations with idempotency
// @route   POST /api/sync/batch
// @access  Private
const syncBatch = async (req, res, next) => {
  try {
    const { operations } = req.body; // Array of { clientOpId, entityType, operation, payload, clientTimestamp }
    if (!Array.isArray(operations) || operations.length === 0) {
      return res.status(400).json({ success: false, message: 'No sync operations provided' });
    }

    const results = [];

    for (const op of operations) {
      const { clientOpId, entityType, operation, payload, clientTimestamp } = op;

      if (!clientOpId) {
        results.push({ clientOpId: 'unknown', status: 'Failed', error: 'Missing clientOpId' });
        continue;
      }

      // 1. Idempotency check
      const existing = await OfflineSyncLog.findOne({ clientOpId });
      if (existing) {
        results.push({
          clientOpId,
          status: 'Duplicate Ignored',
          resolvedEntityId: existing.resolvedEntityId,
          message: 'Operation already processed previously'
        });
        continue;
      }

      try {
        let resolvedEntityId = '';

        // 2. Dispatch based on entityType
        if (entityType === 'DailyContributionLog') {
          const { householdId, villageId, actualDungKg, dungKg, kitchenWasteKg, agriWasteKg } = payload;
          const dKg = Number(actualDungKg || dungKg) || 0;
          const aKg = Number(agriWasteKg) || 0;
          const kKg = Number(kitchenWasteKg) || 0;
          const tot = dKg + aKg + kKg;

          const rec = await DailyContributionLog.create({
            household: householdId,
            village: villageId || req.user.village,
            contributionDate: new Date(clientTimestamp || Date.now()),
            dungKg: dKg,
            kitchenWasteKg: kKg,
            agriWasteKg: aKg,
            totalKg: tot,
            incentivePointsEarned: Math.round(tot * 1.5),
            incentiveValueINR: Math.round(tot * 0.75),
            slurryCreditLiters: Math.round(tot * 0.95),
            isVerified: true,
            loggedBy: req.user._id
          });
          resolvedEntityId = rec._id.toString();
        } else if (entityType === 'WasteCollectionRecord') {
          const { requestId, actualCollectedKg, notes } = payload;
          const reqDoc = await WasteCollectionRequest.findById(requestId);
          if (reqDoc) {
            reqDoc.actualCollectedKg = Number(actualCollectedKg) || reqDoc.estimatedQuantityKg;
            reqDoc.status = 'Collected';
            reqDoc.collectedAt = new Date(clientTimestamp || Date.now());
            reqDoc.recordedBy = req.user._id;
            if (notes) reqDoc.notes = notes;
            await reqDoc.save();
            resolvedEntityId = reqDoc._id.toString();
          }
        } else if (entityType === 'PlantMonitoring') {
          const { plantId, villageId, gasProductionM3, feedstockInputKg, ph, temperatureC, operatingStatus } = payload;
          const mon = await PlantMonitoring.create({
            biogasPlant: plantId,
            village: villageId || req.user.village,
            gasProductionM3: Number(gasProductionM3) || 0,
            feedstockInputKg: Number(feedstockInputKg) || 0,
            ph: Number(ph) || 7.2,
            temperatureC: Number(temperatureC) || 35,
            operatingStatus: operatingStatus || 'Normal',
            recordedBy: req.user._id,
            timestamp: new Date(clientTimestamp || Date.now())
          });
          resolvedEntityId = mon._id.toString();
        } else if (entityType === 'PlantBreakdownReport') {
          const { plantId, villageId, issueCategory, urgency, description } = payload;
          const count = await PlantBreakdownReport.countDocuments();
          const reportNumber = `BRK-SYNC-${String(count + 1).padStart(4, '0')}`;
          const brk = await PlantBreakdownReport.create({
            reportNumber,
            biogasPlant: plantId,
            village: villageId || req.user.village,
            reportedBy: req.user._id,
            reporterRole: req.user.role,
            issueCategory: issueCategory || 'Other Technical Issue',
            urgency: urgency || 'Medium',
            description: description || 'Field reported offline',
            status: 'Reported'
          });
          resolvedEntityId = brk._id.toString();
        }

        // 3. Record in OfflineSyncLog
        await OfflineSyncLog.create({
          clientOpId,
          user: req.user._id,
          village: req.user.village?._id || req.user.village || null,
          entityType,
          operation: operation || 'CREATE',
          payload,
          status: 'Applied',
          resolvedEntityId,
          clientTimestamp: new Date(clientTimestamp || Date.now()),
          serverTimestamp: new Date()
        });

        results.push({
          clientOpId,
          status: 'Applied',
          resolvedEntityId,
          entityType
        });
      } catch (err) {
        console.error('Error executing sync operation:', err);
        await OfflineSyncLog.create({
          clientOpId,
          user: req.user._id,
          village: req.user.village?._id || req.user.village || null,
          entityType,
          operation: operation || 'CREATE',
          payload,
          status: 'Failed',
          errorMessage: err.message,
          clientTimestamp: new Date(clientTimestamp || Date.now()),
          serverTimestamp: new Date()
        });
        results.push({ clientOpId, status: 'Failed', error: err.message });
      }
    }

    res.json({
      success: true,
      appliedCount: results.filter((r) => r.status === 'Applied').length,
      ignoredCount: results.filter((r) => r.status === 'Duplicate Ignored').length,
      failedCount: results.filter((r) => r.status === 'Failed').length,
      results
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get sync logs for user
// @route   GET /api/sync/logs
// @access  Private
const getSyncLogs = async (req, res, next) => {
  try {
    const logs = await OfflineSyncLog.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  syncBatch,
  getSyncLogs
};
