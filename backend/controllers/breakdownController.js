const PlantBreakdownReport = require('../models/PlantBreakdownReport');
const BiogasPlant = require('../models/BiogasPlant');
const AuditLog = require('../models/AuditLog');

// @desc    Get plant breakdown reports
// @route   GET /api/breakdowns
// @access  Private
const getBreakdowns = async (req, res, next) => {
  try {
    const { status, plantId, villageId, urgency } = req.query;
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

    if (urgency && urgency !== 'all') {
      query.urgency = urgency;
    }

    const reports = await PlantBreakdownReport.find(query)
      .populate('biogasPlant', 'plantName plantCode capacityM3 plantType')
      .populate('village', 'name district state')
      .populate('reportedBy', 'name role email')
      .sort({ createdAt: -1 })
      .limit(100);

    const counts = {
      total: reports.length,
      open: reports.filter((r) => !['Resolved', 'Verified', 'Closed'].includes(r.status)).length,
      critical: reports.filter((r) => r.urgency === 'Emergency / Critical').length,
      resolved: reports.filter((r) => ['Resolved', 'Verified', 'Closed'].includes(r.status)).length
    };

    res.json({
      success: true,
      count: reports.length,
      summary: counts,
      data: reports
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Report a plant technical breakdown / defect
// @route   POST /api/breakdowns
// @access  Private
const reportBreakdown = async (req, res, next) => {
  try {
    const {
      biogasPlantId,
      villageId,
      issueCategory,
      urgency,
      description,
      photoUrl
    } = req.body;

    let targetPlant = null;
    if (biogasPlantId) {
      targetPlant = await BiogasPlant.findById(biogasPlantId);
    } else {
      // Find default plant in village
      const vid = villageId || (req.user.village?._id || req.user.village);
      targetPlant = await BiogasPlant.findOne({ village: vid });
    }

    if (!targetPlant) {
      return res.status(400).json({ success: false, message: 'Valid Biogas Plant is required' });
    }

    const reportCount = await PlantBreakdownReport.countDocuments();
    const reportNumber = `BRK-${new Date().getFullYear()}-${String(reportCount + 1).padStart(4, '0')}`;

    const report = await PlantBreakdownReport.create({
      reportNumber,
      biogasPlant: targetPlant._id,
      village: targetPlant.village,
      reportedBy: req.user._id,
      reporterRole: req.user.role,
      issueCategory: issueCategory || 'Other Technical Issue',
      urgency: urgency || 'Medium',
      description,
      photoUrl: photoUrl || '',
      status: 'Reported'
    });

    // If critical/emergency or gas leak, update plant status to Warning/Critical
    if (urgency === 'Emergency / Critical' || issueCategory === 'Suspected Gas Leakage') {
      targetPlant.operationalStatus = 'Maintenance / Breakdown';
      await targetPlant.save();
    }

    await AuditLog.create({
      actor: req.user._id,
      actorName: req.user.name,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'PLANT_BREAKDOWN_REPORTED',
      entityType: 'PlantBreakdownReport',
      entityId: report._id.toString(),
      summary: `Reported issue ${reportNumber} for ${targetPlant.plantName}: ${issueCategory} (${urgency})`,
      metadata: { reportNumber, plantCode: targetPlant.plantCode, urgency, issueCategory }
    });

    res.status(201).json({
      success: true,
      message: 'Plant breakdown report submitted successfully',
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update breakdown status / record repairs
// @route   PUT /api/breakdowns/:id/status
// @access  Private (Coordinator, Admin)
const updateBreakdownStatus = async (req, res, next) => {
  try {
    const {
      status,
      assignedTechnician,
      inspectionFindings,
      repairDetails,
      repairCostInr,
      downtimeHours
    } = req.body;

    const report = await PlantBreakdownReport.findById(req.params.id).populate('biogasPlant');
    if (!report) {
      return res.status(404).json({ success: false, message: 'Breakdown report not found' });
    }

    if (status) report.status = status;
    if (assignedTechnician) report.assignedTechnician = assignedTechnician;
    if (inspectionFindings) report.inspectionFindings = inspectionFindings;
    if (repairDetails) report.repairDetails = repairDetails;
    if (repairCostInr !== undefined) report.repairCostInr = Number(repairCostInr);
    if (downtimeHours !== undefined) report.downtimeHours = Number(downtimeHours);

    if (status === 'Resolved' || status === 'Verified' || status === 'Closed') {
      report.resolvedAt = new Date();
      report.verifiedBy = req.user._id;

      // If plant was down, restore operationalStatus
      if (report.biogasPlant) {
        report.biogasPlant.operationalStatus = 'Operational (Normal)';
        await report.biogasPlant.save();
      }
    }

    await report.save();

    await AuditLog.create({
      actor: req.user._id,
      actorName: req.user.name,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'BREAKDOWN_STATUS_UPDATED',
      entityType: 'PlantBreakdownReport',
      entityId: report._id.toString(),
      summary: `Updated breakdown ${report.reportNumber} status to ${status}`,
      metadata: { status, repairCostInr, downtimeHours }
    });

    res.json({
      success: true,
      message: `Report status updated to ${report.status}`,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reopen a previously resolved breakdown
// @route   POST /api/breakdowns/:id/reopen
// @access  Private
const reopenBreakdown = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const report = await PlantBreakdownReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ success: false, message: 'Breakdown report not found' });
    }

    report.status = 'Reported';
    report.reopenHistory.push({
      reopenedAt: new Date(),
      reopenedBy: req.user._id,
      reason: reason || 'Issue recurring after repair'
    });

    await report.save();

    await AuditLog.create({
      actor: req.user._id,
      actorName: req.user.name,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'BREAKDOWN_REOPENED',
      entityType: 'PlantBreakdownReport',
      entityId: report._id.toString(),
      summary: `Reopened breakdown report ${report.reportNumber}: ${reason}`,
      metadata: { reason }
    });

    res.json({
      success: true,
      message: 'Breakdown report reopened for technician inspection',
      data: report
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBreakdowns,
  reportBreakdown,
  updateBreakdownStatus,
  reopenBreakdown
};
