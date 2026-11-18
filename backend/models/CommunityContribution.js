const mongoose = require('mongoose');

const communityContributionSchema = new mongoose.Schema(
  {
    village: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Village',
      required: true
    },
    household: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Household',
      required: true
    },
    dailyDungCommittedKg: {
      type: Number,
      required: true,
      min: 0
    },
    agriWasteCommittedKg: {
      type: Number,
      default: 0,
      min: 0
    },
    kitchenWasteCommittedKg: {
      type: Number,
      default: 0,
      min: 0
    },
    totalDailyContributionKg: {
      type: Number,
      required: true
    },
    slurryEntitlementLitersPerDay: {
      type: Number,
      default: 0
    },
    targetCommunityPlant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BiogasPlant',
      default: null
    },
    agreementStatus: {
      type: String,
      enum: ['Active', 'Paused', 'Withdrawn'],
      default: 'Active'
    },
    incentiveCredits: {
      type: Number,
      default: 0
    },
    startDate: {
      type: Date,
      default: Date.now
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

module.exports = mongoose.model('CommunityContribution', communityContributionSchema);
