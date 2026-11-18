const http = require('http');

const API_BASE = 'http://localhost:5000/api';

async function request(path, options = {}) {
  const url = new URL(`${API_BASE}${path}`);
  const method = options.method || 'GET';
  const headers = options.headers || {};
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

async function runExtendedAudit() {
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

  console.log('===============================================================');
  console.log('EXTENDED REGRESSION + 4 NEW MODULES COMPREHENSIVE AUDIT');
  console.log('===============================================================\n');

  // Login as Admin & Coordinator
  const adminRes = await request('/auth/login', {
    method: 'POST',
    body: { email: 'admin@biogas.gov.in', password: 'Admin@123' }
  });
  assert(adminRes.status === 200 && adminRes.body.token, 'AUTH.1 Admin login');
  const adminToken = adminRes.body.token;

  const coordRes = await request('/auth/login', {
    method: 'POST',
    body: { email: 'coordinator@biogas.gov.in', password: 'Coord@123' }
  });
  assert(coordRes.status === 200 && coordRes.body.token, 'AUTH.2 Coordinator login');
  const coordToken = coordRes.body.token;

  const villagesRes = await request('/villages');
  const villageId = villagesRes.body.data[0]._id;
  const householdsRes = await request('/households', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const firstHouseholdId = householdsRes.body.data[0]._id;

  // --- FEATURE 1: Collection & Plant Allocation Optimizer ---
  const optRes = await request(
    `/optimizer/analyze?villageId=${villageId}&vehicleCapacityKg=150&plantCapacityM3=25&transportCostPerKmINR=18`,
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );
  const optData = optRes.body.data;
  assert(
    optRes.status === 200 &&
      optData.candidateSites.length >= 3 &&
      optData.routeOptimization.routes.length >= 1 &&
      optData.routeOptimization.summary.totalDailyDistanceKm > 0 &&
      optData.routeOptimization.summary.totalDailyTransportCostINR > 0,
    'NEW-1.1 Allocation Optimizer: Optimal site, Haversine distances, transport costs & routes',
    JSON.stringify(optData?.routeOptimization?.summary)
  );

  // Test switching selected candidate site
  const altSiteId = optData.candidateSites[1].siteId;
  const optAlt = await request(
    `/optimizer/analyze?villageId=${villageId}&selectedSiteId=${altSiteId}`,
    { headers: { Authorization: `Bearer ${coordToken}` } }
  );
  assert(
    optAlt.status === 200 && optAlt.body.data.activeDepot.siteId === altSiteId,
    'NEW-1.2 Allocation Optimizer: Dynamic re-optimization on alternate candidate site'
  );

  // --- FEATURE 2: Community Contribution & Incentive Platform ---
  const incDash = await request('/incentives/dashboard?period=monthly', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(
    incDash.status === 200 &&
      incDash.body.data.summary.monthlyTotalKg > 0 &&
      incDash.body.data.rankings.length > 0 &&
      incDash.body.data.weeklySummary.length === 4,
    'NEW-2.1 Incentive Platform: Daily/Weekly/Monthly metrics & household rankings'
  );

  const logContrib = await request('/incentives/log', {
    method: 'POST',
    headers: { Authorization: `Bearer ${coordToken}` },
    body: {
      villageId,
      householdId: firstHouseholdId,
      dungKg: 40,
      agriWasteKg: 10,
      kitchenWasteKg: 4,
      notes: 'Audit verification waste batch'
    }
  });
  assert(
    logContrib.status === 201 &&
      logContrib.body.data.totalKg === 54 &&
      logContrib.body.data.incentiveValueINR === 108,
    'NEW-2.2 Incentive Platform: Log daily contribution & compute points/INR/slurry'
  );

  const incCsv = await request('/incentives/report-csv', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(
    incCsv.status === 200 &&
      incCsv.headers['content-type']?.includes('text/csv') &&
      incCsv.body.includes('Total 30-Day Contribution'),
    'NEW-2.3 Incentive Platform: Downloadable CSV contribution report'
  );

  // --- FEATURE 3: Digestate-to-Fertilizer Planner ---
  const digSum = await request('/digestate/summary', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(
    digSum.status === 200 &&
      digSum.body.data.metrics.totalDailyDigestateLiters > 0 &&
      digSum.body.data.matchingPlan.length > 0 &&
      digSum.body.data.distributions.length > 0,
    'NEW-3.1 Digestate Planner: Daily/Monthly slurry estimation & supply-demand matching'
  );

  const newFarmer = await request('/digestate/farmers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${coordToken}` },
    body: {
      farmerName: 'Audit Test Organic Farmer',
      villageId,
      landAreaAcres: 3.5,
      soilType: 'Alluvial',
      primaryCrop: 'Wheat',
      croppingSeason: 'Rabi',
      fertilizerRequiredKgPerMonth: 700,
      preferredApplicationType: 'Liquid Bio-Slurry'
    }
  });
  assert(newFarmer.status === 201 && newFarmer.body.data._id, 'NEW-3.2 Digestate Planner: Register farmer & farmland');

  const plantId = digSum.body.data.plantSupplies[0].plantId;
  const newDist = await request('/digestate/distributions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${coordToken}` },
    body: {
      villageId,
      sourcePlantId: plantId,
      farmerLandId: newFarmer.body.data._id,
      digestateAllocatedLiters: 2500,
      status: 'Scheduled',
      notes: 'Audit tanker allocation'
    }
  });
  assert(
    newDist.status === 201 && newDist.body.data.chemicalFertilizerReplacedKg > 0,
    'NEW-3.3 Digestate Planner: Schedule digestate distribution & NPK substitution calculation'
  );

  const updDist = await request(`/digestate/distributions/${newDist.body.data._id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${coordToken}` },
    body: { status: 'Applied to Field' }
  });
  assert(
    updDist.status === 200 && updDist.body.data.status === 'Applied to Field',
    'NEW-3.4 Digestate Planner: Update distribution lifecycle status'
  );

  // --- FEATURE 4: Digital Twin & What-If Simulator ---
  const baseRes = await request(`/simulator/baseline?villageId=${villageId}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(
    baseRes.status === 200 &&
      baseRes.body.data.baseline.outputs.estimatedDailyBiogasM3 > 0 &&
      baseRes.body.data.baseline.cashflowProjection.length === 11,
    'NEW-4.1 Digital Twin: Load real DB village baseline & 10-year cashflow projection'
  );

  const simRun = await request('/simulator/run', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      householdParticipationPercent: 140,
      participatingHouseholds: 10,
      wasteAvailabilityMultiplier: 1.25,
      dailyDungKg: 350,
      dailyAgriWasteKg: 60,
      dailyKitchenWasteKg: 25,
      plantCapacityM3: 45,
      installationCostINR: 820000,
      subsidyPercent: 40,
      transportCostPerKmINR: 16,
      avgDailyTransportKm: 10
    }
  });
  assert(
    simRun.status === 200 &&
      simRun.body.data.outputs.estimatedDailyBiogasM3 > 0 &&
      simRun.body.data.outputs.annualNetSavingsINR > 0,
    'NEW-4.2 Digital Twin: What-If parametric simulation engine'
  );

  const savedScen = await request('/simulator/scenarios', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      scenarioName: 'Audit Custom Expansion Scenario',
      villageId,
      parameters: simRun.body.data.parameters,
      notes: 'Created during automated verification'
    }
  });
  assert(savedScen.status === 201 && savedScen.body.data._id, 'NEW-4.3 Digital Twin: Save named scenario to MongoDB');

  const scenCsv = await request('/simulator/export-csv', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(
    scenCsv.status === 200 &&
      scenCsv.headers['content-type']?.includes('text/csv') &&
      scenCsv.body.includes('Audit Custom Expansion Scenario'),
    'NEW-4.4 Digital Twin: Export multi-scenario comparison CSV report'
  );

  const delScen = await request(`/simulator/scenarios/${savedScen.body.data._id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(delScen.status === 200, 'NEW-4.5 Digital Twin: Delete saved scenario');

  console.log('\n===============================================================');
  console.log(`EXTENDED AUDIT SUMMARY: ${report.passed}/${report.total} PASSED (${report.failed} FAILED)`);
  console.log('===============================================================');

  process.exit(report.failed > 0 ? 1 : 0);
}

runExtendedAudit().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
