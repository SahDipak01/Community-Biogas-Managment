const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { logAuditEvent } = require('../utils/auditLogger');

// @desc    Get all users with search & role filter
// @route   GET /api/users
// @access  Private (Admin only)
const getUsers = async (req, res, next) => {
  try {
    const { role, status, search, villageId } = req.query;

    const query = {};
    if (role && role !== 'all') query.role = role;
    if (status && status !== 'all') query.status = status;
    if (villageId && villageId !== 'all') query.village = villageId;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query).populate('village', 'name district state').sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user role or status
// @route   PUT /api/users/:id
// @access  Private (Admin only)
const updateUser = async (req, res, next) => {
  try {
    const { role, status, villageId } = req.body;

    const fieldsToUpdate = {};
    if (role) fieldsToUpdate.role = role;
    if (status) fieldsToUpdate.status = status;
    if (villageId !== undefined) fieldsToUpdate.village = villageId || null;

    const user = await User.findByIdAndUpdate(req.params.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    }).populate('village');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await logAuditEvent(req, {
      action: 'UPDATE_USER_ACCESS',
      entityType: 'User',
      entityId: user._id,
      summary: `Updated user ${user.email}: role=${user.role}, status=${user.status}`,
      metadata: { role: user.role, status: user.status, villageId: villageId ?? undefined }
    });

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin reset a user's password
// @route   PUT /api/users/:id/reset-password
// @access  Private (Admin only)
const adminResetPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    targetUser.password = newPassword;
    targetUser.resetPasswordToken = undefined;
    targetUser.resetPasswordExpire = undefined;
    await targetUser.save();

    await logAuditEvent(req, {
      action: 'ADMIN_RESET_PASSWORD',
      entityType: 'User',
      entityId: targetUser._id,
      summary: `Admin ${req.user.email} reset password for user ${targetUser.email}`,
      metadata: { targetUserEmail: targetUser.email }
    });

    res.json({
      success: true,
      message: `Password for ${targetUser.name} (${targetUser.email}) updated successfully.`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get system audit logs (Admin only)
// @route   GET /api/users/audit-logs
// @access  Private (Admin only)
const getAuditLogs = async (req, res, next) => {
  try {
    const { entityType, action, search, limit = 50 } = req.query;
    const query = {};
    if (entityType && entityType !== 'all') query.entityType = entityType;
    if (action && action !== 'all') query.action = action;
    if (search) {
      query.$or = [
        { summary: { $regex: search, $options: 'i' } },
        { actorName: { $regex: search, $options: 'i' } },
        { actorEmail: { $regex: search, $options: 'i' } },
        { action: { $regex: search, $options: 'i' } }
      ];
    }

    const cappedLimit = Math.min(200, Math.max(1, Number(limit) || 50));
    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query).sort({ createdAt: -1 }).limit(cappedLimit);

    res.json({
      success: true,
      count: logs.length,
      total,
      data: logs
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  updateUser,
  adminResetPassword,
  getAuditLogs
};
