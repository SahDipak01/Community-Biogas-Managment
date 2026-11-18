const mongoose = require('mongoose');

const biogasPlantSchema = new mongoose.Schema(
  {
    plantName: {
      type: String,
      required: [true, 'Please enter plant name'],
      trim: true
    },
    plantCode: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    plantType: {
      type: String,
      enum: [
        'Fixed Dome (Deenabandhu)',
        'Floating Drum (KVIC)',
        'Pre-fabricated / Bag Digester',
        'Solid-State Anaerobic Digester'
      ],
      default: 'Fixed Dome (Deenabandhu)'
    },
    capacityM3: {
      type: Number,
      required: [true, 'Please enter capacity in m3/day'],
      min: 0.5
    },
    village: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Village',
      required: true
    },
    ownerHousehold: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Household',
      default: null
    },
    isCommunityPlant: {
      type: Boolean,
      default: false
    },
    participatingHouseholds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Household'
      }
    ],
    installationDate: {
      type: Date,
      default: Date.now
    },
    installationCost: {
      type: Number,
      default: 45000
    },
    subsidyReceived: {
      type: Number,
      default: 14350
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
    status: {
      type: String,
      enum: ['Active', 'Under Maintenance', 'Inactive', 'Proposed / Under Construction'],
      default: 'Active'
    },
    installerAgency: {
      type: String,
      default: 'State Bioenergy Development Agency'
    },
    gasUtilization: {
      type: String,
      enum: ['Household Cooking', 'Community Kitchen', 'Power Generation / Generator', 'Bio-CNG Bottling'],
      default: 'Household Cooking'
    },
    dailyDesignFeedstockKg: {
      type: Number,
      default: 50
    },
    dailyDesignWaterLiters: {
      type: Number,
      default: 50
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

module.exports = mongoose.model('BiogasPlant', biogasPlantSchema);
