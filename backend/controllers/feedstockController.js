const mongoose = require('mongoose');
const FeedstockRecord = require('../models/FeedstockRecord');
const Household = require('../models/Household');
const Village = require('../models/Village');
const { computeSeasonalForecastWithMetrics } = require('./reportController');
const { validateNumberInRange, collectErrors } = require('../utils/validators');
const { logAuditEvent } = require('../utils/auditLogger');

// @desc    Get feedstock collection records with filters & pagination
// @route   GET /api/feedstock
// @access  Private
const getFeedstockRecords = async (req, res, next) => {
  try {
    const { villageId, season, status, startDate, endDate, page = 1, limit = 15 } = req.query;

    const query = {};

    // Role-based scoping (cast to ObjectId so Mongoose aggregate $match works accurately)
    if (req.user.role === 'coordinator' && req.user.village) {
      const coordVid = req.user.village._id || req.user.village;
      query.village = mongoose.Types.ObjectId.isValid(coordVid)
        ? new mongoose.Types.ObjectId(coordVid)
        : coordVid;
    } else if (villageId && villageId !== 'all') {
      query.village = mongoose.Types.ObjectId.isValid(villageId)
        ? new mongoose.Types.ObjectId(villageId)
        : villageId;
    }

    if (season && season !== 'all') {
      query.season = season;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (startDate || endDate) {
      query.collectionDate = {};
      if (startDate) query.collectionDate.$gte = new Date(startDate);
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        query.collectionDate.$lte = eDate;
      }
    }

    const total = await FeedstockRecord.countDocuments(query);
    const records = await FeedstockRecord.find(query)
      .sort({ collectionDate: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate('village', 'name district')
      .populate('household', 'householdCode headOfFamily')
      .populate('destinationPlant', 'plantName plantCode');

    // Calculate overall statistics for this filtered set
    const aggregateTotals = await FeedstockRecord.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalDung: { $sum: '$dungKg' },
          totalAgri: { $sum: '$agriWasteKg' },
          totalKitchen: { $sum: '$kitchenWasteKg' },
          grandTotal: { $sum: '$totalKg' }
        }
      }
    ]);

    const stats = aggregateTotals[0] || {
      totalDung: 0,
      totalAgri: 0,
      totalKitchen: 0,
      grandTotal: 0
    };

    res.json({
      success: true,
      count: records.length,
      total,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      stats,
      data: records
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Record new daily feedstock collection
// @route   POST /api/feedstock
// @access  Private (Coordinator or Admin)
const createFeedstockRecord = async (req, res, next) => {
  try {
    const {
      villageId,
      householdId,
      collectionDate,
      dungKg,
      agriWasteKg = 0,
      kitchenWasteKg = 0,
      season,
      collectorName,
      status,
      destinationPlantId,
      notes
    } = req.body;

    const assignedVillage = villageId || (req.user.village ? req.user.village._id || req.user.village : null);

    if (!assignedVillage) {
      return res.status(400).json({
        success: false,
        message: 'Village ID is required for feedstock recording'
      });
    }

    const errors = collectErrors([
      validateNumberInRange(dungKg, 'Dung quantity (kg)', 0, 50000),
      validateNumberInRange(agriWasteKg, 'Agricultural waste (kg)', 0, 50000),
      validateNumberInRange(kitchenWasteKg, 'Kitchen waste (kg)', 0, 50000)
    ]);

    const totalKg = (Number(dungKg) || 0) + (Number(agriWasteKg) || 0) + (Number(kitchenWasteKg) || 0);
    if (totalKg <= 0) {
      errors.push('Total feedstock weight must be greater than 0 kg.');
    } else if (totalKg > 50000) {
      errors.push('Total single feedstock collection record cannot exceed 50,000 kg.');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors[0],
        errors
      });
    }

    const record = await FeedstockRecord.create({
      village: assignedVillage,
      household: householdId || null,
      collectionDate: collectionDate || Date.now(),
      dungKg: Number(dungKg) || 0,
      agriWasteKg: Number(agriWasteKg) || 0,
      kitchenWasteKg: Number(kitchenWasteKg) || 0,
      totalKg,
      season: season || 'Summer',
      collectorName: collectorName || req.user.name,
      status: status || 'Fed to Digester',
      destinationPlant: destinationPlantId || null,
      notes: notes || ''
    });

    await logAuditEvent(req, {
      action: 'CREATE_FEEDSTOCK',
      entityType: 'FeedstockRecord',
      entityId: record._id,
      summary: `Logged ${totalKg} kg feedstock (${record.season})`,
      metadata: { dungKg: record.dungKg, agriWasteKg: record.agriWasteKg, kitchenWasteKg: record.kitchenWasteKg, totalKg }
    });

    res.status(201).json({
      success: true,
      data: record
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get seasonal availability, utilization trends & MAE/RMSE forecast accuracy
// @route   GET /api/feedstock/seasonal-trends
// @access  Private
const getSeasonalTrends = async (req, res, next) => {
  try {
    const { villageId } = req.query;
    const query = {};
    if (villageId && villageId !== 'all') {
      query.village = mongoose.Types.ObjectId.isValid(villageId)
        ? new mongoose.Types.ObjectId(villageId)
        : villageId;
    }

    const seasonalStats = await FeedstockRecord.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$season',
          avgDungKg: { $avg: '$dungKg' },
          avgAgriKg: { $avg: '$agriWasteKg' },
          avgKitchenKg: { $avg: '$kitchenWasteKg' },
          totalCollectedKg: { $sum: '$totalKg' },
          recordCount: { $sum: 1 }
        }
      }
    ]);

    // Available vs Utilized comparison
    const statusStats = await FeedstockRecord.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          totalKg: { $sum: '$totalKg' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Real time-series forecast & MAE/RMSE evaluation
    const chronologicalRecords = await FeedstockRecord.find(query).sort({ collectionDate: 1 }).limit(365);
    const forecast = computeSeasonalForecastWithMetrics(chronologicalRecords);

    res.json({
      success: true,
      data: {
        seasonal: seasonalStats,
        utilization: statusStats,
        forecast
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update existing feedstock record
// @route   PUT /api/feedstock/:id
// @access  Private (Coordinator or Admin)
const updateFeedstockRecord = async (req, res, next) => {
  try {
    const record = await FeedstockRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Feedstock record not found' });
    }

    const { dungKg, agriWasteKg, kitchenWasteKg, status, collectorName, season, notes } = req.body;

    if (dungKg !== undefined) record.dungKg = Number(dungKg);
    if (agriWasteKg !== undefined) record.agriWasteKg = Number(agriWasteKg);
    if (kitchenWasteKg !== undefined) record.kitchenWasteKg = Number(kitchenWasteKg);
    if (status) record.status = status;
    if (collectorName) record.collectorName = collectorName;
    if (season) record.season = season;
    if (notes !== undefined) record.notes = notes;

    record.totalKg = (record.dungKg || 0) + (record.agriWasteKg || 0) + (record.kitchenWasteKg || 0);

    await record.save();

    await logAuditEvent(req, {
      action: 'UPDATE_FEEDSTOCK',
      entityType: 'FeedstockRecord',
      entityId: record._id,
      summary: `Updated feedstock record ${record._id} (total: ${record.totalKg} kg, status: ${record.status})`,
      metadata: { totalKg: record.totalKg, status: record.status }
    });

    res.json({
      success: true,
      data: record
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete feedstock record
// @route   DELETE /api/feedstock/:id
// @access  Private (Coordinator or Admin)
const deleteFeedstockRecord = async (req, res, next) => {
  try {
    const record = await FeedstockRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Feedstock record not found' });
    }

    await record.deleteOne();

    await logAuditEvent(req, {
      action: 'DELETE_FEEDSTOCK',
      entityType: 'FeedstockRecord',
      entityId: record._id,
      summary: `Deleted feedstock collection record ${record._id}`
    });

    res.json({
      success: true,
      message: 'Feedstock record deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFeedstockRecords,
  createFeedstockRecord,
  updateFeedstockRecord,
  deleteFeedstockRecord,
  getSeasonalTrends
};
