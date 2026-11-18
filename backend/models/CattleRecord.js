const mongoose = require('mongoose');

const cattleRecordSchema = new mongoose.Schema(
  {
    household: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Household',
      required: true
    },
    village: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Village',
      required: true
    },
    cattleType: {
      type: String,
      enum: ['Cow', 'Buffalo', 'Bullock', 'Calf', 'Goat/Sheep'],
      required: true
    },
    count: {
      type: Number,
      required: true,
      min: 1
    },
    avgDungPerAnimalKg: {
      type: Number,
      required: true,
      min: 0
    },
    dailyDungTotalKg: {
      type: Number,
      required: true,
      min: 0
    },
    housingType: {
      type: String,
      enum: ['Shed with Concrete Floor', 'Earthen Floor', 'Free Grazing / Open Field'],
      default: 'Shed with Concrete Floor'
    },
    collectionEfficiencyPercent: {
      type: Number,
      default: 85,
      min: 10,
      max: 100
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

module.exports = mongoose.model('CattleRecord', cattleRecordSchema);
