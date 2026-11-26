const mongoose = require('mongoose');

const offlineSyncLogSchema = new mongoose.Schema(
  {
    clientOpId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    village: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Village',
      default: null
    },
    entityType: {
      type: String,
      required: true,
      trim: true
    },
    operation: {
      type: String,
      enum: ['CREATE', 'UPDATE', 'DELETE'],
      required: true
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    status: {
      type: String,
      enum: ['Applied', 'Duplicate Ignored', 'Conflict Flagged', 'Failed'],
      default: 'Applied'
    },
    resolvedEntityId: {
      type: String,
      default: ''
    },
    errorMessage: {
      type: String,
      default: ''
    },
    clientTimestamp: {
      type: Date,
      default: Date.now
    },
    serverTimestamp: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

offlineSyncLogSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('OfflineSyncLog', offlineSyncLogSchema);
