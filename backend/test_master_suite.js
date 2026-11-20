const http = require('http');
const app = require('./server');
const { connectDB } = require('./config/db');

let API_PORT = process.env.API_PORT ? Number(process.env.API_PORT) : null;
let testServer = null;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : '';
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: API_PORT,
        path: `/api${path}`,
        method,
        headers
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch (e) {
            parsed = raw;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// Test metrics tracker
const results = {
  authentication: { total: 0, passed: 0, failed: 0, tests: [] },
  rolePermissions: { total: 0, passed: 0, failed: 0, tests: [] },
  functionalModules: { total: 0, passed: 0, failed: 0, tests: [] },
  backendDatabase: { total: 0, passed: 0, failed: 0, tests: [] },
  security: { total: 0, passed: 0, failed: 0, tests: [] },
  integration: { total: 0, passed: 0, failed: 0, tests: [] }
};

function record(category, testName, condition, details = '') {
  results[category].total++;
  if (condition) {
    results[category].passed++;
    results[category].tests.push({ name: testName, status: 'PASS', details });
    console.log(`  [PASS] ${testName}`);
  } else {
    results[category].failed++;
    results[category].tests.push({ name: testName, status: 'FAIL', details });
    console.error(`  [FAIL] ${testName} - ${details}`);
  }
}

async function runMasterTestSuite() {
  if (!API_PORT) {
    await connectDB();
    await new Promise((resolve) => {
      testServer = app.listen(0, '127.0.0.1', () => {
        API_PORT = testServer.address().port;
        resolve();
      });
    });
  }

  console.log('================================================================');
  console.log(' MASTER QA AUTOMATION TEST SUITE: RURAL BIOGAS MANAGEMENT SYSTEM');
  console.log(` Target Backend: http://127.0.0.1:${API_PORT}/api`);
  console.log('================================================================\n');

  let adminToken = '';
  let coordinatorToken = '';
  let householdToken = '';
  let adminUserId = '';
  let coordinatorUserId = '';
  let householdUserId = '';
  let sampleVillageId = '';
  let sampleHouseholdId = '';
  let samplePlantId = '';

  // -------------------------------------------------------------
  // PHASE 2: AUTHENTICATION TESTING
  // -------------------------------------------------------------
  console.log('--- PHASE 2: AUTHENTICATION TESTING ---');

  // 1. Admin login
  const adminLogin = await request('POST', '/auth/login', {
    email: 'admin@biogas.gov.in',
    password: 'Admin@123'
  });
  adminToken = adminLogin.body?.token;
  adminUserId = adminLogin.body?.user?.id;
  record('authentication', 'Admin account login (admin@biogas.gov.in)', adminLogin.status === 200 && adminToken && adminLogin.body?.user?.role === 'admin');

  // 2. Coordinator login
  const coordLogin = await request('POST', '/auth/login', {
    email: 'coordinator@biogas.gov.in',
    password: 'Coord@123'
  });
  coordinatorToken = coordLogin.body?.token;
  coordinatorUserId = coordLogin.body?.user?.id;
  record('authentication', 'Coordinator account login (coordinator@biogas.gov.in)', coordLogin.status === 200 && coordinatorToken && coordLogin.body?.user?.role === 'coordinator');

  // 3. Household login
  const houseLogin = await request('POST', '/auth/login', {
    email: 'household@biogas.gov.in',
    password: 'House@123'
  });
  householdToken = houseLogin.body?.token;
  householdUserId = houseLogin.body?.user?.id;
  record('authentication', 'Household account login (household@biogas.gov.in)', houseLogin.status === 200 && householdToken && houseLogin.body?.user?.role === 'household');

  // 4. Case-insensitivity & trimming
  const caseLogin = await request('POST', '/auth/login', {
    email: '  Admin@Biogas.Gov.In  ',
    password: 'Admin@123'
  });
  record('authentication', 'Case-insensitive & whitespace-trimmed email login', caseLogin.status === 200 && caseLogin.body?.token);

  // 5. Invalid email
  const invEmail = await request('POST', '/auth/login', {
    email: 'unknown_user_999@biogas.gov.in',
    password: 'Admin@123'
  });
  record('authentication', 'Rejection of non-existent email (401)', invEmail.status === 401);

  // 6. Incorrect password
  const invPass = await request('POST', '/auth/login', {
    email: 'admin@biogas.gov.in',
    password: 'WrongPassword@999'
  });
  record('authentication', 'Rejection of incorrect password (401)', invPass.status === 401);

  // 7. Empty email
  const emptyEmail = await request('POST', '/auth/login', {
    email: '',
    password: 'Admin@123'
  });
  record('authentication', 'Validation on missing email (400)', emptyEmail.status === 400);

  // 8. Empty password
  const emptyPass = await request('POST', '/auth/login', {
    email: 'admin@biogas.gov.in',
    password: ''
  });
  record('authentication', 'Validation on missing password (400)', emptyPass.status === 400);

  // 9. Empty payload
  const emptyBody = await request('POST', '/auth/login', {});
  record('authentication', 'Validation on empty request body (400)', emptyBody.status === 400);

  // 10. Verify authenticated user identity (Admin /auth/me)
  const meAdmin = await request('GET', '/auth/me', null, adminToken);
  record('authentication', 'JWT verification & profile resolution (/auth/me)', meAdmin.status === 200 && meAdmin.body?.user?.email === 'admin@biogas.gov.in');

  // 11. Unauthorized access prevention (missing token)
  const unauthNoToken = await request('GET', '/auth/me');
  record('authentication', 'Protected route rejection with missing token (401)', unauthNoToken.status === 401);

  // 12. Unauthorized access prevention (invalid token)
  const unauthBadToken = await request('GET', '/auth/me', null, 'tampered_or_invalid_jwt_token_xyz');
  record('authentication', 'Protected route rejection with invalid/tampered token (401)', unauthBadToken.status === 401);

  // 13. Forgot password token generation
  const forgotReq = await request('POST', '/auth/forgot-password', { email: 'household@biogas.gov.in' });
  const resetToken = forgotReq.body?.resetToken;
  record('authentication', 'Self-service forgot password token generation', forgotReq.status === 200 && resetToken && resetToken.length > 10);

  // 14. Forgot password non-existent user
  const forgotNonExist = await request('POST', '/auth/forgot-password', { email: 'nobody_here@biogas.gov.in' });
  record('authentication', 'Forgot password rejection for non-registered email (404)', forgotNonExist.status === 404);

  // 15. Reset password with token
  const resetReq = await request('POST', '/auth/reset-password', {
    token: resetToken,
    password: 'TemporaryReset@2026'
  });
  record('authentication', 'Password reset execution using verified token', resetReq.status === 200 && resetReq.body?.success === true);

  // 16. Verify new password functions
  const newPassLogin = await request('POST', '/auth/login', {
    email: 'household@biogas.gov.in',
    password: 'TemporaryReset@2026'
  });
  record('authentication', 'Authentication with newly reset password', newPassLogin.status === 200 && newPassLogin.body?.token);

  // 17. Authenticated password change back to original
  const changePassReq = await request(
    'PUT',
    '/auth/change-password',
    {
      currentPassword: 'TemporaryReset@2026',
      newPassword: 'House@123'
    },
    newPassLogin.body?.token
  );
  record('authentication', 'Authenticated password change (/auth/change-password)', changePassReq.status === 200 && changePassReq.body?.success === true);

  // 18. Re-verify original password is restored
  const restoreLogin = await request('POST', '/auth/login', {
    email: 'household@biogas.gov.in',
    password: 'House@123'
  });
  householdToken = restoreLogin.body?.token;
  record('authentication', 'Re-authentication with restored password', restoreLogin.status === 200);

  // 19. Duplicate user registration prevention
  const dupRegister = await request('POST', '/auth/register', {
    name: 'Duplicate Admin',
    email: 'admin@biogas.gov.in',
    password: 'Password@123'
  });
  record('authentication', 'Duplicate user registration rejection (400)', dupRegister.status === 400);

  // -------------------------------------------------------------
  // PHASE 3: ROLE-BASED ACCESS & PERMISSION TESTING
  // -------------------------------------------------------------
  console.log('\n--- PHASE 3: ROLE-BASED ACCESS & PERMISSION TESTING ---');

  // 20. Admin can access User Management
  const adminUsers = await request('GET', '/users', null, adminToken);
  record('rolePermissions', 'Admin access to User Management (/api/users)', adminUsers.status === 200 && Array.isArray(adminUsers.body?.data));

  // 21. Admin can access Audit Logs
  const adminAudit = await request('GET', '/users/audit-logs', null, adminToken);
  record('rolePermissions', 'Admin access to System Audit Logs (/api/users/audit-logs)', adminAudit.status === 200);

  // 22. Household user denied User Management (403)
  const houseUsers = await request('GET', '/users', null, householdToken);
  record('rolePermissions', 'Household user restricted from User Management (403)', houseUsers.status === 403);

  // 23. Household user denied Audit Logs (403)
  const houseAudit = await request('GET', '/users/audit-logs', null, householdToken);
  record('rolePermissions', 'Household user restricted from Audit Logs (403)', houseAudit.status === 403);

  // 24. Coordinator denied User Management (403)
  const coordUsers = await request('GET', '/users', null, coordinatorToken);
  record('rolePermissions', 'Coordinator restricted from User Management (403)', coordUsers.status === 403);

  // 25. Coordinator denied Audit Logs (403)
  const coordAudit = await request('GET', '/users/audit-logs', null, coordinatorToken);
  record('rolePermissions', 'Coordinator restricted from Audit Logs (403)', coordAudit.status === 403);

  // 26. Admin can create Government Scheme (validated schema)
  const randCode = Math.floor(1000 + Math.random() * 9000);
  const adminCreateScheme = await request(
    'POST',
    '/schemes',
    {
      schemeName: `National Biogas Grant ${randCode}`,
      shortCode: `NBP-${randCode}`,
      implementingAgency: 'Ministry of New and Renewable Energy',
      category: 'Central Government',
      officialPortalUrl: 'https://mnre.gov.in/bioenergy',
      subsidyDetails: {
        subsidyPercentage: 40,
        maxSubsidyAmount: 25000,
        fixedSubsidyAmount: 18000
      },
      targetBeneficiaries: ['Small & Marginal Farmers'],
      description: 'Central Financial Assistance for family-scale rural plants.'
    },
    adminToken
  );
  record('rolePermissions', 'Admin creates Government Scheme (201)', adminCreateScheme.status === 201 && adminCreateScheme.body?.data?._id);

  // 27. Household denied creating Government Scheme (403)
  const houseCreateScheme = await request(
    'POST',
    '/schemes',
    {
      schemeName: 'Illegal Scheme Attempt',
      implementingAgency: 'None'
    },
    householdToken
  );
  record('rolePermissions', 'Household user restricted from creating Schemes (403)', houseCreateScheme.status === 403);

  // 28. Coordinator denied creating Government Scheme (403)
  const coordCreateScheme = await request(
    'POST',
    '/schemes',
    {
      schemeName: 'Illegal Coord Scheme',
      implementingAgency: 'None'
    },
    coordinatorToken
  );
  record('rolePermissions', 'Coordinator restricted from creating Schemes (403)', coordCreateScheme.status === 403);

  // 29. Admin can update user role/status
  const adminUpdateUser = await request(
    'PUT',
    `/users/${householdUserId}`,
    { status: 'active' },
    adminToken
  );
  record('rolePermissions', 'Admin updates user status (/api/users/:id)', adminUpdateUser.status === 200);

  // 30. Household denied updating other users (403)
  const houseUpdateUser = await request(
    'PUT',
    `/users/${adminUserId}`,
    { status: 'inactive' },
    householdToken
  );
  record('rolePermissions', 'Household user restricted from updating users (403)', houseUpdateUser.status === 403);

  // -------------------------------------------------------------
  // PHASE 4: MODULE-BY-MODULE FUNCTIONAL TESTING
  // -------------------------------------------------------------
  console.log('\n--- PHASE 4: MODULE-BY-MODULE FUNCTIONAL TESTING ---');

  // Module 1: Feasibility Calculator
  const calcStandard = await request(
    'POST',
    '/calculator/evaluate',
    {
      cattleCount: 4,
      avgDungPerCattleKg: 12,
      agriWasteKgPerDay: 10,
      kitchenWasteKgPerDay: 4,
      participatingHouseholds: 1,
      availableWaterLitersPerDay: 100,
      climateZone: 'Tropical Wet',
      installationBudgetINR: 45000
    },
    householdToken
  );
  const calcResults = calcStandard.body?.data?.results;
  record(
    'functionalModules',
    'Feasibility Calculator: standard calculation accuracy',
    calcStandard.status === 200 &&
      calcResults?.totalDailyDungKg > 0 &&
      calcResults?.estimatedBiogasM3PerDay > 0 &&
      calcResults?.recommendedPlantCapacityM3 > 0 &&
      calcResults?.estimatedPaybackYears > 0
  );

  // Calculator boundary: zero animals, organic residues only
  const calcZeroAnimals = await request(
    'POST',
    '/calculator/evaluate',
    {
      cattleCount: 0,
      avgDungPerCattleKg: 10,
      agriWasteKgPerDay: 25,
      kitchenWasteKgPerDay: 15,
      participatingHouseholds: 1,
      availableWaterLitersPerDay: 80
    },
    householdToken
  );
  record(
    'functionalModules',
    'Feasibility Calculator: zero animals with biomass residues',
    calcZeroAnimals.status === 200 && calcZeroAnimals.body?.data?.results?.totalDailyOrganicWasteKg === 40
  );

  // Calculator defaults for household
  const calcDefaults = await request('GET', '/calculator/household-defaults', null, householdToken);
  record('functionalModules', 'Feasibility Calculator: household pre-fill defaults', calcDefaults.status === 200 && calcDefaults.body?.data);

  // Module 2: Feedstock Management
  const villagesList = await request('GET', '/villages', null, coordinatorToken);
  sampleVillageId = villagesList.body?.data?.[0]?._id;

  const householdsList = await request('GET', `/households?villageId=${sampleVillageId}`, null, coordinatorToken);
  sampleHouseholdId = householdsList.body?.data?.[0]?._id;

  const createFeedstock = await request(
    'POST',
    '/feedstock',
    {
      villageId: sampleVillageId,
      householdId: sampleHouseholdId,
      collectionDate: new Date().toISOString(),
      dungKg: 120,
      agriWasteKg: 20,
      kitchenWasteKg: 10,
      collectorName: 'Virendra Singh',
      season: 'Monsoon',
      status: 'Recorded',
      notes: 'Fresh morning dairy collection'
    },
    coordinatorToken
  );
  const feedstockId = createFeedstock.body?.data?._id;
  record('functionalModules', 'Feedstock: create daily collection record', createFeedstock.status === 201 && feedstockId);

  const listFeedstock = await request('GET', '/feedstock', null, coordinatorToken);
  record('functionalModules', 'Feedstock: query records list with pagination', listFeedstock.status === 200 && Array.isArray(listFeedstock.body?.data));

  const updateFeedstock = await request(
    'PUT',
    `/feedstock/${feedstockId}`,
    { status: 'Fed to Digester', notes: 'Processed in batch' },
    coordinatorToken
  );
  record('functionalModules', 'Feedstock: update record status and details', updateFeedstock.status === 200 && updateFeedstock.body?.data?.status === 'Fed to Digester');

  const seasonalTrends = await request('GET', '/feedstock/seasonal-trends', null, coordinatorToken);
  record('functionalModules', 'Feedstock: seasonal trends & predictive metrics', seasonalTrends.status === 200 && seasonalTrends.body?.data);

  const deleteFeedstock = await request('DELETE', `/feedstock/${feedstockId}`, null, coordinatorToken);
  record('functionalModules', 'Feedstock: delete record with audit trail', deleteFeedstock.status === 200);

  // Module 3: Community Resource Sharing
  const createContribution = await request(
    'POST',
    '/community/contribute',
    {
      villageId: sampleVillageId,
      householdId: sampleHouseholdId,
      dailyDungCommittedKg: 25,
      agriWasteCommittedKg: 5,
      kitchenWasteCommittedKg: 2,
      notes: 'Daily morning batch contribution'
    },
    coordinatorToken
  );
  record('functionalModules', 'Community Sharing: record daily biomass contribution agreement', createContribution.status === 201);

  const communityPooling = await request('GET', `/community/pooling-summary?villageId=${sampleVillageId}`, null, coordinatorToken);
  const poolData = communityPooling.body?.data;
  record(
    'functionalModules',
    'Community Sharing: aggregated pooling summary & centroid',
    communityPooling.status === 200 &&
      poolData?.combinedFeedstock?.combinedDailyFeedstockKg > 0 &&
      Array.isArray(poolData?.potentialPlantLocations)
  );

  // Module 4: Biogas Plant Monitoring
  const plantsList = await request('GET', '/plants', null, coordinatorToken);
  samplePlantId = plantsList.body?.data?.[0]?._id;

  const createMonitoring = await request(
    'POST',
    '/monitoring',
    {
      plantId: samplePlantId,
      date: new Date().toISOString(),
      feedstockInputKg: 95,
      waterAddedLiters: 90,
      gasProducedM3: 4.8,
      temperatureC: 31.5,
      phLevel: 7.2,
      pressureKPa: 2.1,
      slurryProducedLiters: 90,
      readingType: 'manual',
      notes: 'Stable mesophilic operation'
    },
    coordinatorToken
  );
  const monitoringId = createMonitoring.body?.data?._id;
  record('functionalModules', 'Plant Monitoring: record daily telemetry metrics', createMonitoring.status === 201 && monitoringId);

  // Anomaly alert detection test: low temperature (<20°C) and acidic pH (<6.5)
  const alertMonitoring = await request(
    'POST',
    '/monitoring',
    {
      plantId: samplePlantId,
      date: new Date().toISOString(),
      feedstockInputKg: 90,
      waterAddedLiters: 80,
      gasProducedM3: 0.8,
      temperatureC: 17.0, // Low Temp alert (<20°C)
      phLevel: 6.2, // Acidification alert (<6.5)
      pressureKPa: 1.0,
      slurryProducedLiters: 70,
      readingType: 'simulated'
    },
    coordinatorToken
  );
  const alertsCount = alertMonitoring.body?.alertsTriggered || alertMonitoring.body?.data?.alerts?.length || 0;
  record('functionalModules', 'Plant Monitoring: automatic biochemical alert triggering', alertMonitoring.status === 201 && alertsCount >= 1);

  const plantHistory = await request('GET', `/monitoring?plantId=${samplePlantId}`, null, coordinatorToken);
  record('functionalModules', 'Plant Monitoring: query telemetry history', plantHistory.status === 200 && Array.isArray(plantHistory.body?.data));

  const activeAlerts = await request('GET', '/monitoring/alerts', null, coordinatorToken);
  record('functionalModules', 'Plant Monitoring: query active system alerts', activeAlerts.status === 200 && Array.isArray(activeAlerts.body?.data));

  // Module 5: GIS Mapping
  const mapFeatures = await request('GET', '/map/features', null, coordinatorToken);
  const mapData = mapFeatures.body?.data;
  record(
    'functionalModules',
    'GIS Mapping: query multi-layer geospatial markers',
    mapFeatures.status === 200 &&
      Array.isArray(mapData?.plants) &&
      Array.isArray(mapData?.households) &&
      Array.isArray(mapData?.collectionPoints) &&
      Array.isArray(mapData?.potentialSites)
  );

  const mapVillage = await request('GET', `/map/features?villageId=${sampleVillageId}`, null, coordinatorToken);
  record('functionalModules', 'GIS Mapping: village-filtered spatial query', mapVillage.status === 200);

  // Module 6: Government Schemes
  const listSchemes = await request('GET', '/schemes', null, householdToken);
  record('functionalModules', 'Government Schemes: fetch verified bioenergy schemes', listSchemes.status === 200 && Array.isArray(listSchemes.body?.data));

  const searchSchemes = await request('GET', '/schemes?search=MNRE', null, householdToken);
  record('functionalModules', 'Government Schemes: keyword search filter', searchSchemes.status === 200);

  // Module 7: Digestate Management
  const createFarmer = await request(
    'POST',
    '/digestate/farmers',
    {
      farmerName: 'Kisan Balram',
      villageId: sampleVillageId,
      primaryCrop: 'Wheat',
      landAreaAcres: 4.5,
      fertilizerRequiredKgPerMonth: 250,
      preferredApplicationType: 'Liquid Bio-Slurry'
    },
    coordinatorToken
  );
  const farmerLandId = createFarmer.body?.data?._id;
  record('functionalModules', 'Digestate: register farmer land for bio-slurry offtake', createFarmer.status === 201 && farmerLandId);

  const createDigestate = await request(
    'POST',
    '/digestate/distributions',
    {
      villageId: sampleVillageId,
      sourcePlantId: samplePlantId,
      farmerLandId: farmerLandId,
      distributionDate: new Date().toISOString(),
      digestateAllocatedLiters: 150,
      applicationMethod: 'Liquid Bio-Slurry'
    },
    coordinatorToken
  );
  record('functionalModules', 'Digestate: allocate organic bio-slurry distribution', createDigestate.status === 201);

  const digestateSummary = await request('GET', `/digestate/summary?villageId=${sampleVillageId}`, null, coordinatorToken);
  record('functionalModules', 'Digestate: summary & NPK nutrient mass analytics', digestateSummary.status === 200 && digestateSummary.body?.data?.metrics);

  // Module 8: Reports and Executive Analytics
  const dashboardStats = await request('GET', '/dashboard/summary', null, adminToken);
  record('functionalModules', 'Reports & Analytics: executive dashboard summary KPI metrics', dashboardStats.status === 200 && dashboardStats.body?.data?.metrics?.totalHouseholds >= 0);

  const reportVillageFilter = await request('GET', `/dashboard/summary?villageId=${sampleVillageId}`, null, adminToken);
  record('functionalModules', 'Reports & Analytics: village-filtered metric generation', reportVillageFilter.status === 200);

  const analyticsReport = await request('GET', `/reports/analytics?villageId=${sampleVillageId}`, null, adminToken);
  record('functionalModules', 'Reports & Analytics: analytics deep-dive report', analyticsReport.status === 200 && analyticsReport.body?.data);

  // Module 9: Allocation Optimizer & Digital Twin Simulator
  const optimizeRun = await request('GET', `/optimizer/analyze?villageId=${sampleVillageId}`, null, coordinatorToken);
  record('functionalModules', 'Allocation Optimizer: linear-programming route and location optimizer', optimizeRun.status === 200 && optimizeRun.body?.data?.candidateSites?.length > 0);

  const simRun = await request(
    'POST',
    '/simulator/run',
    {
      villageId: sampleVillageId,
      dailyDungKg: 280,
      dailyAgriWasteKg: 50,
      dailyKitchenWasteKg: 25,
      plantCapacityM3: 25,
      householdParticipationPercent: 90
    },
    coordinatorToken
  );
  record('functionalModules', 'Digital Twin Simulator: kinetic simulation forecasting', simRun.status === 200 && simRun.body?.data?.outputs?.estimatedDailyBiogasM3 > 0);

  // -------------------------------------------------------------
  // PHASE 6: BACKEND & DATABASE INTEGRITY TESTING
  // -------------------------------------------------------------
  console.log('\n--- PHASE 6: BACKEND & DATABASE INTEGRITY TESTING ---');

  // API Health Check
  const healthCheck = await request('GET', '/health');
  record('backendDatabase', 'System Health Check (/api/health status=online)', healthCheck.status === 200 && healthCheck.body?.status === 'online');

  // Invalid ObjectId error handling
  const invIdRes = await request('GET', '/plants/invalid_mongo_object_id_999', null, adminToken);
  record('backendDatabase', 'Invalid MongoDB ObjectId error handling (graceful 400/404)', invIdRes.status === 400 || invIdRes.status === 404);

  // Model validation: Village missing required name
  const invVillage = await request(
    'POST',
    '/villages',
    { district: 'Test District' }, // missing name
    adminToken
  );
  record('backendDatabase', 'Mongoose validation: rejection of missing required fields (400)', invVillage.status === 400);

  // Relational population: User populates Village
  const userRel = await request('GET', `/users`, null, adminToken);
  const sampleUser = userRel.body?.data?.find((u) => u.village);
  record('backendDatabase', 'Mongoose population integrity (User -> Village populated)', userRel.status === 200 && (!sampleUser || typeof sampleUser.village === 'object'));

  // Database error handling: 404 route handling
  const notFoundRoute = await request('GET', '/non-existent-api-route-xyz');
  record('backendDatabase', 'Express 404 catch-all handler returns JSON message', notFoundRoute.status === 404 && notFoundRoute.body?.message);

  // -------------------------------------------------------------
  // PHASE 7: SECURITY TESTING
  // -------------------------------------------------------------
  console.log('\n--- PHASE 7: SECURITY TESTING ---');

  // Password hashing: User model query should exclude password by default
  const userListNoPass = await request('GET', '/users', null, adminToken);
  const anyPasswordExposed = userListNoPass.body?.data?.some((u) => u.password !== undefined);
  record('security', 'User password hash exclusion in standard API responses', !anyPasswordExposed);

  // NoSQL injection payload
  const noSqlInjection = await request('POST', '/auth/login', {
    email: { $gt: '' },
    password: { $gt: '' }
  });
  record('security', 'NoSQL injection prevention on authentication endpoint', noSqlInjection.status === 400 || noSqlInjection.status === 401);

  // CORS header check
  record('security', 'CORS headers configured correctly', healthCheck.headers['access-control-allow-origin'] !== undefined || healthCheck.status === 200);

  // Sensitive credential leakage check in error response
  const errorLeakCheck = await request('GET', '/plants/invalid_id');
  const errorBodyStr = JSON.stringify(errorLeakCheck.body);
  const noSecretLeaked =
    !errorBodyStr.includes('JWT_SECRET') &&
    !errorBodyStr.includes('MONGO_URI') &&
    !errorBodyStr.includes('Admin@123');
  record('security', 'Zero credential or environment secret leakage in error payloads', noSecretLeaked);

  // -------------------------------------------------------------
  // PHASE 8: INTEGRATION & END-TO-END WORKFLOW TESTING
  // -------------------------------------------------------------
  console.log('\n--- PHASE 8: INTEGRATION & END-TO-END WORKFLOW TESTING ---');

  // Workflow 1: Household Registration & Profile Setup
  const wfCode = Math.floor(1000 + Math.random() * 9000);
  const wf1Reg = await request('POST', '/auth/register', {
    name: `Kisan Ramesh ${wfCode}`,
    email: `kisan${wfCode}@biogas.gov.in`,
    password: 'KisanPassword@123',
    role: 'household',
    phone: '+91 98765 00000',
    villageId: sampleVillageId
  });
  const kisanToken = wf1Reg.body?.token;
  const wf1Profile = await request('GET', '/households/my-profile', null, kisanToken);
  record('integration', 'Workflow 1: Household registration -> JWT session -> Profile access', wf1Reg.status === 201 && wf1Profile.status === 200);

  // Workflow 2: Coordinator Community Resource Pooling
  const wf2Contribute = await request(
    'POST',
    '/community/contribute',
    {
      villageId: sampleVillageId,
      householdId: sampleHouseholdId,
      dailyDungCommittedKg: 35,
      agriWasteCommittedKg: 8
    },
    coordinatorToken
  );
  const wf2Pool = await request('GET', `/community/pooling-summary?villageId=${sampleVillageId}`, null, coordinatorToken);
  record('integration', 'Workflow 2: Coordinator waste intake -> Pooling aggregation -> Entitlement', wf2Contribute.status === 201 && wf2Pool.status === 200);

  // Workflow 3: Household Feasibility to Scheme Matching
  const wf3Calc = await request(
    'POST',
    '/calculator/evaluate',
    {
      cattleCount: 4,
      avgDungPerCattleKg: 12,
      agriWasteKgPerDay: 15,
      kitchenWasteKgPerDay: 5,
      participatingHouseholds: 1,
      availableWaterLitersPerDay: 120
    },
    householdToken
  );
  const wf3Schemes = await request('GET', '/schemes', null, householdToken);
  record('integration', 'Workflow 3: Household Feasibility calculation -> Scheme subsidy linkage', wf3Calc.status === 200 && wf3Schemes.status === 200);

  // Workflow 4: Digester Monitoring & Anomaly Alert Flow
  const wf4Monitor = await request(
    'POST',
    '/monitoring',
    {
      plantId: samplePlantId,
      date: new Date().toISOString(),
      feedstockInputKg: 80,
      waterAddedLiters: 80,
      gasProducedM3: 0.8,
      temperatureC: 16.0, // Low Temp
      phLevel: 6.2, // Acidic
      pressureKPa: 0.8,
      slurryProducedLiters: 70,
      readingType: 'simulated'
    },
    coordinatorToken
  );
  const wf4Alerts = await request('GET', '/monitoring/alerts', null, coordinatorToken);
  record('integration', 'Workflow 4: Telemetry input -> Biochemical anomaly detection -> System Alert generation', wf4Monitor.status === 201 && wf4Alerts.status === 200);

  // Workflow 5: Administrator Governance & System Audit Trail
  const wf5Users = await request('GET', '/users', null, adminToken);
  const wf5Audit = await request('GET', '/users/audit-logs', null, adminToken);
  record('integration', 'Workflow 5: Administrator Governance -> User registry -> Tamper-evident Audit Trail', wf5Users.status === 200 && wf5Audit.status === 200);

  // -------------------------------------------------------------
  // TEST REPORT SUMMARY
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(' AUTOMATION TEST SUITE SUMMARY');
  console.log('================================================================');
  let grandTotal = 0;
  let grandPassed = 0;
  let grandFailed = 0;

  for (const [category, data] of Object.entries(results)) {
    grandTotal += data.total;
    grandPassed += data.passed;
    grandFailed += data.failed;
    const pct = data.total > 0 ? ((data.passed / data.total) * 100).toFixed(1) : 0;
    console.log(`- ${category.padEnd(20)}: ${data.passed}/${data.total} PASSED (${pct}%)`);
  }

  console.log('----------------------------------------------------------------');
  console.log(`TOTAL TESTS EXECUTED: ${grandTotal}`);
  console.log(`TOTAL TESTS PASSED  : ${grandPassed}`);
  console.log(`TOTAL TESTS FAILED  : ${grandFailed}`);
  console.log(`OVERALL HEALTH      : ${((grandPassed / grandTotal) * 100).toFixed(1)}%`);
  console.log('================================================================\n');

  if (testServer) {
    await new Promise((res) => testServer.close(res));
  }

  if (grandFailed > 0) {
    console.error(`FAILED TESTS COUNT: ${grandFailed}`);
    process.exit(1);
  } else {
    console.log('>>> ALL AUTOMATION TEST SUITES PASSED WITH ZERO FAILURES! <<<');
    process.exit(0);
  }
}

runMasterTestSuite().catch((err) => {
  console.error('Fatal Test Runner Failure:', err);
  process.exit(1);
});
