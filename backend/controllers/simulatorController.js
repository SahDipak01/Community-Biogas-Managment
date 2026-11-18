const SimulationScenario = require('../models/SimulationScenario');
const Village = require('../models/Village');
const Household = require('../models/Household');
const CattleRecord = require('../models/CattleRecord');
const BiogasPlant = require('../models/BiogasPlant');
const { BIOGAS_YIELDS, EQUIVALENCE_CONSTANTS } = require('../utils/biogasCalculator');
const { validateNumberInRange, collectErrors } = require('../utils/validators');
const { logAuditEvent } = require('../utils/auditLogger');

/**
 * Core single-pass thermodynamic & financial Digital Twin model
 */
function evaluateSingleScenario(params) {
  const {
    householdParticipationPercent = 100,
    participatingHouseholds = 6,
    wasteAvailabilityMultiplier = 1.0,
    dailyDungKg = 250,
    dailyAgriWasteKg = 45,
    dailyKitchenWasteKg = 20,
    plantCapacityM3 = 25,
    installationCostINR = 480000,
    subsidyPercent = 36,
    transportCostPerKmINR = 18,
    avgDailyTransportKm = 8
  } = params;

  const participationFactor = Math.max(0.05, Math.min(2.5, Number(householdParticipationPercent) / 100));
  const wasteFactor = Math.max(0.1, Math.min(2.5, Number(wasteAvailabilityMultiplier)));

  const effectiveDungKg = Math.max(0, Number(dailyDungKg)) * participationFactor * wasteFactor;
  const effectiveAgriKg = Math.max(0, Number(dailyAgriWasteKg)) * participationFactor * wasteFactor;
  const effectiveKitchenKg = Math.max(0, Number(dailyKitchenWasteKg)) * participationFactor * wasteFactor;
  const totalDailyFeedstockKg = Number((effectiveDungKg + effectiveAgriKg + effectiveKitchenKg).toFixed(1));

  // Potential biogas from available feedstock
  const potentialBiogasM3 =
    effectiveDungKg * BIOGAS_YIELDS.cowDungM3PerKg +
    effectiveAgriKg * BIOGAS_YIELDS.agriWasteM3PerKg +
    effectiveKitchenKg * BIOGAS_YIELDS.kitchenWasteM3PerKg;

  // Bounded by physical digester capacity
  const capM3 = Math.max(1, Number(plantCapacityM3));
  const estimatedDailyBiogasM3 = Number(Math.min(capM3, potentialBiogasM3).toFixed(2));
  const annualBiogasM3 = Math.round(estimatedDailyBiogasM3 * 365);

  const capacityUtilizationPercent = Math.min(100, Math.round((estimatedDailyBiogasM3 / capM3) * 100));
  const maxPlantFeedstockIntakeKg = capM3 * 25;
  const usedFeedstockKg = Math.min(totalDailyFeedstockKg, maxPlantFeedstockIntakeKg);
  const resourceUtilizationPercent =
    totalDailyFeedstockKg > 0 ? Math.min(100, Math.round((usedFeedstockKg / totalDailyFeedstockKg) * 100)) : 0;

  // Capital & Operating Costs
  const grossCapex = Math.max(0, Number(installationCostINR));
  const subsidyRate = Math.max(0, Math.min(90, Number(subsidyPercent))) / 100;
  const subsidyAmountINR = Math.round(grossCapex * subsidyRate);
  const netInstallationCostINR = Math.max(0, grossCapex - subsidyAmountINR);

  // Transportation scales with both household participation AND load/trip multiplier
  const loadTripFactor = Math.max(0.5, participationFactor * Math.sqrt(wasteFactor));
  const dailyTransportCostINR =
    Math.max(0, Number(avgDailyTransportKm)) * Math.max(0, Number(transportCostPerKmINR)) * loadTripFactor;
  const annualTransportCostINR = Math.round(dailyTransportCostINR * 365);
  const annualMaintenanceINR = Math.round(grossCapex * 0.03);

  // Economic Savings (LPG equivalent + Mass-balanced 7.5% TS Bio-Slurry)
  const annualLpgKgSaved = annualBiogasM3 * EQUIVALENCE_CONSTANTS.lpgKgPerM3Biogas;
  const annualLpgSavingsINR = Math.round(
    (annualLpgKgSaved / EQUIVALENCE_CONSTANTS.standardLpgCylinderKg) * EQUIVALENCE_CONSTANTS.avgLpgCylinderPriceINR
  );

  // Liquid slurry outflow = (usedFeedstock + 1:1 dilution water) * 0.92; dry manure = 0.075 kg/L
  const dailyDigestateLiters = Math.round(usedFeedstockKg * 2.0 * 0.92);
  const dailyDryManureKg = dailyDigestateLiters * EQUIVALENCE_CONSTANTS.digestedSlurryDrySolidsKgPerLiter;
  const annualSlurrySavingsINR = Math.round(
    dailyDryManureKg * 365 * EQUIVALENCE_CONSTANTS.bioFertilizerValuePerKgINR
  );

  const annualGrossSavingsINR = annualLpgSavingsINR + annualSlurrySavingsINR;
  const annualNetSavingsINR = annualGrossSavingsINR - annualTransportCostINR - annualMaintenanceINR;

  // Payback Period & ROI (null if operating at a net loss rather than misleading 99)
  const isViable = annualNetSavingsINR > 0;
  const paybackYears = isViable ? Number((netInstallationCostINR / annualNetSavingsINR).toFixed(2)) : null;
  const roiPercent =
    netInstallationCostINR > 0 ? Number(((annualNetSavingsINR / netInstallationCostINR) * 100).toFixed(1)) : 0;
  const viabilityStatus = !isViable
    ? 'Non-Viable (Net Operating Deficit)'
    : paybackYears <= 3.5
    ? 'Highly Viable'
    : paybackYears <= 6.5
    ? 'Moderately Viable'
    : 'Long Payback (>6.5 yrs)';

  const annualCo2OffsetTons = Number(
    ((annualBiogasM3 * EQUIVALENCE_CONSTANTS.co2ReductionKgPerM3Biogas) / 1000).toFixed(2)
  );

  const cashflowProjection = [];
  for (let yr = 0; yr <= 10; yr++) {
    const cumulativeNetINR = Math.round(-netInstallationCostINR + yr * annualNetSavingsINR);
    cashflowProjection.push({
      year: `Yr ${yr}`,
      cumulativeNetINR,
      cumulativeSavingsINR: yr * annualGrossSavingsINR,
      cumulativeOperatingCostINR: yr * (annualTransportCostINR + annualMaintenanceINR)
    });
  }

  return {
    parameters: {
      householdParticipationPercent: Number(householdParticipationPercent),
      participatingHouseholds: Math.max(1, Math.round(Number(participatingHouseholds) * participationFactor)),
      wasteAvailabilityMultiplier: wasteFactor,
      dailyDungKg: Number(dailyDungKg),
      dailyAgriWasteKg: Number(dailyAgriWasteKg),
      dailyKitchenWasteKg: Number(dailyKitchenWasteKg),
      plantCapacityM3: capM3,
      installationCostINR: grossCapex,
      subsidyPercent: Number(subsidyPercent),
      transportCostPerKmINR: Number(transportCostPerKmINR),
      avgDailyTransportKm: Number(avgDailyTransportKm)
    },
    outputs: {
      totalDailyFeedstockKg,
      usedFeedstockKg: Number(usedFeedstockKg.toFixed(1)),
      surplusFeedstockKg: Number(Math.max(0, totalDailyFeedstockKg - usedFeedstockKg).toFixed(1)),
      estimatedDailyBiogasM3,
      annualBiogasM3,
      capacityUtilizationPercent,
      resourceUtilizationPercent,
      subsidyAmountINR,
      netInstallationCostINR,
      annualTransportCostINR,
      annualMaintenanceINR,
      annualLpgSavingsINR,
      annualSlurrySavingsINR,
      annualGrossSavingsINR,
      annualNetSavingsINR,
      paybackYears,
      roiPercent,
      viabilityStatus,
      annualCo2OffsetTons,
      dailyDigestateLiters
    },
    cashflowProjection
  };
}

