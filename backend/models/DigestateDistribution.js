const mongoose = require('mongoose');

const digestateDistributionSchema = new mongoose.Schema(
  {
    village: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Village',
      required: true
    },
    sourcePlant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BiogasPlant',
      required: true
    },
    farmerLand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FarmerLand',
      required: true
    },
    distributionDate: {
      type: Date,
      default: Date.now,
      required: true
    },
    digestateAllocatedLiters: {
      type: Number,
      required: true,
      min: 10
    },
    applicationMethod: {
      type: String,
      enum: ['Liquid Bio-Slurry', 'Sun-Dried Digestate Cake', 'Compost Enriched Slurry'],
      default: 'Liquid Bio-Slurry'
    },
    storageLossPercent: {
      type: Number,
      default: 10,
      min: 0,
      max: 60
    },
    solidFertilizerEquivalentKg: {
      type: Number,
      required: true,
      min: 1
    },
    estimatedNpkKg: {
      nitrogenKg: { type: Number, default: 0 },
      phosphorusKg: { type: Number, default: 0 },
      potassiumKg: { type: Number, default: 0 }
    },
    nutrientVerificationSource: {
      type: String,
      enum: ['estimated', 'lab_verified'],
      default: 'estimated'
    },
    labReportReference: {
      type: String,
      default: ''
    },
    chemicalFertilizerReplacedKg: {
      type: Number,
      default: 0
    },
    farmerSavingsINR: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['Scheduled', 'Dispatched', 'Delivered', 'Applied to Field'],
      default: 'Scheduled'
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

module.exports = mongoose.model('DigestateDistribution', digestateDistributionSchema);
