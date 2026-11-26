const GasInterruption = require('../models/GasInterruption');
const BiogasPlant = require('../models/BiogasPlant');
const Household = require('../models/Household');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

// @desc    Get gas interruption notices
// @route   GET /api/gas-interruptions
// @access  Private
const getInterruptions = async (req, res, next) => {
  try {
    const { status, plantId, villageId } = req.query;
    const query = {};

    if (req.user.role === 'coordinator' && req.user.village) {
      query.village = req.user.village._id || req.user.village;
    } else if (villageId && villageId !== 'all') {
      query.village = villageId;
    }

    if (plantId && plantId !== 'all') {
      query.biogasPlant = plantId;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    const notices = await GasInterruption.find(query)
      .populate('biogasPlant', 'plantName plantCode capacityM3')
      .populate('village', 'name district state')
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 })
      .limit(50);

    const activeCount = notices.filter((n) =>
      ['Active Interruption', 'Restoration In Progress'].includes(n.status)
    ).length;

    res.json({
      success: true,
      count: notices.length,
      activeCount,
      data: notices
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a gas interruption announcement
// @route   POST /api/gas-interruptions
// @access  Private (Coordinator, Admin)
const createInterruption = async (req, res, next) => {
  try {
    const {
      biogasPlantId,
      villageId,
      interruptionType,
      affectedAreas,
      reason,
      startTime,
      estimatedRestoration
    } = req.body;

    let targetPlant = null;
    if (biogasPlantId) {
      targetPlant = await BiogasPlant.findById(biogasPlantId);
    } else {
      const vid = villageId || (req.user.village?._id || req.user.village);
      if (vid) {
        targetPlant = await BiogasPlant.findOne({ village: vid });
      }
      if (!targetPlant) {
        targetPlant = await BiogasPlant.findOne();
      }
    }

    if (!targetPlant) {
      return res.status(400).json({ success: false, message: 'Valid Biogas Plant is required' });
    }

    const count = await GasInterruption.countDocuments();
    const noticeNumber = `INT-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // Calculate count of affected households
    const affectedHhCount = await Household.countDocuments({ village: targetPlant.village });

    const notice = await GasInterruption.create({
      noticeNumber,
      biogasPlant: targetPlant._id,
      village: targetPlant.village,
      interruptionType: interruptionType || 'Planned Maintenance',
      affectedAreas: affectedAreas || ['Main Village Grid', 'Cluster A', 'Cluster B'],
      affectedHouseholdCount: affectedHhCount || 15,
      reason,
      startTime: startTime ? new Date(startTime) : new Date(),
      estimatedRestoration: estimatedRestoration ? new Date(estimatedRestoration) : null,
      status: 'Active Interruption',
      createdBy: req.user._id
    });

    // Create system notification
    await Notification.create({
      recipient: null, // Broadcast to village
      title: `Gas Supply Alert: ${notice.interruptionType}`,
      message: `Biogas supply from ${targetPlant.plantName} temporarily suspended due to ${reason}. Estimated restoration: ${estimatedRestoration ? new Date(estimatedRestoration).toLocaleTimeString() : 'Pending update'}.`,
      type: 'warning',
      category: 'gas_supply',
      village: targetPlant.village
    });

    await AuditLog.create({
      actor: req.user._id,
      actorName: req.user.name,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'GAS_INTERRUPTION_ANNOUNCED',
      entityType: 'GasInterruption',
      entityId: notice._id.toString(),
      summary: `Published gas supply interruption ${noticeNumber} (${notice.interruptionType})`,
      metadata: { noticeNumber, plantName: targetPlant.plantName, affectedHhCount }
    });

    res.status(201).json({
      success: true,
      message: 'Gas supply interruption announcement published',
      data: notice
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update restoration progress or mark supply restored
// @route   PUT /api/gas-interruptions/:id/status
// @access  Private (Coordinator, Admin)
const updateInterruptionStatus = async (req, res, next) => {
  try {
    const { status, estimatedRestoration, restorationNotes } = req.body;
    const notice = await GasInterruption.findById(req.params.id).populate('biogasPlant');

    if (!notice) {
      return res.status(404).json({ success: false, message: 'Interruption notice not found' });
    }

    if (status) notice.status = status;
    if (estimatedRestoration) notice.estimatedRestoration = new Date(estimatedRestoration);
    if (restorationNotes) notice.restorationNotes = restorationNotes;

    if (status === 'Restored') {
      notice.actualRestoration = new Date();

      await Notification.create({
        recipient: null,
        title: 'Gas Supply Restored',
        message: `Biogas supply from ${notice.biogasPlant?.plantName || 'village plant'} has been restored. Normal pressure operational.`,
        type: 'success',
        category: 'gas_supply',
        village: notice.village
      });
    }

    await notice.save();

    await AuditLog.create({
      actor: req.user._id,
      actorName: req.user.name,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'GAS_INTERRUPTION_UPDATED',
      entityType: 'GasInterruption',
      entityId: notice._id.toString(),
      summary: `Updated gas outage ${notice.noticeNumber} status to ${status}`,
      metadata: { status, restorationNotes }
    });

    res.json({
      success: true,
      message: `Interruption status updated to ${notice.status}`,
      data: notice
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInterruptions,
  createInterruption,
  updateInterruptionStatus
};
