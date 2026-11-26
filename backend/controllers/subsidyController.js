const SubsidyApplication = require('../models/SubsidyApplication');
const GovernmentScheme = require('../models/GovernmentScheme');
const Household = require('../models/Household');
const AuditLog = require('../models/AuditLog');

// @desc    Get subsidy applications
// @route   GET /api/subsidies
// @access  Private
const getApplications = async (req, res, next) => {
  try {
    const { status, schemeId, villageId } = req.query;
    const query = {};

    if (req.user.role === 'household') {
      const hh = await Household.findOne({ user: req.user._id });
      if (hh) query.household = hh._id;
      else query.user = req.user._id;
    } else if (req.user.role === 'coordinator' && req.user.village) {
      query.village = req.user.village._id || req.user.village;
    } else if (villageId && villageId !== 'all') {
      query.village = villageId;
    }

    if (status && status !== 'all') query.status = status;
    if (schemeId && schemeId !== 'all') query.scheme = schemeId;

    const applications = await SubsidyApplication.find(query)
      .populate('scheme', 'schemeName schemeCode ministryMaxSubsidyAmountInr eligibilityCriteria subsidyPercentage')
      .populate('household', 'householdCode headOfFamily contactPhone')
      .populate('village', 'name district state')
      .populate('reviewedBy', 'name role')
      .sort({ createdAt: -1 });

    const totalAppliedInr = applications.reduce((sum, a) => sum + (a.appliedSubsidyAmountInr || 0), 0);
    const totalApprovedInr = applications.reduce((sum, a) => sum + (a.approvedSubsidyAmountInr || 0), 0);

    res.json({
      success: true,
      count: applications.length,
      metrics: {
        totalApplications: applications.length,
        pendingVerification: applications.filter((a) => ['Submitted', 'Under Verification'].includes(a.status)).length,
        approved: applications.filter((a) => a.status === 'Approved').length,
        totalAppliedInr,
        totalApprovedInr
      },
      data: applications
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit a new subsidy assistance application
// @route   POST /api/subsidies
// @access  Private (Household, Coordinator)
const applyForSubsidy = async (req, res, next) => {
  try {
    const {
      schemeId,
      householdId,
      plantCapacityRequestedM3,
      householdCattleCount,
      documentsSubmitted
    } = req.body;

    let targetHousehold = null;
    if (req.user.role === 'household') {
      targetHousehold = await Household.findOne({ user: req.user._id });
    } else if (householdId) {
      targetHousehold = await Household.findById(householdId);
    }

    if (!targetHousehold) {
      return res.status(400).json({ success: false, message: 'Valid Household profile is required' });
    }

    const scheme = await GovernmentScheme.findById(schemeId);
    if (!scheme) {
      return res.status(404).json({ success: false, message: 'Government Scheme not found' });
    }

    const appCount = await SubsidyApplication.countDocuments();
    const applicationNumber = `SUB-${new Date().getFullYear()}-${String(appCount + 1).padStart(4, '0')}`;

    // Estimated subsidy calculation based on scheme rules
    const cap = Number(plantCapacityRequestedM3) || 2;
    const estimatedCost = cap * 24000; // ~24k INR per m3 installation benchmark
    const pct = scheme.subsidyPercentage || 40;
    const calculatedSubsidy = Math.min(
      Math.round((estimatedCost * pct) / 100),
      scheme.maxSubsidyAmountInr || 35000
    );

    const application = await SubsidyApplication.create({
      applicationNumber,
      scheme: scheme._id,
      household: targetHousehold._id,
      user: req.user._id,
      village: targetHousehold.village,
      plantCapacityRequestedM3: cap,
      householdCattleCount: Number(householdCattleCount) || 3,
      appliedSubsidyAmountInr: calculatedSubsidy,
      documentsSubmitted: documentsSubmitted || [
        { documentName: 'Aadhaar / Identity Proof', verificationStatus: 'Pending' },
        { documentName: 'Land Ownership / Tenancy Document', verificationStatus: 'Pending' },
        { documentName: 'Cattle Verification Certificate', verificationStatus: 'Pending' }
      ],
      status: 'Submitted'
    });

    await AuditLog.create({
      actor: req.user._id,
      actorName: req.user.name,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'SUBSIDY_APPLICATION_CREATED',
      entityType: 'SubsidyApplication',
      entityId: application._id.toString(),
      summary: `Submitted subsidy app ${applicationNumber} for ${scheme.schemeName} (₹${calculatedSubsidy})`,
      metadata: { applicationNumber, schemeName: scheme.schemeName, calculatedSubsidy }
    });

    res.status(201).json({
      success: true,
      message: 'Government subsidy assistance application submitted',
      data: application
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update subsidy application status & verify docs
// @route   PUT /api/subsidies/:id/status
// @access  Private (Coordinator, Admin)
const updateApplicationStatus = async (req, res, next) => {
  try {
    const {
      status,
      approvedSubsidyAmountInr,
      coordinatorNotes,
      disbursementStatus,
      documentsSubmitted
    } = req.body;

    const application = await SubsidyApplication.findById(req.params.id)
      .populate('scheme')
      .populate('household');

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    if (status) application.status = status;
    if (coordinatorNotes) application.coordinatorNotes = coordinatorNotes;
    if (disbursementStatus) application.disbursementStatus = disbursementStatus;
    if (documentsSubmitted) application.documentsSubmitted = documentsSubmitted;

    if (approvedSubsidyAmountInr !== undefined) {
      application.approvedSubsidyAmountInr = Number(approvedSubsidyAmountInr);
    } else if (status === 'Approved' && application.approvedSubsidyAmountInr === 0) {
      application.approvedSubsidyAmountInr = application.appliedSubsidyAmountInr;
    }

    application.reviewedBy = req.user._id;
    application.actionDate = new Date();

    await application.save();

    await AuditLog.create({
      actor: req.user._id,
      actorName: req.user.name,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'SUBSIDY_STATUS_UPDATED',
      entityType: 'SubsidyApplication',
      entityId: application._id.toString(),
      summary: `Updated subsidy app ${application.applicationNumber} to ${status}`,
      metadata: { status, approvedAmount: application.approvedSubsidyAmountInr }
    });

    res.json({
      success: true,
      message: `Subsidy application status updated to ${application.status}`,
      data: application
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getApplications,
  applyForSubsidy,
  updateApplicationStatus
};
