const http = require('http');

const BASE_ORIGIN = 'http://localhost:5000';
const API_BASE = `${BASE_ORIGIN}/api`;

async function request(path, options = {}) {
  const fullUrl = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const url = new URL(fullUrl);
  const method = options.method || 'GET';
  const headers = { ...(options.headers || {}) };
  let body = options.body;

  if (body && typeof body === 'object') {
    body = JSON.stringify(body);
    headers['Content-Type'] = 'application/json';
  }

  return new Promise((resolve, reject) => {
    const req = http.request(url, { method, headers }, (res) => {
      let rawData = '';
      res.on('data', (chunk) => (rawData += chunk));
      res.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(rawData);
        } catch {
          parsed = rawData;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });

    req.on('error', (err) => reject(err));
    if (body) req.write(body);
    req.end();
  });
}

async function runFinalVerification() {
  const report = { total: 0, passed: 0, failed: 0 };

  function assert(cond, name, info = '') {
    report.total++;
    if (cond) {
      report.passed++;
      console.log(`[PASS] ${name}`);
    } else {
      report.failed++;
      console.error(`[FAIL] ${name} :: ${info}`);
    }
  }

  console.log('=====================================================================');
  console.log('END-TO-END SYSTEM VERIFICATION (ALL 6 AUDIT AREAS + EXISTING MODULES)');
  console.log('=====================================================================\n');

  // 0. Frontend Static Delivery Check
  const htmlRes = await request(`${BASE_ORIGIN}/`);
  assert(
    htmlRes.status === 200 && typeof htmlRes.body === 'string' && htmlRes.body.includes('/assets/'),
    '0.1 Built React Frontend Served Cleanly on http://localhost:5000/'
  );

  // 1. Auth & Role Tokens
  const adminRes = await request('/auth/login', {
    method: 'POST',
    body: { email: 'admin@biogas.gov.in', password: 'Admin@123' }
  });
  const coordRes = await request('/auth/login', {
    method: 'POST',
    body: { email: 'coordinator@biogas.gov.in', password: 'Coord@123' }
  });
  const houseRes = await request('/auth/login', {
    method: 'POST',
    body: { email: 'household@biogas.gov.in', password: 'House@123' }
  });

  const adminToken = adminRes.body.token;
  const coordToken = coordRes.body.token;
  const houseToken = houseRes.body.token;

  assert(adminToken && coordToken && houseToken, '1.1 All 3 Role Logins Verified (Admin, Coordinator, Household)');

  const villagesRes = await request('/villages');
  const villageId = villagesRes.body.data[0]._id;
  const plantsRes = await request('/plants', { headers: { Authorization: `Bearer ${adminToken}` } });
  const plantId = plantsRes.body.data[0]._id;

  // 2. Filtered MongoDB Aggregate ObjectId Cast Verification
  const fsFiltered = await request(`/feedstock?villageId=${villageId}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(
    fsFiltered.status === 200 && fsFiltered.body.stats.grandTotal > 0,
    `2.1 Feedstock Village-Filtered Aggregate Returns Real Totals (${fsFiltered.body.stats?.grandTotal} kg)`
  );

  const monFiltered = await request(`/monitoring?plantId=${plantId}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(
    monFiltered.status === 200 && monFiltered.body.averages.totalFeedstock > 0,
    `2.2 Monitoring Plant-Filtered Aggregate Returns Real Averages (Temp: ${monFiltered.body.averages?.avgTemp?.toFixed(1)}°C)`
  );

  // 3. AREA 1 — Calculation Accuracy (Min/Expected/Max Ranges, Unified 7.5% TS, Climate Kinetics, Validation)
  const warmCalc = await request('/calculator/evaluate', {
    method: 'POST',
    body: {
      cattleCount: 4,
      cattleBreakdown: { Cow: 2, Buffalo: 2 },
      agriWasteKgPerDay: 8,
      kitchenWasteKgPerDay: 3,
      availableWaterLitersPerDay: 85,
      installationBudgetINR: 60000,
      climateZone: 'Tropical Warm (30-36°C)'
    }
  });
  const coldCalc = await request('/calculator/evaluate', {
    method: 'POST',
    body: {
      cattleCount: 4,
      cattleBreakdown: { Cow: 2, Buffalo: 2 },
      agriWasteKgPerDay: 8,
      kitchenWasteKgPerDay: 3,
      availableWaterLitersPerDay: 85,
      installationBudgetINR: 60000,
      climateZone: 'Cold / Hilly Region (<18°C)'
    }
  });
  const wr = warmCalc.body.data?.results;
  const cr = coldCalc.body.data?.results;
  const expectedDrySlurry = Number((wr.dailyLiquidSlurryLiters * 0.075).toFixed(1));
  assert(
    warmCalc.status === 200 &&
      coldCalc.status === 200 &&
      wr.estimatedBiogasM3PerDay > cr.estimatedBiogasM3PerDay &&
      cr.hydraulicRetentionDays === 65 &&
      wr.biogasRangeM3PerDay.min < wr.biogasRangeM3PerDay.expected &&
      wr.biogasRangeM3PerDay.expected < wr.biogasRangeM3PerDay.max &&
      wr.monthlySavingsRangeINR.min < wr.monthlySavingsRangeINR.expected &&
      Math.abs(wr.dailyDryBioManureKg - expectedDrySlurry) <= 0.2,
    `3.1 Area 1 Calculator: Min/Exp/Max Ranges (${wr?.biogasRangeM3PerDay?.min}-${wr?.biogasRangeM3PerDay?.max} m3/d), 7.5% TS Slurry & Climate Kinetics Verified`,
    JSON.stringify(wr?.biogasRangeM3PerDay)
  );

  const badCalc = await request('/calculator/evaluate', {
    method: 'POST',
    body: { cattleCount: -5, agriWasteKgPerDay: 10 }
  });
  assert(badCalc.status === 400, '3.2 Area 1 Calculator Rejects Negative Cattle Count with 400');

  // 4. AREA 2 — Seasonal Forecasting (70/30 Holdout MAE/RMSE, Uncertainty Bands, <7 Day Insufficient Data Guard)
  const analyticsRes = await request('/reports/analytics', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const sf = analyticsRes.body.data?.seasonalForecast;
  assert(
    analyticsRes.status === 200 &&
      sf &&
      sf.sampleDays >= 10 &&
      sf.holdoutTestDays >= 1 &&
      sf.metrics.holdoutRmseKg >= sf.metrics.holdoutMaeKg &&
      sf.uncertaintyRadiusKg >= 0 &&
      sf.seasonalProjections.length === 4 &&
      sf.seasonalProjections[0].feedstockRangeKg.min <= sf.seasonalProjections[0].feedstockRangeKg.expected &&
      sf.seasonalProjections[0].feedstockRangeKg.expected <= sf.seasonalProjections[0].feedstockRangeKg.max,
    `4.1 Area 2 Forecast: 70/30 Holdout MAE=${sf?.metrics?.holdoutMaeKg}, RMSE=${sf?.metrics?.holdoutRmseKg}, ±${sf?.uncertaintyRadiusKg} kg/d Band Verified`
  );

  // Verify <7 days insufficient data guard returns null metrics instead of false 100%
  const emptyVillageRes = await request('/villages', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      name: `ZeroData Test Gram ${Date.now()}`,
      district: 'Test District',
      state: 'Uttar Pradesh',
      population: 500,
      totalHouseholds: 80,
      estimatedCattle: 100
    }
  });
  const emptyVillageId = emptyVillageRes.body.data?._id;
  const emptyTrendsRes = await request(`/feedstock/seasonal-trends?villageId=${emptyVillageId}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const ef = emptyTrendsRes.body.data?.forecast;
  assert(
    emptyTrendsRes.status === 200 &&
      String(ef.dataSufficiency || '').includes('Insufficient Data') &&
      ef.metrics.accuracyPercent === null &&
      ef.metrics.maeKg === null &&
      ef.metrics.rmseKg === null,
    '4.2 Area 2 Forecast Guard: <7 Days Historical Data Returns Null Metrics (No Fake 100% Accuracy)',
    JSON.stringify(ef?.metrics)
  );

  // 5. AREA 3 — Digital Twin Simulator (Tri-Scenario Comparison, Transport Scaling, Deficit Viability, Validation)
  const twinNormal = await request('/simulator/run', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      householdParticipationPercent: 100,
      participatingHouseholds: 10,
      wasteAvailabilityMultiplier: 1.0,
      dailyDungKg: 300,
      dailyAgriWasteKg: 50,
      dailyKitchenWasteKg: 20,
      plantCapacityM3: 25,
      installationCostINR: 480000,
      subsidyPercent: 36,
      transportCostPerKmINR: 18,
      avgDailyTransportKm: 8
    }
  });
  const tri = twinNormal.body.data?.triScenarioComparison;
  assert(
    twinNormal.status === 200 &&
      tri &&
      tri.worstCase.annualNetSavingsINR < tri.normalCase.annualNetSavingsINR &&
      tri.normalCase.annualNetSavingsINR < tri.bestCase.annualNetSavingsINR,
    `5.1 Area 3 Digital Twin: Worst (₹${tri?.worstCase?.annualNetSavingsINR}) < Normal (₹${tri?.normalCase?.annualNetSavingsINR}) < Best (₹${tri?.bestCase?.annualNetSavingsINR})`
  );

  const twinHighWaste = await request('/simulator/run', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      householdParticipationPercent: 100,
      participatingHouseholds: 10,
      wasteAvailabilityMultiplier: 1.8,
      dailyDungKg: 300,
      dailyAgriWasteKg: 50,
      dailyKitchenWasteKg: 20,
      plantCapacityM3: 25,
      installationCostINR: 480000,
      subsidyPercent: 36,
      transportCostPerKmINR: 18,
      avgDailyTransportKm: 8
    }
  });
  assert(
    twinHighWaste.body.data.outputs.annualTransportCostINR > twinNormal.body.data.outputs.annualTransportCostINR,
    `5.2 Area 3 Digital Twin: Transport Cost Scales With Waste Load (₹${twinNormal.body.data.outputs.annualTransportCostINR} -> ₹${twinHighWaste.body.data.outputs.annualTransportCostINR})`
  );

  const twinDeficit = await request('/simulator/run', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      householdParticipationPercent: 30,
      participatingHouseholds: 2,
      wasteAvailabilityMultiplier: 0.5,
      dailyDungKg: 40,
      dailyAgriWasteKg: 0,
      dailyKitchenWasteKg: 0,
      plantCapacityM3: 25,
      installationCostINR: 500000,
      subsidyPercent: 10,
      transportCostPerKmINR: 80,
      avgDailyTransportKm: 40
    }
  });
  assert(
    twinDeficit.status === 200 &&
      twinDeficit.body.data.outputs.annualNetSavingsINR < 0 &&
      twinDeficit.body.data.outputs.paybackYears === null &&
      twinDeficit.body.data.outputs.viabilityStatus.includes('Non-Viable'),
    '5.3 Area 3 Digital Twin: Negative Net Cashflow Returns paybackYears=null & Non-Viable Status'
  );

  const twinInvalid = await request('/simulator/run', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { subsidyPercent: 150, plantCapacityM3: -10 }
  });
  assert(twinInvalid.status === 400, '5.4 Area 3 Digital Twin Rejects Out-of-Range Inputs (400)');

  // 6. AREA 4 — Digestate & Fertilizer Estimation (NPK kg, Storage Loss, Safe Land, Estimated vs Lab-Verified)
  const digRes = await request('/digestate/summary', { headers: { Authorization: `Bearer ${coordToken}` } });
  const dm = digRes.body.data;
  assert(
    digRes.status === 200 &&
      dm.monthlyNpkSupplyKg?.nitrogenKg > 0 &&
      dm.monthlyNpkSupplyKg?.phosphorusKg > 0 &&
      dm.monthlyNpkSupplyKg?.potassiumKg > 0 &&
      dm.metrics.recommendedLandRequiredAcres > 0 &&
      dm.agronomyConstants.dryManureKgPerLiter === 0.075 &&
      dm.feedstockComposition?.shares?.dungPercent >= 0,
    `6.1 Area 4 Digestate Summary: Explicit Monthly NPK (N=${dm?.monthlyNpkSupplyKg?.nitrogenKg}, P=${dm?.monthlyNpkSupplyKg?.phosphorusKg}, K=${dm?.monthlyNpkSupplyKg?.potassiumKg} kg), Safe Land=${dm?.metrics?.recommendedLandRequiredAcres} ac, Unified 7.5% TS`
  );

  const farmerId = dm.farmers[0]._id;
  const distLiquid = await request('/digestate/distributions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${coordToken}` },
    body: {
      sourcePlantId: plantId,
      farmerLandId: farmerId,
      digestateAllocatedLiters: 2000,
      applicationMethod: 'Liquid Bio-Slurry',
      nutrientVerificationSource: 'estimated',
      status: 'Scheduled'
    }
  });
  const distDried = await request('/digestate/distributions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${coordToken}` },
    body: {
      sourcePlantId: plantId,
      farmerLandId: farmerId,
      digestateAllocatedLiters: 2000,
      applicationMethod: 'Sun-Dried Digestate Cake',
      nutrientVerificationSource: 'lab_verified',
      labReportReference: 'KVK-LAB-2026-88',
      status: 'Delivered'
    }
  });
  assert(
    distLiquid.status === 201 &&
      distDried.status === 201 &&
      distLiquid.body.data.estimatedNpkKg.nitrogenKg > distDried.body.data.estimatedNpkKg.nitrogenKg &&
      distDried.body.data.nutrientVerificationSource === 'lab_verified' &&
      distLiquid.body.data.nutrientVerificationSource === 'estimated',
    `6.2 Area 4 Digestate Losses & Verification: Liquid N (${distLiquid.body.data?.estimatedNpkKg?.nitrogenKg} kg) > Sun-Dried N (${distDried.body.data?.estimatedNpkKg?.nitrogenKg} kg) & Lab-Verified Flag Persisted`
  );

  const distInvalid = await request('/digestate/distributions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${coordToken}` },
    body: { sourcePlantId: plantId, farmerLandId: farmerId, digestateAllocatedLiters: -500 }
  });
  assert(distInvalid.status === 400, '6.3 Area 4 Digestate Rejects Negative Volume (400)');

  // 7. AREA 5 — Cross-Module Input Validation & System Audit Logs
  const badFeedstock = await request('/feedstock', {
    method: 'POST',
    headers: { Authorization: `Bearer ${coordToken}` },
    body: { villageId, dungKg: 0, agriWasteKg: 0, kitchenWasteKg: 0 }
  });
  const badMonitoring = await request('/monitoring', {
    method: 'POST',
    headers: { Authorization: `Bearer ${coordToken}` },
    body: { plantId, feedstockInputKg: 50, gasProducedM3: 2, temperatureC: 99, phLevel: 7.2 }
  });
  const badPlant = await request('/plants', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { plantName: 'Bad Subsidy Plant', capacityM3: 4, villageId, installationCost: 50000, subsidyReceived: 90000 }
  });
  const badScheme = await request('/schemes', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      schemeName: 'XSS Bad URL Scheme',
      subsidyDetails: { subsidyPercentage: 40, maxSubsidyAmount: 20000 },
      officialPortalUrl: 'javascript:alert(1)'
    }
  });
  assert(
    badFeedstock.status === 400 &&
      badMonitoring.status === 400 &&
      badPlant.status === 400 &&
      badScheme.status === 400,
    '7.1 Area 5 Validation: Rejected 0-kg Feedstock, 99°C Temp, Subsidy>Cost Plant, & Non-HTTP Scheme URL (All 400)'
  );

  const houseAuditBlocked = await request('/users/audit-logs', {
    headers: { Authorization: `Bearer ${houseToken}` }
  });
  const adminAuditLogs = await request('/users/audit-logs?limit=25', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(
    houseAuditBlocked.status === 403 &&
      adminAuditLogs.status === 200 &&
      adminAuditLogs.body.data.length > 0 &&
      adminAuditLogs.body.data[0].actorEmail &&
      adminAuditLogs.body.data[0].createdAt,
    `7.2 Area 5 Audit Logs: RBAC Enforced (Household 403) & Admin Retrieved ${adminAuditLogs.body.data?.length} Timestamped Audit Events`
  );

  // 8. AREA 6 — Database Backup Vault, SHA-256 Tamper Check, Confirmation Gate & Round-Trip Restoration
  const houseBackupBlocked = await request('/reports/backup', {
    headers: { Authorization: `Bearer ${houseToken}` }
  });
  assert(houseBackupBlocked.status === 403, '8.1 Area 6 Backup Blocked for Household Role (403 Forbidden)');

  const serverSnapRes = await request('/reports/backups/create', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const snapFilename = serverSnapRes.body.data?.filename;
  const listSnapRes = await request('/reports/backups', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(
    serverSnapRes.status === 201 &&
      snapFilename &&
      serverSnapRes.body.data.checksumSha256?.length === 64 &&
      listSnapRes.status === 200 &&
      listSnapRes.body.data.some((b) => b.filename === snapFilename),
    `8.2 Area 6 Server Backup Vault Created & Listed (${snapFilename}, SHA-256 verified)`
  );

  const backupRes = await request('/reports/backup', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const backupData = backupRes.body;

  // 8.3 Missing confirmOverwrite MUST be rejected
  const unconfirmedRestore = await request('/reports/restore', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: backupData
  });
  assert(
    unconfirmedRestore.status === 400,
    '8.3 Area 6 Restore Without Explicit confirmOverwrite=true Rejected (400)'
  );

  // 8.4 Tampered backup checksum MUST be rejected
  const tamperedBackup = JSON.parse(JSON.stringify(backupData));
  tamperedBackup.collections.villages.pop();
  const tamperedRestore = await request('/reports/restore', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { ...tamperedBackup, confirmOverwrite: true }
  });
  assert(
    tamperedRestore.status === 400 && String(tamperedRestore.body.message || '').includes('SHA-256'),
    '8.4 Area 6 Tampered Backup Rejected by SHA-256 Integrity Verification (400)'
  );

  // 8.5 Mutate DB, then restore from server snapshot WITH confirmOverwrite: true and verify exact rollback
  const extraScheme = await request('/schemes', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      schemeName: 'Pre-Restore Temp Scheme',
      shortCode: `TMP-${Date.now()}`,
      implementingAgency: 'Audit',
      subsidyDetails: { subsidyPercentage: 25, maxSubsidyAmount: 10000 },
      officialPortalUrl: 'https://example.gov.in'
    }
  });
  assert(extraScheme.status === 201, '8.5 Pre-Restore Mutation Created Successfully');

  const confirmedRestore = await request('/reports/restore', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { serverBackupFilename: snapFilename, confirmOverwrite: true }
  });
  const postRestoreSchemes = await request('/schemes');
  assert(
    confirmedRestore.status === 200 &&
      postRestoreSchemes.body.data.length === backupData.collections.governmentSchemes.length,
    `8.6 Area 6 Confirmed Server Snapshot Restoration Verified (Schemes restored to exact snapshot count: ${postRestoreSchemes.body.data.length})`
  );

  // 9. Existing Advanced Modules Regression Verification (Optimizer, Incentives, Household Profile)
  const optRes = await request(
    `/optimizer/analyze?villageId=${villageId}&vehicleCapacityKg=60&plantCapacityM3=25&transportCostPerKmINR=18`,
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );
  const allWithinVehicleCap = optRes.body.data.routeOptimization.routes.every((r) => r.totalCollectedKg <= 60.1);
  assert(
    optRes.status === 200 && allWithinVehicleCap && optRes.body.data.candidateSites.length >= 3,
    '9.1 Module 2 (Allocation & Route Optimizer): Strict Vehicle Capacity & Weiszfeld Siting Verified'
  );

  const incRes = await request('/incentives/dashboard', { headers: { Authorization: `Bearer ${coordToken}` } });
  assert(
    incRes.status === 200 && incRes.body.data.rankings.length >= 3 && incRes.body.data.summary.totalIncentiveDisbursedINR > 0,
    '9.2 Module 3 (Contribution & Incentive Platform): Rankings & Payouts Verified'
  );

  const myProf = await request('/households/my-profile', {
    headers: { Authorization: `Bearer ${houseToken}` }
  });
  assert(myProf.status === 200 && myProf.body.data.dailyDungKg > 0, '9.3 Self-Service Household & Cattle Profile Verified');

  console.log('\n=====================================================================');
  console.log(`FINAL VERIFICATION SUMMARY: ${report.passed}/${report.total} PASSED (${report.failed} FAILED)`);
  console.log('=====================================================================');

  process.exit(report.failed > 0 ? 1 : 0);
}

runFinalVerification().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
