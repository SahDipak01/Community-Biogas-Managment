const mongoose = require('mongoose');

const subsidyApplicationSchema = new mongoose.Schema(
  {
    applicationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    scheme: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GovernmentScheme',
      required: true
    },
    household: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Household',
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    village: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Village',
      required: true
    },
    status: {
      type: String,
      enum: [
        'Draft',
        'Submitted',
        'Under Verification',
        'Forwarded',
        'Approved',
        'Rejected',
        'More Information Required'
      ],
      default: 'Submitted'
    },
    appliedSubsidyAmountInr: {
      type: Number,
      required: true
    },
    approvedSubsidyAmountInr: {
      type: Number,
      default: 0
    },
    householdCattleCount: {
      type: Number,
      default: 0
    },
    plantCapacityRequestedM3: {
      type: Number,
      default: 2
    },
    documentsSubmitted: [
      {
        documentName: { type: String, required: true },
        fileUrl: { type: String, default: '' },
        verificationStatus: {
          type: String,
          enum: ['Pending', 'Verified', 'Rejected'],
          default: 'Pending'
        }
      }
    ],
    coordinatorNotes: {
      type: String,
      default: ''
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    actionDate: {
      type: Date
    },
    disbursementStatus: {
      type: String,
      enum: ['Pending', 'Partially Disbursed', 'Fully Disbursed', 'N/A'],
      default: 'Pending'
    }
  },
  {
    timestamps: true
  }
);

subsidyApplicationSchema.index({ village: 1, status: 1 });
subsidyApplicationSchema.index({ household: 1, createdAt: -1 });

module.exports = mongoose.model('SubsidyApplication', subsidyApplicationSchema);