/**
 * Full Digital Twin Model including automatic Best-Case / Normal-Case / Worst-Case Tri-Scenario Sensitivity
 */
function runSimulationModel(params) {
  const normal = evaluateSingleScenario(params);
  const p = normal.parameters;

  const worstCase = evaluateSingleScenario({
    ...p,
    householdParticipationPercent: Math.max(25, Math.round(p.householdParticipationPercent * 0.85)),
    wasteAvailabilityMultiplier: Number(Math.max(0.4, p.wasteAvailabilityMultiplier * 0.75).toFixed(2)),
    subsidyPercent: Math.max(0, p.subsidyPercent - 10),
    transportCostPerKmINR: Number((p.transportCostPerKmINR * 1.2).toFixed(1))
  });

  const bestCase = evaluateSingleScenario({
    ...p,
    householdParticipationPercent: Math.min(200, Math.round(p.householdParticipationPercent * 1.15)),
    wasteAvailabilityMultiplier: Number(Math.min(2.2, p.wasteAvailabilityMultiplier * 1.2).toFixed(2)),
    subsidyPercent: Math.min(65, p.subsidyPercent + 10),
    transportCostPerKmINR: Number(Math.max(5, p.transportCostPerKmINR * 0.85).toFixed(1))
  });

  return {
    ...normal,
    triScenarioComparison: {
      worstCase: {
        label: 'Worst-Case (Low Feedstock & High Logistics)',
        assumptions: '-25% waste, -15% participation, +20% transport, -10% subsidy',
        ...worstCase.outputs
      },
      normalCase: {
        label: 'Normal-Case (Current Configuration)',
        assumptions: 'User-configured baseline parameters',
        ...normal.outputs
      },
      bestCase: {
        label: 'Best-Case (Peak Feedstock & Optimized Subsidy)',
        assumptions: '+20% waste, +15% participation, -15% transport, +10% subsidy',
        ...bestCase.outputs
      }
    }
  };
}

