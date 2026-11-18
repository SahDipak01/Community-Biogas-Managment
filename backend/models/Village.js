const mongoose = require('mongoose');

const villageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please enter village name'],
      trim: true
    },
    district: {
      type: String,
      required: [true, 'Please enter district'],
      trim: true
    },
    state: {
      type: String,
      required: [true, 'Please enter state'],
      trim: true
    },
    pincode: {
      type: String,
      trim: true,
      default: ''
    },
    location: {
      latitude: {
        type: Number,
        required: true,
        default: 25.3176
      },
      longitude: {
        type: Number,
        required: true,
        default: 82.9739
      }
    },
    population: {
      type: Number,
      default: 0
    },
    totalHouseholds: {
      type: Number,
      default: 0
    },
    estimatedCattle: {
      type: Number,
      default: 0
    },
    climateZone: {
      type: String,
      enum: ['Tropical Wet', 'Subtropical Humid', 'Arid / Semi-Arid', 'Temperate / Hilly'],
      default: 'Subtropical Humid'
    },
    coordinator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    description: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Village', villageSchema);
