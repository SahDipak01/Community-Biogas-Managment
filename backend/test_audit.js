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
    const req = http.request(
      url,
      {
        method,
        headers
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => (rawData += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(rawData);
          } catch {
            parsed = rawData;
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed
          });
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (body) req.write(body);
    req.end();
  });
}

async function runAudit() {
  const auditReport = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    details: []
  };

  function assert(condition, testName, meta = '') {
    auditReport.totalTests++;
    if (condition) {
      auditReport.passed++;
      auditReport.details.push({ test: testName, status: 'PASS', meta });
      console.log(`[PASS] ${testName}`);
    } else {
      auditReport.failed++;
      auditReport.details.push({ test: testName, status: 'FAIL', meta });
      console.error(`[FAIL] ${testName} - ${meta}`);
    }
  }

  console.log('=====================================================');
  console.log('STARTING AUTOMATED SYSTEM-WIDE COMPREHENSIVE AUDIT');
  console.log('=====================================================\n');

  try {
    // 1. Healthcheck
    const health = await request('/health');
    assert(health.status === 200 && health.body.status === 'online', '1. System Healthcheck API responds 200 OK');

    // 2. Auth Tests
    const adminLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'admin@biogas.gov.in', password: 'Admin@123' }
    });
    assert(adminLogin.status === 200 && adminLogin.body.token, '2.1 Admin Authentication & JWT Generation');
    const adminToken = adminLogin.body.token;

    const coordLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'coordinator@biogas.gov.in', password: 'Coord@123' }
    });
    assert(coordLogin.status === 200 && coordLogin.body.token, '2.2 Coordinator Authentication & JWT Generation');
    const coordToken = coordLogin.body.token;

    const houseLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'household@biogas.gov.in', password: 'House@123' }
    });
    assert(houseLogin.status === 200 && houseLogin.body.token, '2.3 Household User Authentication & JWT Generation');
    const houseToken = houseLogin.body.token;

    // Bad password test
    const badLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'admin@biogas.gov.in', password: 'WrongPassword' }
    });
    assert(badLogin.status === 401, '2.4 Rejection of Invalid Password with 401 Unauthorized');

    // Register new household
    const testEmail = `audit_${Date.now()}@test.com`;
    const regRes = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Audit Test Farmer',
        email: testEmail,
        password: 'Password@123',
        role: 'household',
        phone: '+91 99999 88888'
      }
    });
    assert(regRes.status === 201 && regRes.body.token, '2.5 User Self-Registration Endpoint');

    // Duplicate registration check
    const dupRes = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Duplicate Farmer',
        email: testEmail,
        password: 'Password@123',
        role: 'household'
      }
    });
    assert(dupRes.status === 400, '2.6 Prevention of Duplicate Email Registration (400 Bad Request)');

    // 3. Role-Based Access Control (RBAC) Guard Verification
    const adminOnlyUsers = await request('/users', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminOnlyUsers.status === 200, '3.1 Admin Allowed Access to User Governance');

    const houseForbiddenUsers = await request('/users', {
      headers: { Authorization: `Bearer ${houseToken}` }
    });
    assert(houseForbiddenUsers.status === 403, '3.2 Household Role Blocked from User Governance (403 Forbidden)');

    const unauthUsers = await request('/users');
    assert(unauthUsers.status === 401, '3.3 Unauthenticated Request Blocked (401 Unauthorized)');

    // 4. Feasibility Calculator Rigorous Testing (3 Profiles)
    // Profile A: Highly Feasible
    const calcA = await request('/calculator/evaluate', {
      method: 'POST',
      body: {
        cattleCount: 6,
        cattleBreakdown: { Cow: 4, Buffalo: 2 }, // 4*11 + 2*16 = 76 kg dung
        agriWasteKgPerDay: 15,
        kitchenWasteKgPerDay: 4,
        participatingHouseholds: 1,
        availableWaterLitersPerDay: 100,
        installationBudgetINR: 70000
      }
    });
    assert(
      calcA.status === 200 &&
      calcA.body.data.results.feasibilityResult === 'Highly Feasible' &&
      calcA.body.data.results.recommendedPlantCapacityM3 >= 3 &&
      calcA.body.data.results.estimatedPaybackYears < 3.0,
      '4.1 Calculator Profile A: Highly Feasible (High dung & water adequate)'
    );

    // Profile B: Moderately Feasible
    const calcB = await request('/calculator/evaluate', {
      method: 'POST',
      body: {
        cattleCount: 2,
        cattleBreakdown: { Cow: 2 }, // 22 kg dung
        agriWasteKgPerDay: 5,
        kitchenWasteKgPerDay: 2,
        participatingHouseholds: 1,
        availableWaterLitersPerDay: 15, // Deficit water
        installationBudgetINR: 30000
      }
    });
    assert(
      calcB.status === 200 &&
      calcB.body.data.results.feasibilityResult === 'Moderately Feasible' &&
      calcB.body.data.results.waterAdequacyPercent < 80,
      '4.2 Calculator Profile B: Moderately Feasible (Borderline dung & water constraint)'
    );

    // Profile C: Not Feasible
    const calcC = await request('/calculator/evaluate', {
      method: 'POST',
      body: {
        cattleCount: 1,
        cattleBreakdown: { Calf: 1 }, // 5 kg dung
        agriWasteKgPerDay: 2,
        kitchenWasteKgPerDay: 1,
        participatingHouseholds: 1,
        availableWaterLitersPerDay: 5,
        installationBudgetINR: 10000
      }
    });
    assert(
      calcC.status === 200 &&
      calcC.body.data.results.feasibilityResult === 'Not Feasible',
      '4.3 Calculator Profile C: Not Feasible (Critically inadequate biomass)'
    );

    // 5. Dashboard Summary Endpoint
    const dashRes = await request('/dashboard/summary', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const m = dashRes.body.data.metrics;
    assert(
      dashRes.status === 200 &&
      m.totalHouseholds > 0 &&
      m.totalCattle > 0 &&
      m.totalPlants > 0 &&
      m.estimatedMonthlySavingsINR > 0,
      '5.1 Dashboard Dynamic Metrics Calculation'
    );

    // 6. Feedstock Management CRUD & Filtering
    const feedstockList = await request('/feedstock', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(feedstockList.status === 200 && feedstockList.body.data.length > 0, '6.1 Feedstock Logs Querying');

    // Create daily feedstock entry
    const villagesRes = await request('/villages');
    const firstVillageId = villagesRes.body.data[0]._id;

    const newFeedstock = await request('/feedstock', {
      method: 'POST',
      headers: { Authorization: `Bearer ${coordToken}` },
      body: {
        villageId: firstVillageId,
        dungKg: 65,
        agriWasteKg: 12,
        kitchenWasteKg: 5,
        season: 'Summer',
        status: 'Fed to Digester'
      }
    });
    assert(newFeedstock.status === 201 && newFeedstock.body.data.totalKg === 82, '6.2 Feedstock Logging with Auto-Total Computation (82 kg)');

    // 7. Community Resource Pooling & Centroid Evaluation
    const poolRes = await request(`/community/pooling-summary?villageId=${firstVillageId}`, {
      headers: { Authorization: `Bearer ${coordToken}` }
    });
    assert(
      poolRes.status === 200 &&
      poolRes.body.data.combinedFeedstock.combinedDailyFeedstockKg > 0 &&
      poolRes.body.data.potentialPlantLocations.length > 0,
      '7.1 Community Waste Pooling & Centroid Location Finding'
    );

    // 8. Plant Monitoring & Biochemical Alert Engine
    const plantsRes = await request('/plants', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const testPlantId = plantsRes.body.data[0]._id;

    // Record reading with low temperature anomaly (< 20°C) and check alert trigger
    const alertReading = await request('/monitoring', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        plantId: testPlantId,
        feedstockInputKg: 50,
        gasProducedM3: 1.2,
        temperatureC: 17.5, // Below 20°C!
        phLevel: 7.1,
        readingType: 'manual',
        notes: 'Cold night ambient test'
      }
    });
    assert(
      alertReading.status === 201 &&
      alertReading.body.alertsTriggered > 0 &&
      alertReading.body.data.operationalStatus !== 'Normal',
      '8.1 Biochemical Alert Engine: Triggers Low Temperature Alarm (<20°C)'
    );

    // Verify Notification generated
    const notifs = await request('/notifications', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(notifs.status === 200 && notifs.body.data.length > 0, '8.2 Automated Alarm Notification Creation');

    // 9. Geographical Mapping GeoJSON Features
    const mapFeatures = await request('/map/features');
    assert(
      mapFeatures.status === 200 &&
      mapFeatures.body.data.plants.length > 0 &&
      mapFeatures.body.data.households.length > 0 &&
      mapFeatures.body.data.potentialSites.length > 0,
      '9.1 Spatial GIS Mapping: Complete Features Layer'
    );

    // 10. Government Schemes CRUD
    const newScheme = await request('/schemes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        schemeName: 'Audit Test Scheme 2026',
        shortCode: `TEST-SCH-${Date.now()}`,
        implementingAgency: 'Department of Bioenergy Audit',
        subsidyDetails: {
          subsidyPercentage: 50,
          maxSubsidyAmount: 25000,
          subsidyStructure: 'Direct Bank Transfer'
        },
        eligiblePlantSizesM3: [2, 3, 4],
        eligibilityCriteria: ['Test criteria A'],
        requiredDocuments: ['Aadhaar'],
        officialPortalUrl: 'https://test.gov.in'
      }
    });
    assert(newScheme.status === 201 && newScheme.body.data._id, '10.1 Government Scheme Admin Creation (CRUD Create)');
    const createdSchemeId = newScheme.body.data._id;

    const delScheme = await request(`/schemes/${createdSchemeId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(delScheme.status === 200, '10.2 Government Scheme Admin Deletion (CRUD Delete)');

    // 11. Reports & CSV Export
    const analytics = await request('/reports/analytics', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(
      analytics.status === 200 &&
      analytics.body.data.villageSummaries.length > 0 &&
      analytics.body.data.monthlyComparison.length === 12,
      '11.1 Analytics 12-Month Auditing Engine'
    );

    const csvExport = await request('/reports/export-csv?type=village_summary', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(
      csvExport.status === 200 &&
      csvExport.headers['content-type']?.includes('text/csv') &&
      csvExport.body.includes('Village Name'),
      '11.2 CSV Report Generation & File Streaming'
    );

  } catch (error) {
    console.error('Fatal audit execution error:', error);
  }

  console.log('\n=====================================================');
  console.log(`AUDIT SUMMARY: ${auditReport.passed}/${auditReport.totalTests} TESTS PASSED (${auditReport.failed} FAILED)`);
  console.log('=====================================================');

  return auditReport;
}

runAudit().then(report => {
  if (report.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
});
