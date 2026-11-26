const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null // null indicates broadcast to role/village
    },
    targetRole: {
      type: String,
      enum: ['all', 'admin', 'coordinator', 'household'],
      default: 'all'
    },
    village: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Village',
      default: null
    },
    plant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BiogasPlant',
      default: null
    },
    type: {
      type: String,
      enum: ['alert', 'warning', 'info', 'success', 'emergency'],
      default: 'info'
    },
    category: {
      type: String,
      enum: [
        'PLANT_ANOMALY',
        'FEEDSTOCK_DEFICIT',
        'COMMUNITY_UPDATE',
        'SUBSIDY_ALERT',
        'GENERAL',
        'gas_supply',
        'GAS_SUPPLY',
        'emergency',
        'EMERGENCY'
      ],
      default: 'GENERAL'
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true
    },
    isRead: {
      type: Boolean,
      default: false
    },
    actionUrl: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Notification', notificationSchema);
