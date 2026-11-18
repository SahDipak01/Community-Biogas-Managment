/**
 * Alert Detection Engine for Biogas Plant Monitoring
 * Analyzes operational parameters against biochemical limits
 */

function evaluatePlantAlerts(plant, monitoringData) {
  const alerts = [];
  const {
    feedstockInputKg = 0,
    gasProducedM3 = 0,
    temperatureC = 30,
    phLevel = 7.2,
    slurryProducedLiters = 0,
    pressureKPa = 2.5
  } = monitoringData;

  const designCapacityM3 = plant.capacityM3 || 2;
  const designFeedstockKg = plant.dailyDesignFeedstockKg || (designCapacityM3 * 25);

  // 1. Temperature Check (Optimal Mesophilic: 28°C - 38°C)
  if (temperatureC < 20) {
    alerts.push({
      alertType: 'LOW_TEMPERATURE',
      severity: temperatureC < 15 ? 'critical' : 'high',
      message: `Low digester temperature (${temperatureC}°C). Methanogenic bacteria activity is critically suppressed below 20°C. Insulate digester dome, mix with lukewarm water, or employ transparent greenhouse solar sheeting.`
    });
  } else if (temperatureC > 42) {
    alerts.push({
      alertType: 'LOW_TEMPERATURE', // or abnormal temp
      severity: 'medium',
      message: `High digester temperature (${temperatureC}°C). Approaching upper boundary of mesophilic tolerance.`
    });
  }

  // 2. pH Check (Optimal methanogenic pH: 6.8 - 7.5; Critical boundaries: < 6.5 or > 8.0)
  if (phLevel < 6.5) {
    alerts.push({
      alertType: 'ABNORMAL_PH',
      severity: phLevel < 6.0 ? 'critical' : 'high',
      message: `Acidification detected (pH ${phLevel}). Acidogenic volatile fatty acids are accumulating faster than methanogens can consume them. Temporarily halt feeding and buffer with wood ash or calcium carbonate slurry.`
    });
  } else if (phLevel > 8.0) {
    alerts.push({
      alertType: 'ABNORMAL_PH',
      severity: 'high',
      message: `High alkalinity / Ammonia toxicity risk (pH ${phLevel}). Excessive nitrogenous feed (e.g., fresh poultry manure or unfermented urine). Dilute with freshwater and carbon-rich agricultural residue.`
    });
  }

  // 3. Reduced Gas Production Check (> 25% drop from design capacity)
  const expectedMinGasM3 = designCapacityM3 * 0.70;
  if (feedstockInputKg >= designFeedstockKg * 0.6 && gasProducedM3 < expectedMinGasM3) {
    alerts.push({
      alertType: 'REDUCED_GAS_PRODUCTION',
      severity: 'medium',
      message: `Gas production (${gasProducedM3} m³) is below expected capacity (${designCapacityM3} m³). Check retention time, feedstock purity, and ensure digester stirring.`
    });
  }

  // 4. Possible Gas Leakage (High input, very low gas produced, low pressure)
  if (feedstockInputKg >= designFeedstockKg * 0.8 && gasProducedM3 < designCapacityM3 * 0.35 && pressureKPa < 1.0) {
    alerts.push({
      alertType: 'POSSIBLE_GAS_LEAKAGE',
      severity: 'critical',
      message: `Possible gas leakage detected! Digester has normal feeding (${feedstockInputKg} kg) but severely low gas volume (${gasProducedM3} m³) and low line pressure (${pressureKPa} kPa). Inspect main gas valve, water trap, and pipeline joints with soap solution.`
    });
  }

  // 5. Blocked Pipes (High pressure, zero or severely low slurry outlet discharge)
  if (feedstockInputKg > 30 && slurryProducedLiters < 5 && pressureKPa > 3.8) {
    alerts.push({
      alertType: 'BLOCKED_PIPES',
      severity: 'high',
      message: `Blocked slurry outlet or gas pipe detected! Digester pressure is high (${pressureKPa} kPa) with negligible slurry outflow. Rod the outlet pipe to clear dry scum or silt accumulation.`
    });
  }

  // 6. Irregular Feedstock Supply
  if (feedstockInputKg < designFeedstockKg * 0.4) {
    alerts.push({
      alertType: 'IRREGULAR_FEEDSTOCK',
      severity: 'low',
      message: `Underfeeding: Feedstock input today (${feedstockInputKg} kg) is less than 40% of the design capacity (${designFeedstockKg} kg). Methanogenic population may starve if sustained.`
    });
  }

  // Determine overall status
  let overallStatus = 'Normal';
  if (alerts.some(a => a.severity === 'critical')) {
    overallStatus = 'Critical Anomaly';
  } else if (alerts.some(a => a.severity === 'high')) {
    overallStatus = 'Attention Needed';
  } else if (alerts.length > 0) {
    overallStatus = 'Attention Needed';
  }

  return {
    alerts,
    overallStatus
  };
}

module.exports = {
  evaluatePlantAlerts
};
