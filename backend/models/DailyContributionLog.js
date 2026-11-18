const mongoose = require('mongoose');

const dailyContributionLogSchema = new mongoose.Schema(
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
    contributionDate: {
      type: Date,
      default: Date.now,
      required: true
    },
    dungKg: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    agriWasteKg: {
      type: Number,
      default: 0,
      min: 0
    },
    kitchenWasteKg: {
      type: Number,
      default: 0,
      min: 0
    },
    totalKg: {
      type: Number,
      required: true,
      min: 0
    },
    incentivePointsEarned: {
      type: Number,
      default: 0
    },
    incentiveValueINR: {
      type: Number,
      default: 0
    },
    slurryCreditLiters: {
      type: Number,
      default: 0
    },
    verified: {
      type: Boolean,
      default: true
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
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

module.exports = mongoose.model('DailyContributionLog', dailyContributionLogSchema);
