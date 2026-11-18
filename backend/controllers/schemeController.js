const GovernmentScheme = require('../models/GovernmentScheme');
const { validateNumberInRange, validateHttpUrl, collectErrors } = require('../utils/validators');
const { logAuditEvent } = require('../utils/auditLogger');

// @desc    Get all government schemes with filtering & search
// @route   GET /api/schemes
// @access  Public (or Private)
const getGovernmentSchemes = async (req, res, next) => {
  try {
    const { category, search, plantSize } = req.query;

    const query = { isActive: true };

    if (category && category !== 'all') {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { schemeName: { $regex: search, $options: 'i' } },
        { implementingAgency: { $regex: search, $options: 'i' } },
        { shortCode: { $regex: search, $options: 'i' } }
      ];
    }

    if (plantSize) {
      query.eligiblePlantSizesM3 = Number(plantSize);
    }

    const schemes = await GovernmentScheme.find(query).sort({ 'subsidyDetails.maxSubsidyAmount': -1 });

    res.json({
      success: true,
      count: schemes.length,
      data: schemes
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new government scheme (Admin only)
// @route   POST /api/schemes
// @access  Private (Admin)
const createScheme = async (req, res, next) => {
  try {
    const subsidyDetails = req.body.subsidyDetails || {};
    const errors = collectErrors([
      !req.body.schemeName || !String(req.body.schemeName).trim() ? 'Scheme name is required.' : null,
      validateNumberInRange(subsidyDetails.subsidyPercentage, 'Subsidy percentage (%)', 0, 100),
      validateNumberInRange(subsidyDetails.maxSubsidyAmount, 'Maximum subsidy amount (INR)', 0, 100000000),
      validateHttpUrl(req.body.officialPortalUrl, 'Official portal URL')
    ]);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors[0],
        errors
      });
    }

    const scheme = await GovernmentScheme.create(req.body);

    await logAuditEvent(req, {
      action: 'CREATE_SCHEME',
      entityType: 'GovernmentScheme',
      entityId: scheme._id,
      summary: `Created government scheme "${scheme.schemeName}"`,
      metadata: { category: scheme.category, maxSubsidyAmount: scheme.subsidyDetails?.maxSubsidyAmount }
    });

    res.status(201).json({
      success: true,
      data: scheme
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update government scheme (Admin only)
// @route   PUT /api/schemes/:id
// @access  Private (Admin)
const updateScheme = async (req, res, next) => {
  try {
    const subsidyDetails = req.body.subsidyDetails || {};
    const errors = collectErrors([
      validateNumberInRange(subsidyDetails.subsidyPercentage, 'Subsidy percentage (%)', 0, 100),
      validateNumberInRange(subsidyDetails.maxSubsidyAmount, 'Maximum subsidy amount (INR)', 0, 100000000),
      validateHttpUrl(req.body.officialPortalUrl, 'Official portal URL')
    ]);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors[0],
        errors
      });
    }

    const scheme = await GovernmentScheme.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!scheme) {
      return res.status(404).json({
        success: false,
        message: 'Government scheme not found'
      });
    }

    await logAuditEvent(req, {
      action: 'UPDATE_SCHEME',
      entityType: 'GovernmentScheme',
      entityId: scheme._id,
      summary: `Updated government scheme "${scheme.schemeName}"`,
      metadata: { updatedFields: Object.keys(req.body || {}) }
    });

    res.json({
      success: true,
      data: scheme
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete government scheme (Admin only)
// @route   DELETE /api/schemes/:id
// @access  Private (Admin)
const deleteScheme = async (req, res, next) => {
  try {
    const scheme = await GovernmentScheme.findByIdAndDelete(req.params.id);
    if (!scheme) {
      return res.status(404).json({
        success: false,
        message: 'Government scheme not found'
      });
    }

    await logAuditEvent(req, {
      action: 'DELETE_SCHEME',
      entityType: 'GovernmentScheme',
      entityId: scheme._id,
      summary: `Deleted government scheme "${scheme.schemeName}"`
    });

    res.json({
      success: true,
      message: 'Government scheme removed successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getGovernmentSchemes,
  createScheme,
  updateScheme,
  deleteScheme
};
