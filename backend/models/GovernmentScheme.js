const mongoose = require('mongoose');

const governmentSchemeSchema = new mongoose.Schema(
  {
    schemeName: {
      type: String,
      required: [true, 'Please enter scheme name'],
      trim: true
    },
    shortCode: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    implementingAgency: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      enum: ['Central Government', 'State Government', 'Gram Panchayat Initiative', 'Multilateral / NGO'],
      default: 'Central Government'
    },
    targetBeneficiaries: {
      type: [String],
      default: ['Individual Rural Households', 'Small & Marginal Farmers', 'Gram Panchayats']
    },
    subsidyDetails: {
      subsidyPercentage: {
        type: Number,
        default: 40
      },
      maxSubsidyAmount: {
        type: Number,
        required: true
      },
      subsidyStructure: {
        type: String,
        default: 'Direct Benefit Transfer (DBT) post inspection'
      }
    },
    eligiblePlantSizesM3: {
      type: [Number],
      default: [1, 2, 3, 4, 6]
    },
    eligibilityCriteria: {
      type: [String],
      default: []
    },
    requiredDocuments: {
      type: [String],
      default: ['Aadhaar Card', 'Land Ownership Record / Khasra-Khatauni', 'Bank Passbook Copy', 'Photograph of Cattle & Proposed Site']
    },
    applicationProcess: {
      type: String,
      default: ''
    },
    officialPortalUrl: {
      type: String,
      required: true
    },
    verifiedSource: {
      type: Boolean,
      default: true
    },
    isActive: {
      type: Boolean,
      default: true
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

module.exports = mongoose.model('GovernmentScheme', governmentSchemeSchema);
