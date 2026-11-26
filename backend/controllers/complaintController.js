const CommunityComplaint = require('../models/CommunityComplaint');
const Household = require('../models/Household');
const AuditLog = require('../models/AuditLog');

// @desc    Get community grievances and complaints
// @route   GET /api/complaints
// @access  Private
const getComplaints = async (req, res, next) => {
  try {
    const { status, category, priority, villageId } = req.query;
    const query = {};

    if (req.user.role === 'household') {
      query.user = req.user._id;
    } else if (req.user.role === 'coordinator' && req.user.village) {
      query.village = req.user.village._id || req.user.village;
    } else if (villageId && villageId !== 'all') {
      query.village = villageId;
    }

    if (status && status !== 'all') query.status = status;
    if (category && category !== 'all') query.category = category;
    if (priority && priority !== 'all') query.priority = priority;

    const complaints = await CommunityComplaint.find(query)
      .populate('user', 'name email role')
      .populate('household', 'householdCode headOfFamily contactPhone')
      .populate('village', 'name district state')
      .populate('assignedTo', 'name role')
      .sort({ createdAt: -1 })
      .limit(100);

    const counts = {
      total: complaints.length,
      pending: complaints.filter((c) => ['Submitted', 'Acknowledged', 'Under Review', 'Assigned', 'In Progress'].includes(c.status)).length,
      resolved: complaints.filter((c) => ['Resolved', 'Closed'].includes(c.status)).length,
      escalated: complaints.filter((c) => c.priority === 'Urgent').length
    };

    res.json({
      success: true,
      count: complaints.length,
      summary: counts,
      data: complaints
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit a community grievance / complaint
// @route   POST /api/complaints
// @access  Private
const createComplaint = async (req, res, next) => {
  try {
    const { category, subject, description, priority, householdId } = req.body;

    let targetHousehold = null;
    if (req.user.role === 'household') {
      targetHousehold = await Household.findOne({ user: req.user._id });
    } else if (householdId) {
      targetHousehold = await Household.findById(householdId);
    }

    const vid = targetHousehold?.village || (req.user.village?._id || req.user.village);
    if (!vid) {
      return res.status(400).json({ success: false, message: 'Village association is required' });
    }

    const ticketCount = await CommunityComplaint.countDocuments();
    const ticketNumber = `CMP-${new Date().getFullYear()}-${String(ticketCount + 1).padStart(4, '0')}`;

    const complaint = await CommunityComplaint.create({
      ticketNumber,
      household: targetHousehold?._id || null,
      user: req.user._id,
      village: vid,
      category: category || 'Gas Supply & Distribution',
      subject,
      description,
      priority: priority || 'Medium',
      status: 'Submitted'
    });

    await AuditLog.create({
      actor: req.user._id,
      actorName: req.user.name,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'COMPLAINT_SUBMITTED',
      entityType: 'CommunityComplaint',
      entityId: complaint._id.toString(),
      summary: `Logged grievance ${ticketNumber}: ${subject} (${priority})`,
      metadata: { ticketNumber, category, priority }
    });

    res.status(201).json({
      success: true,
      message: 'Grievance ticket created successfully',
      data: complaint
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update complaint status & add resolution / internal notes
// @route   PUT /api/complaints/:id/status
// @access  Private (Coordinator, Admin)
const updateComplaintStatus = async (req, res, next) => {
  try {
    const { status, assignedTo, internalNote, resolutionNotes } = req.body;
    const complaint = await CommunityComplaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint ticket not found' });
    }

    if (status) complaint.status = status;
    if (assignedTo) complaint.assignedTo = assignedTo;
    if (resolutionNotes) {
      complaint.resolutionNotes = resolutionNotes;
    }
    if (internalNote) {
      complaint.internalNotes.push({
        note: internalNote,
        addedBy: req.user._id,
        addedAt: new Date()
      });
    }

    if (status === 'Resolved' || status === 'Closed') {
      complaint.resolvedAt = new Date();
    }

    await complaint.save();

    await AuditLog.create({
      actor: req.user._id,
      actorName: req.user.name,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'COMPLAINT_STATUS_UPDATED',
      entityType: 'CommunityComplaint',
      entityId: complaint._id.toString(),
      summary: `Updated grievance ${complaint.ticketNumber} to ${status}`,
      metadata: { status, resolutionNotes }
    });

    res.json({
      success: true,
      message: `Ticket status updated to ${complaint.status}`,
      data: complaint
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reopen a closed or resolved complaint
// @route   POST /api/complaints/:id/reopen
// @access  Private
const reopenComplaint = async (req, res, next) => {
  try {
    const { reopenReason } = req.body;
    const complaint = await CommunityComplaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint ticket not found' });
    }

    complaint.status = 'Reopened';
    complaint.reopenReason = reopenReason || 'Unresolved issue persists';
    complaint.internalNotes.push({
      note: `Reopened by user: ${complaint.reopenReason}`,
      addedBy: req.user._id,
      addedAt: new Date()
    });

    await complaint.save();

    await AuditLog.create({
      actor: req.user._id,
      actorName: req.user.name,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'COMPLAINT_REOPENED',
      entityType: 'CommunityComplaint',
      entityId: complaint._id.toString(),
      summary: `Reopened complaint ${complaint.ticketNumber}: ${complaint.reopenReason}`,
      metadata: { reopenReason }
    });

    res.json({
      success: true,
      message: 'Grievance ticket reopened for administrative review',
      data: complaint
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit satisfaction feedback for resolved ticket
// @route   POST /api/complaints/:id/feedback
// @access  Private (Household)
const submitFeedback = async (req, res, next) => {
  try {
    const { feedbackRating, feedbackComments } = req.body;
    const complaint = await CommunityComplaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint ticket not found' });
    }

    complaint.feedbackRating = Number(feedbackRating) || 5;
    complaint.feedbackComments = feedbackComments || '';
    if (complaint.status === 'Resolved') {
      complaint.status = 'Closed';
    }

    await complaint.save();

    res.json({
      success: true,
      message: 'Thank you for your feedback',
      data: complaint
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getComplaints,
  createComplaint,
  updateComplaintStatus,
  reopenComplaint,
  submitFeedback
};