// @desc    Get real database baseline parameters for Digital Twin initialization
// @route   GET /api/simulator/baseline
// @access  Private
const getVillageBaseline = async (req, res, next) => {
  try {
    const { villageId } = req.query;
    let village = null;
    if (villageId && villageId !== 'all') {
      village = await Village.findById(villageId);
    } else if (req.user?.village) {
      village = await Village.findById(req.user.village._id || req.user.village);
    }
    if (!village) {
      village = await Village.findOne();
    }

    const filter = village ? { village: village._id } : {};
    const [households, cattleRecords, plants] = await Promise.all([
      Household.find(filter),
      CattleRecord.find(filter),
      BiogasPlant.find(filter)
    ]);

    const hhCount = households.length || village?.totalHouseholds || 6;
    const totalDungKg =
      cattleRecords.reduce((acc, c) => acc + (c.dailyDungTotalKg || 0), 0) ||
      Math.round((village?.estimatedCattle || 120) * 8);
    const totalCapacityM3 = plants.reduce((acc, p) => acc + (p.capacityM3 || 0), 0) || 25;
    const totalCapexINR = plants.reduce((acc, p) => acc + (p.installationCost || 0), 0) || 480000;
    const totalSubsidyINR = plants.reduce((acc, p) => acc + (p.subsidyReceived || 0), 0) || 175000;
    const subsidyPercent = totalCapexINR > 0 ? Math.round((totalSubsidyINR / totalCapexINR) * 100) : 36;

    const baselineParams = {
      householdParticipationPercent: 100,
      participatingHouseholds: hhCount,
      wasteAvailabilityMultiplier: 1.0,
      dailyDungKg: Math.round(totalDungKg),
      dailyAgriWasteKg: Math.round(totalDungKg * 0.18),
      dailyKitchenWasteKg: Math.round(hhCount * 3.5),
      plantCapacityM3: Math.round(totalCapacityM3),
      installationCostINR: Math.round(totalCapexINR),
      subsidyPercent,
      transportCostPerKmINR: 18,
      avgDailyTransportKm: Number(Math.max(3, hhCount * 1.1).toFixed(1))
    };

    const baselineSimulation = runSimulationModel(baselineParams);

    res.json({
      success: true,
      data: {
        village: village
          ? { id: village._id, name: village.name, district: village.district, state: village.state }
          : null,
        baseline: baselineSimulation
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Run real-time What-If Simulation with input validation
// @route   POST /api/simulator/run
// @access  Private
const runWhatIfSimulation = async (req, res, next) => {
  try {
    const b = req.body || {};
    const errors = collectErrors([
      validateNumberInRange(b.householdParticipationPercent, 'Household participation (%)', 5, 250),
      validateNumberInRange(b.wasteAvailabilityMultiplier, 'Waste availability multiplier', 0.1, 2.5),
      validateNumberInRange(b.dailyDungKg, 'Daily dung (kg)', 0, 100000),
      validateNumberInRange(b.dailyAgriWasteKg, 'Daily agri waste (kg)', 0, 50000),
      validateNumberInRange(b.dailyKitchenWasteKg, 'Daily kitchen waste (kg)', 0, 20000),
      validateNumberInRange(b.plantCapacityM3, 'Plant capacity (m³)', 1, 500),
      validateNumberInRange(b.installationCostINR, 'Installation cost (INR)', 0, 100000000),
      validateNumberInRange(b.subsidyPercent, 'Subsidy (%)', 0, 90),
      validateNumberInRange(b.transportCostPerKmINR, 'Transport cost (INR/km)', 0, 500),
      validateNumberInRange(b.avgDailyTransportKm, 'Daily haul distance (km)', 0, 500)
    ]);

    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }

    const result = runSimulationModel(b);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all saved scenarios for comparison
// @route   GET /api/simulator/scenarios
// @access  Private
const getSavedScenarios = async (req, res, next) => {
  try {
    const { villageId } = req.query;
    const query = {};
    if (villageId && villageId !== 'all') {
      query.village = villageId;
    }

    const scenarios = await SimulationScenario.find(query)
      .sort({ createdAt: -1 })
      .populate('village', 'name district')
      .populate('createdBy', 'name role');

    res.json({
      success: true,
      count: scenarios.length,
      data: scenarios
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Save a What-If scenario to MongoDB
// @route   POST /api/simulator/scenarios
// @access  Private
const saveScenario = async (req, res, next) => {
  try {
    const { scenarioName, villageId, parameters, notes = '' } = req.body;

    if (!scenarioName || !scenarioName.trim()) {
      return res.status(400).json({ success: false, message: 'Scenario name is required' });
    }

    const computed = runSimulationModel(parameters || {});

    const saved = await SimulationScenario.create({
      scenarioName: scenarioName.trim(),
      village: villageId || (req.user?.village ? req.user.village._id || req.user.village : null),
      createdBy: req.user._id,
      parameters: computed.parameters,
      outputs: {
        ...computed.outputs,
        paybackYears: computed.outputs.paybackYears ?? 0
      },
      notes
    });

    await logAuditEvent(req, {
      action: 'SCENARIO_SAVED',
      entityType: 'SimulationScenario',
      entityId: saved._id,
      summary: `Saved Digital Twin scenario "${saved.scenarioName}" (${computed.outputs.estimatedDailyBiogasM3} m³/d)`,
      metadata: { plantCapacityM3: computed.parameters.plantCapacityM3, annualNetSavingsINR: computed.outputs.annualNetSavingsINR }
    });

    res.status(201).json({
      success: true,
      data: saved
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a saved scenario
// @route   DELETE /api/simulator/scenarios/:id
// @access  Private
const deleteScenario = async (req, res, next) => {
  try {
    const scenario = await SimulationScenario.findByIdAndDelete(req.params.id);
    if (!scenario) {
      return res.status(404).json({ success: false, message: 'Scenario not found' });
    }

    await logAuditEvent(req, {
      action: 'SCENARIO_DELETED',
      entityType: 'SimulationScenario',
      entityId: req.params.id,
      summary: `Deleted Digital Twin scenario "${scenario.scenarioName}"`
    });

    res.json({ success: true, message: 'Scenario deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Export saved scenarios comparison report as CSV
// @route   GET /api/simulator/export-csv
// @access  Private
const exportScenariosCsv = async (req, res, next) => {
  try {
    const scenarios = await SimulationScenario.find()
      .sort({ createdAt: -1 })
      .populate('village', 'name');

    let csv =
      'Scenario Name,Village,Participation (%),Waste Multiplier,Plant Capacity (m3),Daily Feedstock (kg),Daily Biogas (m3),Capacity Utilization (%),Resource Utilization (%),Gross Capex (INR),Net Capex (INR),Annual Transport Cost (INR),Annual Net Savings (INR),Payback (Years),ROI (%),Annual CO2 Offset (Tons)\n';

    scenarios.forEach((s) => {
      const p = s.parameters;
      const o = s.outputs;
      const paybackLabel = o.annualNetSavingsINR > 0 && o.paybackYears ? o.paybackYears : 'Non-Viable';
      csv += `"${s.scenarioName}","${s.village ? s.village.name : 'All'}",${p.householdParticipationPercent},${
        p.wasteAvailabilityMultiplier
      },${p.plantCapacityM3},${o.totalDailyFeedstockKg},${o.estimatedDailyBiogasM3},${o.capacityUtilizationPercent},${
        o.resourceUtilizationPercent
      },${p.installationCostINR},${o.netInstallationCostINR},${o.annualTransportCostINR},${o.annualNetSavingsINR},${paybackLabel},${
        o.roiPercent
      },${o.annualCo2OffsetTons}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="digital_twin_scenario_comparison_${Date.now()}.csv"`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getVillageBaseline,
  runWhatIfSimulation,
  getSavedScenarios,
  saveScenario,
  deleteScenario,
  exportScenariosCsv,
  runSimulationModel
};
