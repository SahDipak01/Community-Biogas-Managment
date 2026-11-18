/**
 * Biogas Engineering & Financial Feasibility Calculation Engine
 * Standards based on MNRE (Ministry of New and Renewable Energy),
 * IARI, and FAO Anaerobic Digestion Guidelines.
 */

// Engineering constants (Unified across Calculator, Digestate Planner & Digital Twin)
const BIOGAS_YIELDS = {
  cowDungM3PerKg: 0.037,        // 0.035 - 0.040 m3 / kg fresh dung
  buffaloDungM3PerKg: 0.040,    // 0.038 - 0.042 m3 / kg
  bullockDungM3PerKg: 0.038,
  calfDungM3PerKg: 0.032,
  otherCattleDungM3PerKg: 0.035,
  agriWasteM3PerKg: 0.050,      // co-digested shredded biomass
  kitchenWasteM3PerKg: 0.065    // wet food / vegetable scrap
};

const DUNG_DAILY_YIELD_KG = {
  Cow: 11,
  Buffalo: 16,
  Bullock: 13,
  Calf: 5,
  'Goat/Sheep': 1.5
};

// Standard Plant Sizing Matrix (m3/day capacity vs required daily dung equivalent in kg)
const PLANT_CAPACITY_MATRIX = [
  { capacityM3: 1, minDailyDungKg: 22, maxDailyDungKg: 30, idealPersons: 3, baseCostINR: 30000, subsidyINR: 9800 },
  { capacityM3: 2, minDailyDungKg: 45, maxDailyDungKg: 60, idealPersons: 5, baseCostINR: 44000, subsidyINR: 14350 },
  { capacityM3: 3, minDailyDungKg: 70, maxDailyDungKg: 85, idealPersons: 8, baseCostINR: 58000, subsidyINR: 16500 },
  { capacityM3: 4, minDailyDungKg: 95, maxDailyDungKg: 115, idealPersons: 11, baseCostINR: 72000, subsidyINR: 19000 },
  { capacityM3: 6, minDailyDungKg: 140, maxDailyDungKg: 175, idealPersons: 16, baseCostINR: 96000, subsidyINR: 25000 },
  { capacityM3: 10, minDailyDungKg: 230, maxDailyDungKg: 280, idealPersons: 28, baseCostINR: 160000, subsidyINR: 45000 },
  { capacityM3: 25, minDailyDungKg: 580, maxDailyDungKg: 700, idealPersons: 75, baseCostINR: 480000, subsidyINR: 175000 },
  { capacityM3: 45, minDailyDungKg: 1050, maxDailyDungKg: 1300, idealPersons: 140, baseCostINR: 850000, subsidyINR: 320000 },
  { capacityM3: 85, minDailyDungKg: 2000, maxDailyDungKg: 2500, idealPersons: 280, baseCostINR: 1550000, subsidyINR: 600000 }
];

const EQUIVALENCE_CONSTANTS = {
  lpgKgPerM3Biogas: 0.43,               // 1 m3 biogas replaces 0.43 kg LPG
  standardLpgCylinderKg: 14.2,           // Domestic LPG cylinder weight
  avgLpgCylinderPriceINR: 1050,          // Avg market cylinder price
  firewoodKgPerM3Biogas: 3.5,            // 1 m3 biogas replaces 3.5 kg dry firewood
  firewoodPricePerKgINR: 6.0,
  digestedSlurryDrySolidsKgPerLiter: 0.075, // Unified 7.5% Total Solids post-digestion (7-8% TS)
  slurryDryPercent: 0.075,               // Alias preserved for backward compatibility
  bioFertilizerValuePerKgINR: 6.0,       // Conservative NPK value of dry digested organic manure
  co2ReductionKgPerM3Biogas: 1.8,        // kg CO2 equivalent avoided per m3
  uncertaintyBandPercent: 15             // +/- 15% real-world operational variance band
};

const CLIMATE_FACTORS = {
  'Tropical Warm (30-36°C)': { yieldFactor: 1.08, retentionDays: 38, note: 'Optimal mesophilic range; peak methanogenic activity.' },
  'Moderate Plains (25-32°C)': { yieldFactor: 1.0, retentionDays: 45, note: 'Standard mesophilic baseline for Indian plains.' },
  'Cool / Winter Plains (18-24°C)': { yieldFactor: 0.84, retentionDays: 55, note: 'Moderate winter slowdown; mix slurry with warm water.' },
  'Cold / Hilly Region (<18°C)': { yieldFactor: 0.68, retentionDays: 65, note: 'Cold ambient suppression; underground dome insulation or solar canopy advised.' }
};

