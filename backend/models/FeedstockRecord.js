const mongoose = require('mongoose');

const feedstockRecordSchema = new mongoose.Schema(
  {
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
    collectionDate: {
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
    season: {
      type: String,
      enum: ['Winter', 'Summer', 'Monsoon', 'Post-Monsoon'],
      default: 'Summer'
    },
    collectorName: {
      type: String,
      trim: true,
      default: 'Village Self-Help Group'
    },
    status: {
      type: String,
      enum: ['Recorded', 'Fed to Digester', 'Stored / Composted'],
      default: 'Fed to Digester'
    },
    destinationPlant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BiogasPlant',
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

module.exports = mongoose.model('FeedstockRecord', feedstockRecordSchema);
