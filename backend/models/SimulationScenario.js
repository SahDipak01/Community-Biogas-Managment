const mongoose = require('mongoose');

const simulationScenarioSchema = new mongoose.Schema(
  {
    scenarioName: {
      type: String,
      required: [true, 'Please enter a scenario name'],
      trim: true
    },
    village: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Village',
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    parameters: {
      householdParticipationPercent: { type: Number, default: 100 },
      participatingHouseholds: { type: Number, default: 6 },
      wasteAvailabilityMultiplier: { type: Number, default: 1.0 },
      dailyDungKg: { type: Number, default: 250 },
      dailyAgriWasteKg: { type: Number, default: 40 },
      dailyKitchenWasteKg: { type: Number, default: 20 },
      plantCapacityM3: { type: Number, default: 25 },
      installationCostINR: { type: Number, default: 480000 },
      subsidyPercent: { type: Number, default: 36 },
      transportCostPerKmINR: { type: Number, default: 15 },
      avgDailyTransportKm: { type: Number, default: 8 }
    },
    outputs: {
      totalDailyFeedstockKg: { type: Number, default: 0 },
      estimatedDailyBiogasM3: { type: Number, default: 0 },
      annualBiogasM3: { type: Number, default: 0 },
      capacityUtilizationPercent: { type: Number, default: 0 },
      resourceUtilizationPercent: { type: Number, default: 0 },
      netInstallationCostINR: { type: Number, default: 0 },
      annualTransportCostINR: { type: Number, default: 0 },
      annualGrossSavingsINR: { type: Number, default: 0 },
      annualNetSavingsINR: { type: Number, default: 0 },
      paybackYears: { type: Number, default: null },
      viabilityStatus: { type: String, default: 'Viable' },
      roiPercent: { type: Number, default: 0 },
      annualCo2OffsetTons: { type: Number, default: 0 },
      dailyDigestateLiters: { type: Number, default: 0 }
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

module.exports = mongoose.model('SimulationScenario', simulationScenarioSchema);
