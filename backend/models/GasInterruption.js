const mongoose = require('mongoose');

const gasInterruptionSchema = new mongoose.Schema(
  {
    noticeNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    biogasPlant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BiogasPlant',
      required: true
    },
    village: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Village',
      required: true
    },
    interruptionType: {
      type: String,
      enum: [
        'Planned Maintenance',
        'Emergency Repair',
        'Feedstock Depletion',
        'Severe Weather / System Freeze',
        'Pipeline Pressure Drop'
      ],
      required: true
    },
    affectedAreas: [
      {
        type: String,
        trim: true
      }
    ],
    affectedHouseholdCount: {
      type: Number,
      default: 0
    },
    reason: {
      type: String,
      required: [true, 'Please provide the interruption reason']
    },
    startTime: {
      type: Date,
      default: Date.now
    },
    estimatedRestoration: {
      type: Date
    },
    actualRestoration: {
      type: Date
    },
    status: {
      type: String,
      enum: ['Active Interruption', 'Restoration In Progress', 'Restored', 'Cancelled'],
      default: 'Active Interruption'
    },
    restorationNotes: {
      type: String,
      default: ''
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

gasInterruptionSchema.index({ village: 1, status: 1 });
gasInterruptionSchema.index({ biogasPlant: 1, createdAt: -1 });

module.exports = mongoose.model('GasInterruption', gasInterruptionSchema);
