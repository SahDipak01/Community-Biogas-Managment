const mongoose = require('mongoose');

const plantBreakdownReportSchema = new mongoose.Schema(
  {
    reportNumber: {
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
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    reporterRole: {
      type: String,
      default: 'household'
    },
    issueCategory: {
      type: String,
      enum: [
        'Suspected Gas Leakage',
        'Low Gas Pressure',
        'Gas Supply Interruption',
        'Pipeline Blockage',
        'Equipment Malfunction',
        'Unusual Odor / Smell',
        'Digester Slurry Overflow',
        'Dome / Structural Crack',
        'Other Technical Issue'
      ],
      required: true
    },
    urgency: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Emergency / Critical'],
      default: 'Medium'
    },
    description: {
      type: String,
      required: [true, 'Please provide issue description']
    },
    photoUrl: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: [
        'Reported',
        'Acknowledged',
        'Assigned',
        'Inspection Scheduled',
        'Under Repair',
        'Resolved',
        'Verified',
        'Closed'
      ],
      default: 'Reported'
    },
    assignedTechnician: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
      assignedAt: { type: Date }
    },
    inspectionFindings: {
      type: String,
      default: ''
    },
    repairDetails: {
      type: String,
      default: ''
    },
    repairCostInr: {
      type: Number,
      default: 0
    },
    downtimeHours: {
      type: Number,
      default: 0
    },
    resolvedAt: {
      type: Date
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reopenHistory: [
      {
        reopenedAt: { type: Date, default: Date.now },
        reopenedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reason: { type: String, required: true }
      }
    ]
  },
  {
    timestamps: true
  }
);

plantBreakdownReportSchema.index({ village: 1, status: 1 });
plantBreakdownReportSchema.index({ biogasPlant: 1, createdAt: -1 });

module.exports = mongoose.model('PlantBreakdownReport', plantBreakdownReportSchema);
