const mongoose = require('mongoose');

const plantMonitoringSchema = new mongoose.Schema(
  {
    plant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BiogasPlant',
      required: true
    },
    date: {
      type: Date,
      default: Date.now,
      required: true
    },
    feedstockInputKg: {
      type: Number,
      required: true,
      min: 0
    },
    waterAddedLiters: {
      type: Number,
      default: 0,
      min: 0
    },
    gasProducedM3: {
      type: Number,
      required: true,
      min: 0
    },
    temperatureC: {
      type: Number,
      required: true,
      min: -10,
      max: 80
    },
    phLevel: {
      type: Number,
      required: true,
      min: 0,
      max: 14
    },
    slurryProducedLiters: {
      type: Number,
      default: 0,
      min: 0
    },
    pressureKPa: {
      type: Number,
      default: 2.5
    },
    operationalStatus: {
      type: String,
      enum: ['Normal', 'Attention Needed', 'Critical Anomaly', 'Maintenance'],
      default: 'Normal'
    },
    readingType: {
      type: String,
      enum: ['manual', 'simulated'],
      default: 'manual',
      required: true
    },
    alerts: [
      {
        alertType: {
          type: String,
          enum: [
            'LOW_TEMPERATURE',
            'ABNORMAL_PH',
            'REDUCED_GAS_PRODUCTION',
            'POSSIBLE_GAS_LEAKAGE',
            'BLOCKED_PIPES',
            'IRREGULAR_FEEDSTOCK'
          ]
        },
        severity: {
          type: String,
          enum: ['low', 'medium', 'high', 'critical']
        },
        message: String,
        resolved: {
          type: Boolean,
          default: false
        }
      }
    ],
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

module.exports = mongoose.model('PlantMonitoring', plantMonitoringSchema);
