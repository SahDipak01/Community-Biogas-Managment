const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Village = require('../models/Village');
const Household = require('../models/Household');
const { logAuditEvent } = require('../utils/auditLogger');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'rural_biogas_jwt_secret_key_2026_dev', {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

// Default regional coordinates by Indian state / UT (for auto-created custom villages)
const STATE_COORDINATES = {
  'andhra pradesh': { latitude: 15.9129, longitude: 79.74 },
  'arunachal pradesh': { latitude: 28.218, longitude: 94.7278 },
  assam: { latitude: 26.2006, longitude: 92.9376 },
  bihar: { latitude: 25.5941, longitude: 85.1376 },
  chhattisgarh: { latitude: 21.2787, longitude: 81.8661 },
  goa: { latitude: 15.2993, longitude: 74.124 },
  gujarat: { latitude: 22.2587, longitude: 71.1924 },
  haryana: { latitude: 29.0588, longitude: 76.0856 },
  'himachal pradesh': { latitude: 31.1048, longitude: 77.1734 },
  jharkhand: { latitude: 23.6102, longitude: 85.2799 },
  karnataka: { latitude: 15.3173, longitude: 75.7139 },
  kerala: { latitude: 10.8505, longitude: 76.2711 },
  'madhya pradesh': { latitude: 22.9734, longitude: 78.6569 },
  maharashtra: { latitude: 19.7515, longitude: 75.7139 },
  manipur: { latitude: 24.6637, longitude: 93.9063 },
  meghalaya: { latitude: 25.467, longitude: 91.3662 },
  mizoram: { latitude: 23.1645, longitude: 92.9376 },
  nagaland: { latitude: 26.1584, longitude: 94.5624 },
  odisha: { latitude: 20.9517, longitude: 85.0985 },
  punjab: { latitude: 31.1471, longitude: 75.3412 },
  rajasthan: { latitude: 27.0238, longitude: 74.2179 },
  sikkim: { latitude: 27.533, longitude: 88.5122 },
  'tamil nadu': { latitude: 11.1271, longitude: 78.6569 },
  telangana: { latitude: 18.1124, longitude: 79.0193 },
  tripura: { latitude: 23.9408, longitude: 91.9882 },
  'uttar pradesh': { latitude: 26.8467, longitude: 80.9462 },
  uttarakhand: { latitude: 30.0668, longitude: 79.0193 },
  'west bengal': { latitude: 22.9868, longitude: 87.855 },
  delhi: { latitude: 28.7041, longitude: 77.1025 },
  'jammu and kashmir': { latitude: 33.7782, longitude: 76.5762 },
  ladakh: { latitude: 34.1526, longitude: 77.5771 },
  puducherry: { latitude: 11.9416, longitude: 79.8083 }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, villageId, customVillage, householdCode } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password.'
      });
    }

    // Check if user exists
    const userExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    // Role restrictions
    const assignedRole = ['admin', 'coordinator', 'household'].includes(role) ? role : 'household';

    // Resolve village: either existing villageId OR custom/preset location
    let village = null;
    if (customVillage && customVillage.name && customVillage.name.trim()) {
      const vName = customVillage.name.trim();
      const vDistrict = (customVillage.district || 'General District').trim();
      const vState = (customVillage.state || 'India').trim();
      const vPincode = (customVillage.pincode || '').trim();

      // Check if village already exists (case-insensitive)
      const escapedName = vName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      village = await Village.findOne({ name: new RegExp(`^${escapedName}$`, 'i') });

      if (!village) {
        const stateKey = vState.toLowerCase();
        const fallbackCoord = STATE_COORDINATES[stateKey] || { latitude: 23.5937, longitude: 78.9629 };
        village = await Village.create({
          name: vName,
          district: vDistrict,
          state: vState,
          pincode: vPincode,
          location: {
            latitude: customVillage.latitude ? Number(customVillage.latitude) : fallbackCoord.latitude,
            longitude: customVillage.longitude ? Number(customVillage.longitude) : fallbackCoord.longitude
          },
          population: 1200,
          totalHouseholds: 1,
          estimatedCattle: 150,
          description: `Registered via user account creation (${vDistrict}, ${vState}).`
        });
      }
    } else if (villageId && villageId !== 'custom' && !villageId.startsWith('preset:')) {
      village = await Village.findById(villageId);
    }

    // If household code provided, link existing household
    let household = null;
    if (householdCode) {
      household = await Household.findOne({ householdCode });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: assignedRole,
      phone: phone || '',
      village: village ? village._id : null,
      household: household ? household._id : null
    });

    // Auto-create a linked Household profile for newly registered household users so all modules work smoothly
    if (assignedRole === 'household' && village && !household) {
      const autoCode = `HH-${Date.now().toString().slice(-5)}${Math.floor(Math.random() * 10)}`;
      household = await Household.create({
        householdCode: autoCode,
        headOfFamily: user.name,
        user: user._id,
        village: village._id,
        familyMembers: 4,
        contactPhone: user.phone || '',
        location: {
          latitude: Number((village.location.latitude + (Math.random() - 0.5) * 0.004).toFixed(5)),
          longitude: Number((village.location.longitude + (Math.random() - 0.5) * 0.004).toFixed(5))
        },
        lpgConsumptionMonthlyCylinders: 1.0,
        firewoodConsumptionKgPerMonth: 50,
        waterAvailabilityLitersPerDay: 100,
        waterSource: 'Borewell',
        hasBiogasPlant: false,
        willingToPoolWaste: true
      });

      user.household = household._id;
      await user.save();
    }

    const token = generateToken(user._id);

    await logAuditEvent(
      { user, ip: req.ip, connection: req.connection },
      {
        action: 'REGISTER_USER',
        entityType: 'User',
        entityId: user._id,
        summary: `Registered ${user.role} account (${user.email})${village ? ` in ${village.name}` : ''}`,
        metadata: { role: user.role, villageName: village ? village.name : null, householdCode: household ? household.householdCode : null }
      }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        village: village
          ? { _id: village._id, id: village._id, name: village.name, district: village.district, state: village.state }
          : null,
        household: household ? { _id: household._id, id: household._id, code: household.householdCode } : null
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password'
      });
    }

    // Find user and select password
    const user = await User.findOne({ email }).select('+password').populate('village').populate('household');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive. Please contact system administrator.'
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        village: user.village,
        household: user.household
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('village').populate('household');
    res.json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update current user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, villageId } = req.body;

    const fieldsToUpdate = {};
    if (name) fieldsToUpdate.name = name;
    if (phone) fieldsToUpdate.phone = phone;
    if (villageId) fieldsToUpdate.village = villageId;

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    }).populate('village');

    res.json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Initiate password reset (Forgot Password)
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No registered user found with that email address.'
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Account is suspended or pending approval. Please contact administrator.'
      });
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    await logAuditEvent(req, {
      action: 'FORGOT_PASSWORD_REQUESTED',
      entityType: 'User',
      entityId: user._id,
      summary: `Password reset token requested for ${user.email}`,
      metadata: { email: user.email }
    });

    res.json({
      success: true,
      message: 'Password reset token generated successfully.',
      resetToken
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password using token
// @route   POST /api/auth/reset-password
// @route   PUT /api/auth/reset-password/:token
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    const token = req.body.token || req.params.token;
    const { password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both the reset token and your new password'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token.trim())
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    }).select('+resetPasswordToken +resetPasswordExpire');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset token'
      });
    }

    // Set new password (pre-save hook will hash it)
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    await logAuditEvent(req, {
      action: 'PASSWORD_RESET_SUCCESS',
      entityType: 'User',
      entityId: user._id,
      summary: `Password successfully reset for ${user.email}`,
      metadata: { email: user.email }
    });

    res.json({
      success: true,
      message: 'Password has been reset successfully. Please log in with your new password.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password for logged-in user
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both current and new password'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user || !(await user.comparePassword(currentPassword))) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    user.password = newPassword;
    await user.save();

    await logAuditEvent(req, {
      action: 'PASSWORD_CHANGED',
      entityType: 'User',
      entityId: user._id,
      summary: `User ${user.email} updated their account password`,
      metadata: { email: user.email }
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
  forgotPassword,
  resetPassword,
  changePassword
};