function resolveClimateProfile(climateZone) {
  const key = String(climateZone || '').toLowerCase();
  if (key.includes('tropical') || key.includes('warm')) {
    return CLIMATE_FACTORS['Tropical Warm (30-36°C)'];
  }
  if (key.includes('cold') || key.includes('hilly')) {
    return CLIMATE_FACTORS['Cold / Hilly Region (<18°C)'];
  }
  if (key.includes('cool') || key.includes('winter')) {
    return CLIMATE_FACTORS['Cool / Winter Plains (18-24°C)'];
  }
  return CLIMATE_FACTORS['Moderate Plains (25-32°C)'];
}

/**
 * Calculate Feasibility given parametric inputs, returning Min / Expected / Max ranges
 */
function calculateBiogasFeasibility(input) {
  const {
    cattleCount = 0,
    cattleBreakdown = {},
    avgDungPerCattleKg = 12,
    agriWasteKgPerDay = 0,
    kitchenWasteKgPerDay = 0,
    participatingHouseholds = 1,
    availableWaterLitersPerDay = 100,
    installationBudgetINR = 50000,
    climateZone = 'Moderate Plains (25-32°C)'
  } = input;

  const climateProfile = resolveClimateProfile(climateZone);

  // 1. Calculate Daily Dung Availability & Species-Specific Biogas Yield
  const SPECIES_YIELD_MAP = {
    Cow: BIOGAS_YIELDS.cowDungM3PerKg,
    Buffalo: BIOGAS_YIELDS.buffaloDungM3PerKg,
    Bullock: BIOGAS_YIELDS.bullockDungM3PerKg,
    Calf: BIOGAS_YIELDS.calfDungM3PerKg,
    'Goat/Sheep': BIOGAS_YIELDS.otherCattleDungM3PerKg
  };

  let totalDungKg = 0;
  let biogasFromDung = 0;
  if (cattleBreakdown && Object.keys(cattleBreakdown).length > 0) {
    for (const [type, count] of Object.entries(cattleBreakdown)) {
      const safeCount = Math.max(0, Number(count) || 0);
      const yieldPerAnimal = DUNG_DAILY_YIELD_KG[type] || Math.max(0, Number(avgDungPerCattleKg) || 12);
      const speciesDung = safeCount * yieldPerAnimal;
      totalDungKg += speciesDung;
      biogasFromDung += speciesDung * (SPECIES_YIELD_MAP[type] || BIOGAS_YIELDS.cowDungM3PerKg);
    }
  } else {
    totalDungKg = Math.max(0, Number(cattleCount) || 0) * Math.max(0, Number(avgDungPerCattleKg) || 12);
    biogasFromDung = totalDungKg * BIOGAS_YIELDS.cowDungM3PerKg;
  }

  // 2. Organic Waste Breakdown
  const totalAgriWaste = Math.max(0, Number(agriWasteKgPerDay) || 0);
  const totalKitchenWaste = Math.max(0, Number(kitchenWasteKgPerDay) || 0);
  const totalOrganicWasteKg = totalAgriWaste + totalKitchenWaste;
  const totalFeedstockKg = totalDungKg + totalOrganicWasteKg;

  // 3. Estimated Daily Biogas Production (m3) adjusted by ambient temperature kinetics
  const biogasFromAgri = totalAgriWaste * BIOGAS_YIELDS.agriWasteM3PerKg;
  const biogasFromKitchen = totalKitchenWaste * BIOGAS_YIELDS.kitchenWasteM3PerKg;
  const baseBiogasM3PerDay = biogasFromDung + biogasFromAgri + biogasFromKitchen;
  const estimatedBiogasM3PerDay = Number((baseBiogasM3PerDay * climateProfile.yieldFactor).toFixed(2));

  // Min / Expected / Max Biogas Yield Range (+/- 15% operational variance)
  const band = EQUIVALENCE_CONSTANTS.uncertaintyBandPercent / 100;
  const biogasRangeM3PerDay = {
    min: Number((estimatedBiogasM3PerDay * (1 - band)).toFixed(2)),
    expected: estimatedBiogasM3PerDay,
    max: Number((estimatedBiogasM3PerDay * (1 + band)).toFixed(2))
  };

  // 4. Water Requirements (1:1 ratio with fresh dung + 1.5:1 for dry agricultural residue)
  const safeWaterAvailable = Math.max(0, Number(availableWaterLitersPerDay) || 0);
  const requiredWaterLitersPerDay = Math.round(totalDungKg * 1.0 + totalAgriWaste * 1.5);
  const waterDeficitLiters = Math.max(0, requiredWaterLitersPerDay - safeWaterAvailable);
  const waterAdequacyPercent =
    requiredWaterLitersPerDay > 0
      ? Math.min(100, Math.round((safeWaterAvailable / requiredWaterLitersPerDay) * 100))
      : 100;

  // 5. Recommended Digester Plant Capacity (m3) using effective total feedstock equivalent
  const effectiveSizingFeedstockKg = totalDungKg + totalAgriWaste * 0.8 + totalKitchenWaste * 1.1;
  let recommendedPlant = PLANT_CAPACITY_MATRIX[0];
  for (let i = PLANT_CAPACITY_MATRIX.length - 1; i >= 0; i--) {
    if (effectiveSizingFeedstockKg >= PLANT_CAPACITY_MATRIX[i].minDailyDungKg * 0.85) {
      recommendedPlant = PLANT_CAPACITY_MATRIX[i];
      break;
    }
  }

  // Adjust for community plant if multiple households
  if (participatingHouseholds > 3 && recommendedPlant.capacityM3 < 6) {
    recommendedPlant = PLANT_CAPACITY_MATRIX.find((p) => p.capacityM3 >= 6) || recommendedPlant;
  }

  // 6. Cost & Subsidy Estimation
  const estimatedInstallationCost = recommendedPlant.baseCostINR;
  const applicableSubsidy = recommendedPlant.subsidyINR;
  const netInvestmentCost = Math.max(0, estimatedInstallationCost - applicableSubsidy);

  // 7. Savings & Payback Calculations (Mass-Balanced Slurry + Min/Expected/Max)
  const dailyLpgKgSaved = estimatedBiogasM3PerDay * EQUIVALENCE_CONSTANTS.lpgKgPerM3Biogas;
  const monthlyLpgEquivalentCylinders = Number(
    ((dailyLpgKgSaved * 30) / EQUIVALENCE_CONSTANTS.standardLpgCylinderKg).toFixed(2)
  );
  const monthlyLpgSavingsINR = Math.round(
    monthlyLpgEquivalentCylinders * EQUIVALENCE_CONSTANTS.avgLpgCylinderPriceINR
  );

  // Liquid slurry outflow accounts for feedstock + dilution water minus ~8% gas conversion mass loss
  const effectiveDilutionWaterLiters = Math.min(requiredWaterLitersPerDay, Math.max(safeWaterAvailable, totalDungKg * 0.6));
  const dailyLiquidSlurryLiters = Math.round((totalFeedstockKg + effectiveDilutionWaterLiters) * 0.92);
  const dailyDryBioManureKg = Number(
    (dailyLiquidSlurryLiters * EQUIVALENCE_CONSTANTS.digestedSlurryDrySolidsKgPerLiter).toFixed(2)
  );
  const monthlySlurrySavingsINR = Math.round(
    dailyDryBioManureKg * 30 * EQUIVALENCE_CONSTANTS.bioFertilizerValuePerKgINR
  );

  const totalMonthlySavingsINR = monthlyLpgSavingsINR + monthlySlurrySavingsINR;
  const totalAnnualSavingsINR = totalMonthlySavingsINR * 12;

  const monthlySavingsRangeINR = {
    min: Math.round(totalMonthlySavingsINR * (1 - band)),
    expected: totalMonthlySavingsINR,
    max: Math.round(totalMonthlySavingsINR * (1 + band))
  };

  // Payback period (years) — Note: Max savings produces shortest (min) payback; Min savings produces longest (max) payback
  const estimatedPaybackYears =
    totalAnnualSavingsINR > 0 ? Number((netInvestmentCost / totalAnnualSavingsINR).toFixed(1)) : null;

  const paybackRangeYears =
    totalAnnualSavingsINR > 0
      ? {
          min: Number((netInvestmentCost / (monthlySavingsRangeINR.max * 12)).toFixed(1)),
          expected: estimatedPaybackYears,
          max: Number((netInvestmentCost / Math.max(1, monthlySavingsRangeINR.min * 12)).toFixed(1))
        }
      : { min: null, expected: null, max: null };

  // Annual GHG reduction
  const annualCo2AvoidedKg = Math.round(
    estimatedBiogasM3PerDay * 365 * EQUIVALENCE_CONSTANTS.co2ReductionKgPerM3Biogas
  );

  // 8. Feasibility Classification Logic (Consistent with Co-Digestion Sizing)
  let feasibilityResult = 'Not Feasible';
  let feasibilityScore = 0; // 0 - 100
  const reasons = [];
  const recommendations = [];

  // Feedstock score (up to 50 pts) — evaluated on effectiveSizingFeedstockKg
  if (effectiveSizingFeedstockKg >= recommendedPlant.minDailyDungKg) {
    feasibilityScore += 50;
  } else if (effectiveSizingFeedstockKg >= 18) {
    feasibilityScore += 30;
    reasons.push(
      `Effective feedstock (${effectiveSizingFeedstockKg.toFixed(1)} kg/day) is slightly below the ideal threshold (${recommendedPlant.minDailyDungKg} kg/day) for a ${recommendedPlant.capacityM3} m³ plant.`
    );
  } else {
    feasibilityScore += 10;
    reasons.push(
      `Daily feedstock availability (${effectiveSizingFeedstockKg.toFixed(1)} kg/day) is inadequate for an independent domestic plant (minimum 20 kg/day required).`
    );
  }

  // Inoculum balance check (cattle dung provides active methanogens)
  if (totalFeedstockKg > 0 && totalDungKg < totalFeedstockKg * 0.4) {
    reasons.push(
      `Low bovine dung share (${Math.round((totalDungKg / totalFeedstockKg) * 100)}%). Maintain at least 40% cattle dung for stable methanogenic buffering.`
    );
  }

  // Water score (up to 25 pts)
  if (waterAdequacyPercent >= 90) {
    feasibilityScore += 25;
  } else if (waterAdequacyPercent >= 60) {
    feasibilityScore += 15;
    reasons.push(
      `Water availability is at ${waterAdequacyPercent}%. Digester slurry requires adequate dilution to prevent pipe clogs.`
    );
  } else {
    feasibilityScore += 5;
    reasons.push(
      `Critical water shortage (${waterAdequacyPercent}% of required ${requiredWaterLitersPerDay} L/day). Water is essential for feedstock slurrying.`
    );
  }

  // Budget & Financial score (up to 25 pts)
  const safeBudget = Math.max(0, Number(installationBudgetINR) || 0);
  if (safeBudget >= netInvestmentCost) {
    feasibilityScore += 25;
  } else if (safeBudget >= netInvestmentCost * 0.6) {
    feasibilityScore += 15;
    reasons.push(
      `Budget (₹${safeBudget.toLocaleString()}) covers 60%+ of net cost (₹${netInvestmentCost.toLocaleString()}). Loan or Gram Panchayat support recommended.`
    );
  } else {
    feasibilityScore += 5;
    reasons.push(
      `Budget shortfall: Net cost after subsidy is ₹${netInvestmentCost.toLocaleString()}, while budget is ₹${safeBudget.toLocaleString()}.`
    );
  }

  // Determine Category
  if (feasibilityScore >= 75 && totalFeedstockKg >= 22 && waterAdequacyPercent >= 70) {
    feasibilityResult = 'Highly Feasible';
    recommendations.push(
      `Excellent conditions! Recommended plant size: ${recommendedPlant.capacityM3} m³ (${
        recommendedPlant.capacityM3 >= 25 ? 'Community CSTR / Floating Drum' : 'Deenabandhu Fixed Dome'
      } model).`
    );
    recommendations.push(
      `Apply for National Bioenergy Programme / Gobardhan subsidy to claim up to ₹${applicableSubsidy.toLocaleString()}.`
    );
    if (paybackRangeYears.expected !== null) {
      recommendations.push(
        `Expected payback: ${paybackRangeYears.expected} years (range: ${paybackRangeYears.min}–${paybackRangeYears.max} years).`
      );
    }
  } else if (feasibilityScore >= 45 && totalFeedstockKg >= 15) {
    feasibilityResult = 'Moderately Feasible';
    recommendations.push(
      `Feasible with adjustments. Consider community resource pooling with 1–2 neighboring households to aggregate at least 50 kg/day.`
    );
    recommendations.push(`Explore Gram Panchayat Gobardhan cluster funding or agricultural SHG microfinance.`);
    if (waterAdequacyPercent < 80) {
      recommendations.push(`Implement household graywater recycling or rainwater collection to satisfy slurry water requirements.`);
    }
  } else {
    feasibilityResult = 'Not Feasible';
    recommendations.push(`Individual standalone plant is not economically or technically viable under current resources.`);
    recommendations.push(`Register for the Community Resource Sharing pool to contribute waste to a central village digester.`);
    recommendations.push(`Alternative: Construct an aerobic compost pit or vermicompost bed for available organic waste.`);
  }

  if (climateProfile.yieldFactor < 0.9) {
    recommendations.push(`Ambient climate adjustment (${climateZone}): ${climateProfile.note}`);
  }

  return {
    inputs: {
      cattleCount: Math.max(0, Number(cattleCount) || 0),
      avgDungPerCattleKg: Math.max(0, Number(avgDungPerCattleKg) || 12),
      agriWasteKgPerDay: totalAgriWaste,
      kitchenWasteKgPerDay: totalKitchenWaste,
      participatingHouseholds: Math.max(1, Number(participatingHouseholds) || 1),
      availableWaterLitersPerDay: safeWaterAvailable,
      installationBudgetINR: safeBudget,
      climateZone
    },
    results: {
      totalDailyDungKg: Number(totalDungKg.toFixed(2)),
      totalDailyOrganicWasteKg: Number(totalOrganicWasteKg.toFixed(2)),
      totalDailyFeedstockKg: Number(totalFeedstockKg.toFixed(2)),
      estimatedBiogasM3PerDay,
      biogasRangeM3PerDay,
      climateZone,
      temperatureEfficiencyPercent: Math.round(climateProfile.yieldFactor * 100),
      hydraulicRetentionDays: climateProfile.retentionDays,
      recommendedPlantCapacityM3: recommendedPlant.capacityM3,
      recommendedModel:
        recommendedPlant.capacityM3 >= 25 ? 'Community Floating Drum / CSTR' : 'Deenabandhu Fixed Dome Model',
      requiredWaterLitersPerDay,
      waterAdequacyPercent,
      waterDeficitLiters,
      dailyLiquidSlurryLiters,
      dailyDryBioManureKg,
      estimatedInstallationCostINR: estimatedInstallationCost,
      applicableSubsidyINR: applicableSubsidy,
      netInvestmentCostINR: netInvestmentCost,
      monthlyLpgEquivalentCylinders,
      monthlyLpgSavingsINR,
      monthlySlurrySavingsINR,
      totalMonthlySavingsINR,
      monthlySavingsRangeINR,
      totalAnnualSavingsINR,
      estimatedPaybackYears,
      paybackRangeYears,
      annualCo2AvoidedKg,
      feasibilityResult,
      feasibilityScore,
      reasons,
      recommendations
    },
    engineeringAssumptions: {
      biogasYieldPerKgDung: `Cow ${BIOGAS_YIELDS.cowDungM3PerKg}, Buffalo ${BIOGAS_YIELDS.buffaloDungM3PerKg}, Bullock ${BIOGAS_YIELDS.bullockDungM3PerKg} m³/kg`,
      biogasYieldPerKgKitchenWaste: `${BIOGAS_YIELDS.kitchenWasteM3PerKg} m³/kg`,
      biogasYieldPerKgAgriWaste: `${BIOGAS_YIELDS.agriWasteM3PerKg} m³/kg`,
      feedstockDilutionRatio: '1:1 with fresh dung; 1.5:1 with dry agricultural residue (8–10% influent TS)',
      digestedSlurrySolids: `${EQUIVALENCE_CONSTANTS.digestedSlurryDrySolidsKgPerLiter} kg dry bio-manure/L (7.5% effluent TS)`,
      uncertaintyRange: `±${EQUIVALENCE_CONSTANTS.uncertaintyBandPercent}% operational variance band (min / expected / max)`,
      lpgEquivalence: '1 m³ Biogas ≈ 0.43 kg LPG (1 standard 14.2 kg cylinder ≈ 33 m³ biogas)',
      lpgReferencePrice: `₹${EQUIVALENCE_CONSTANTS.avgLpgCylinderPriceINR} per 14.2 kg cylinder`,
      bioFertilizerValue: `Enriched organic bio-slurry valued at ₹${EQUIVALENCE_CONSTANTS.bioFertilizerValuePerKgINR}/kg dry equivalent`,
      disclaimer:
        'Calculated figures are engineering estimates (not guaranteed production) based on continuous mesophilic anaerobic digestion. Actual output depends on ambient temperature, hydraulic retention time (38–65 days), and slurry dilution.'
    }
  };
}

module.exports = {
  calculateBiogasFeasibility,
  PLANT_CAPACITY_MATRIX,
  BIOGAS_YIELDS,
  DUNG_DAILY_YIELD_KG,
  EQUIVALENCE_CONSTANTS,
  CLIMATE_FACTORS
};
