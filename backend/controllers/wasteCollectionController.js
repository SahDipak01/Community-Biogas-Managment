const WasteCollectionRequest = require('../models/WasteCollectionRequest');
const Household = require('../models/Household');
const FeedstockRecord = require('../models/FeedstockRecord');
const DailyContributionLog = require('../models/DailyContributionLog');
const CommunityAchievement = require('../models/CommunityAchievement');
const AuditLog = require('../models/AuditLog');

// @desc    Get waste collection requests
// @route   GET /api/waste-collection
// @access  Private
const getRequests = async (req, res, next) => {
  try {
    const query = {};
    const { status, date, villageId } = req.query;

    if (req.user.role === 'household') {
      const hh = await Household.findOne({ user: req.user._id });
      if (hh) {
        query.household = hh._id;
      } else {
        query.user = req.user._id;
      }
    } else if (req.user.role === 'coordinator') {
      const vid = req.user.village?._id || req.user.village || villageId;
      if (vid) query.village = vid;
    } else if (villageId && villageId !== 'all') {
      query.village = villageId;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      query.preferredDate = { $gte: startOfDay, $lte: endOfDay };
    }

    const requests = await WasteCollectionRequest.find(query)
      .populate('household', 'householdCode headOfFamily contactPhone location')
      .populate('village', 'name district state')
      .populate('recordedBy', 'name role')
      .sort({ createdAt: -1 })
      .limit(100);

    // Summary counts
    const counts = {
      total: requests.length,
      pending: requests.filter((r) => ['Submitted', 'Approved', 'Scheduled', 'Assigned'].includes(r.status)).length,
      collected: requests.filter((r) => r.status === 'Collected').length,
      missed: requests.filter((r) => r.status === 'Missed').length
    };

    res.json({
      success: true,
      count: requests.length,
      summary: counts,
      data: requests
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a waste pickup request
// @route   POST /api/waste-collection
// @access  Private (Household, Coordinator, Admin)
const createRequest = async (req, res, next) => {
  try {
    const {
      householdId,
      wasteTypes,
      estimatedQuantityKg,
      preferredDate,
      preferredTimeSlot,
      pickupLocation,
      additionalInstructions
    } = req.body;

    let targetHousehold = null;
    if (req.user.role === 'household') {
      targetHousehold = await Household.findOne({ user: req.user._id });
    } else if (householdId) {
      targetHousehold = await Household.findById(householdId);
    }

    if (!targetHousehold) {
      return res.status(400).json({
        success: false,
        message: 'Valid household record is required to schedule waste pickup'
      });
    }

    const reqCount = await WasteCollectionRequest.countDocuments();
    const requestNumber = `WCR-${new Date().getFullYear()}-${String(reqCount + 1).padStart(4, '0')}`;

    const location = pickupLocation || {
      address: `Household ${targetHousehold.householdCode}, ${targetHousehold.headOfFamily}`,
      latitude: targetHousehold.location?.latitude || 0,
      longitude: targetHousehold.location?.longitude || 0
    };

    const newRequest = await WasteCollectionRequest.create({
      requestNumber,
      household: targetHousehold._id,
      user: req.user._id,
      village: targetHousehold.village,
      wasteTypes: wasteTypes || ['Cattle Dung'],
      estimatedQuantityKg: Number(estimatedQuantityKg) || 10,
      preferredDate: new Date(preferredDate || Date.now()),
      preferredTimeSlot: preferredTimeSlot || 'Morning (06:00 - 09:00)',
      pickupLocation: location,
      additionalInstructions: additionalInstructions || '',
      status: 'Submitted'
    });

    await AuditLog.create({
      actor: req.user._id,
      actorName: req.user.name,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'COLLECTION_REQUEST_CREATED',
      entityType: 'WasteCollectionRequest',
      entityId: newRequest._id.toString(),
      summary: `Created waste pickup request ${requestNumber} for ${estimatedQuantityKg}kg`,
      metadata: { requestNumber, estimatedQuantityKg, wasteTypes }
    });

    res.status(201).json({
      success: true,
      message: 'Waste collection request submitted successfully',
      data: newRequest
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update collection request status / schedule worker
// @route   PUT /api/waste-collection/:id/status
// @access  Private (Coordinator, Admin)
const updateStatus = async (req, res, next) => {
  try {
    const { status, scheduledDate, assignedWorker, missedReason, notes } = req.body;
    const request = await WasteCollectionRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Collection request not found' });
    }

    if (status) request.status = status;
    if (scheduledDate) request.scheduledDate = new Date(scheduledDate);
    if (assignedWorker) request.assignedWorker = assignedWorker;
    if (missedReason) request.missedReason = missedReason;
    if (notes) request.notes = notes;
    request.recordedBy = req.user._id;

    await request.save();

    await AuditLog.create({
      actor: req.user._id,
      actorName: req.user.name,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'COLLECTION_STATUS_UPDATED',
      entityType: 'WasteCollectionRequest',
      entityId: request._id.toString(),
      summary: `Updated pickup request ${request.requestNumber} status to ${status}`,
      metadata: { status, assignedWorker, missedReason }
    });

    res.json({
      success: true,
      message: `Request status updated to ${request.status}`,
      data: request
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Record collection completion and integrate feedstock record
// @route   POST /api/waste-collection/:id/complete
// @access  Private (Coordinator, Admin)
const recordCompletion = async (req, res, next) => {
  try {
    const { actualCollectedKg, notes } = req.body;
    const request = await WasteCollectionRequest.findById(req.params.id).populate('household');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Collection request not found' });
    }

    const collectedKg = Number(actualCollectedKg) || request.estimatedQuantityKg;
    request.actualCollectedKg = collectedKg;
    request.status = 'Collected';
    request.collectedAt = new Date();
    request.recordedBy = req.user._id;
    if (notes) request.notes = notes;

    await request.save();

    // 1. Record daily contribution log
    await DailyContributionLog.create({
      village: request.village,
      household: request.household._id,
      contributionDate: new Date(),
      dungKg: collectedKg,
      agriWasteKg: 0,
      kitchenWasteKg: 0,
      totalKg: collectedKg,
      incentivePointsEarned: Math.round(collectedKg * 1.5),
      incentiveValueINR: Math.round(collectedKg * 0.75),
      slurryCreditLiters: Math.round(collectedKg * 0.95),
      isVerified: true,
      loggedBy: req.user._id
    });

    // 2. Check for achievement milestones (e.g. 1000kg club or First Contribution)
    const existingAchievements = await CommunityAchievement.find({ household: request.household._id });
    if (existingAchievements.length === 0) {
      await CommunityAchievement.create({
        household: request.household._id,
        user: request.user,
        village: request.village,
        badgeType: 'First Contribution',
        title: 'Green Pioneer: First Contribution',
        description: 'Successfully contributed first verified batch of rural organic waste',
        pointsAwarded: 50
      });
    }

    await AuditLog.create({
      actor: req.user._id,
      actorName: req.user.name,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'COLLECTION_COMPLETED',
      entityType: 'WasteCollectionRequest',
      entityId: request._id.toString(),
      summary: `Completed pickup ${request.requestNumber}: ${collectedKg}kg collected`,
      metadata: { collectedKg, householdCode: request.household?.householdCode }
    });

    res.json({
      success: true,
      message: `Pickup recorded successfully. ${collectedKg} kg logged.`,
      data: request
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get daily collection schedules
// @route   GET /api/waste-collection/schedules
// @access  Private
const getSchedules = async (req, res, next) => {
  try {
    const { villageId, date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    const start = new Date(targetDate.setHours(0, 0, 0, 0));
    const end = new Date(targetDate.setHours(23, 59, 59, 999));

    const query = {
      preferredDate: { $gte: start, $lte: end }
    };
    if (villageId && villageId !== 'all') {
      query.village = villageId;
    } else if (req.user.role === 'coordinator' && req.user.village) {
      query.village = req.user.village._id || req.user.village;
    }

    const scheduled = await WasteCollectionRequest.find(query)
      .populate('household', 'householdCode headOfFamily contactPhone location')
      .populate('village', 'name')
      .sort({ preferredTimeSlot: 1 });

    res.json({
      success: true,
      date: start.toISOString().split('T')[0],
      count: scheduled.length,
      data: scheduled
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRequests,
  createRequest,
  updateStatus,
  recordCompletion,
  getSchedules
};
