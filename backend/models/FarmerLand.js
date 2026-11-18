const mongoose = require('mongoose');

const farmerLandSchema = new mongoose.Schema(
  {
    farmerName: {
      type: String,
      required: [true, 'Please enter farmer name'],
      trim: true
    },
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
    contactPhone: {
      type: String,
      trim: true,
      default: ''
    },
    landAreaAcres: {
      type: Number,
      required: [true, 'Please enter land area in acres'],
      min: 0.1
    },
    soilType: {
      type: String,
      enum: ['Alluvial', 'Black / Regur', 'Red Loamy', 'Sandy Loam', 'Clayey'],
      default: 'Alluvial'
    },
    primaryCrop: {
      type: String,
      required: [true, 'Please enter primary crop'],
      trim: true
    },
    croppingSeason: {
      type: String,
      enum: ['Kharif', 'Rabi', 'Zaid', 'Perennial'],
      default: 'Rabi'
    },
    fertilizerRequiredKgPerMonth: {
      type: Number,
      required: true,
      min: 10
    },
    preferredApplicationType: {
      type: String,
      enum: ['Liquid Bio-Slurry', 'Sun-Dried Digestate Cake', 'Compost Enriched Slurry'],
      default: 'Liquid Bio-Slurry'
    },
    location: {
      latitude: {
        type: Number,
        default: 25.3176
      },
      longitude: {
        type: Number,
        default: 82.9739
      }
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

module.exports = mongoose.model('FarmerLand', farmerLandSchema);
