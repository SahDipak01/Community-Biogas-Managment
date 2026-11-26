const mongoose = require('mongoose');

const emergencyIncidentSchema = new mongoose.Schema(
  {
    incidentNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    biogasPlant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BiogasPlant',
      default: null
    },
    village: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Village',
      required: true
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    incidentType: {
      type: String,
      enum: [
        'Suspected Gas Leakage',
        'Explosion Hazard / Spark Risk',
        'Pipeline Rupture',
        'Digester Dome Structural Damage',
        'Hydrogen Sulfide / Toxic Odor Spike',
        'Other Safety Threat'
      ],
      required: true
    },
    severity: {
      type: String,
      enum: ['High', 'Critical Emergency', 'Immediate Evacuation Required'],
      default: 'Critical Emergency'
    },
    locationDescription: {
      type: String,
      required: [true, 'Please provide the incident location']
    },
    details: {
      type: String,
      required: [true, 'Please provide emergency details']
    },
    immediateActionsTaken: [
      {
        type: String
      }
    ],
    techniciansContacted: {
      type: Boolean,
      default: true
    },
    status: {
      type: String,
      enum: [
        'Active Emergency',
        'First Responders On Site',
        'Threat Contained',
        'All Clear & Resolved'
      ],
      default: 'Active Emergency'
    },
    containedAt: {
      type: Date
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    broadcastSent: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

emergencyIncidentSchema.index({ village: 1, status: 1 });
emergencyIncidentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('EmergencyIncident', emergencyIncidentSchema);
