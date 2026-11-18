const mongoose = require('mongoose');

const householdSchema = new mongoose.Schema(
  {
    householdCode: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    headOfFamily: {
      type: String,
      required: [true, 'Please enter head of family name'],
      trim: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    village: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Village',
      required: [true, 'Household must belong to a village']
    },
    familyMembers: {
      type: Number,
      default: 4,
      min: 1
    },
    contactPhone: {
      type: String,
      default: ''
    },
    location: {
      latitude: {
        type: Number,
        required: true
      },
      longitude: {
        type: Number,
        required: true
      }
    },
    lpgConsumptionMonthlyCylinders: {
      type: Number,
      default: 1.0,
      min: 0
    },
    firewoodConsumptionKgPerMonth: {
      type: Number,
      default: 60,
      min: 0
    },
    waterAvailabilityLitersPerDay: {
      type: Number,
      default: 100,
      min: 0
    },
    waterSource: {
      type: String,
      enum: ['Borewell', 'Community Well', 'Piped Tap Water', 'Canal / Pond', 'Rainwater Storage'],
      default: 'Borewell'
    },
    hasBiogasPlant: {
      type: Boolean,
      default: false
    },
    biogasPlant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BiogasPlant',
      default: null
    },
    willingToPoolWaste: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Household', householdSchema);
