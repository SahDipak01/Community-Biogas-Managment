const mongoose = require('mongoose');

const digestateBatchSchema = new mongoose.Schema(
  {
    batchNumber: {
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
    productionDate: {
      type: Date,
      default: Date.now
    },
    initialVolumeLiters: {
      type: Number,
      required: true,
      min: 1
    },
    availableVolumeLiters: {
      type: Number,
      required: true,
      min: 0
    },
    allocatedVolumeLiters: {
      type: Number,
      default: 0
    },
    form: {
      type: String,
      enum: [
        'Liquid Bio-Slurry',
        'Enriched Solid Organic Cake',
        'Dried Pelleted Digestate'
      ],
      default: 'Liquid Bio-Slurry'
    },
    qualityTesting: {
      tested: { type: Boolean, default: false },
      testDate: { type: Date },
      testedByLab: { type: String, default: '' },
      phValue: { type: Number, default: 7.5 },
      nitrogenPct: { type: Number, default: 1.8 },
      phosphorusPct: { type: Number, default: 1.0 },
      potassiumPct: { type: Number, default: 0.9 },
      heavyMetalsPass: { type: Boolean, default: true }
    },
    pricePerLiterInr: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['Available', 'Reserved', 'Exhausted', 'Quarantined'],
      default: 'Available'
    }
  },
  {
    timestamps: true
  }
);

digestateBatchSchema.index({ village: 1, status: 1 });
digestateBatchSchema.index({ biogasPlant: 1, createdAt: -1 });

module.exports = mongoose.model('DigestateBatch', digestateBatchSchema);
