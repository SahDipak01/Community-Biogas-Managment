const mongoose = require('mongoose');

const financialTransactionSchema = new mongoose.Schema(
  {
    transactionNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    receiptNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    village: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Village',
      required: true
    },
    household: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Household',
      default: null
    },
    biogasPlant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BiogasPlant',
      default: null
    },
    transactionType: {
      type: String,
      enum: [
        'Household Contribution Credit',
        'Maintenance & Repair Expense',
        'Bio-Slurry Fertilizer Sale',
        'Government Subsidy Disbursement',
        'Operational Spare Parts',
        'Community Pooling Fund'
      ],
      required: true
    },
    direction: {
      type: String,
      enum: ['Credit', 'Debit'],
      required: true
    },
    amountInr: {
      type: Number,
      required: true,
      min: [0.01, 'Amount must be greater than zero']
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    verificationStatus: {
      type: String,
      enum: ['Pending Approval', 'Approved', 'Rejected', 'Reversed'],
      default: 'Pending Approval'
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    approvalNotes: {
      type: String,
      default: ''
    },
    isReversal: {
      type: Boolean,
      default: false
    },
    reversalOfTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FinancialTransaction',
      default: null
    },
    reversalReason: {
      type: String,
      default: ''
    },
    supportingDocumentUrl: {
      type: String,
      default: ''
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

financialTransactionSchema.index({ village: 1, verificationStatus: 1, createdAt: -1 });
financialTransactionSchema.index({ household: 1, createdAt: -1 });

module.exports = mongoose.model('FinancialTransaction', financialTransactionSchema);
