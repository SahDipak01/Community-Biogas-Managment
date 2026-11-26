const mongoose = require('mongoose');

const communityComplaintSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    household: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Household',
      default: null
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
    category: {
      type: String,
      enum: [
        'Gas Supply & Distribution',
        'Waste Collection Service',
        'Fertilizer & Slurry Allocation',
        'Billing & Financial Records',
        'Coordinator / Worker Conduct',
        'Subsidy & Scheme Application',
        'General Suggestion / Feedback'
      ],
      required: true
    },
    subject: {
      type: String,
      required: [true, 'Please enter complaint subject'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Please enter complaint details']
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium'
    },
    status: {
      type: String,
      enum: [
        'Submitted',
        'Acknowledged',
        'Under Review',
        'Assigned',
        'In Progress',
        'Resolved',
        'Closed',
        'Rejected',
        'Reopened'
      ],
      default: 'Submitted'
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    internalNotes: [
      {
        note: { type: String, required: true },
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        addedAt: { type: Date, default: Date.now }
      }
    ],
    resolutionNotes: {
      type: String,
      default: ''
    },
    resolvedAt: {
      type: Date
    },
    feedbackRating: {
      type: Number,
      min: 1,
      max: 5
    },
    feedbackComments: {
      type: String,
      default: ''
    },
    reopenReason: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

communityComplaintSchema.index({ village: 1, status: 1 });
communityComplaintSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('CommunityComplaint', communityComplaintSchema);
