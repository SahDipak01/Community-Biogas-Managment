const http = require('http');
const app = require('./server');
const { connectDB } = require('./config/db');

let server = null;
let port = 5055;

function req(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : '';
    const headers = {
      'Content-Type': 'application/json'
    };
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const r = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: `/api${path}`,
        method,
        headers
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch (e) {
            parsed = raw;
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}

async function runTests() {
  console.log('========================================================');
  console.log('   ADVANCED BIOGAS COMMUNITY SYSTEM VERIFICATION TEST   ');
  console.log('========================================================\n');

  await connectDB();
  server = app.listen(port);
  console.log(`Test server running on port ${port}\n`);

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const health = await req('GET', '/health');
    assert(health.status === 200 && health.body.status === 'online', '1. System Health API Online');

    // 2. Authentication of all 3 Roles
    const adminLogin = await req('POST', '/auth/login', {
      email: 'admin@biogas.gov.in',
      password: 'Admin@123'
    });
    assert(adminLogin.status === 200 && adminLogin.body.user.role === 'admin', '2. Admin Login Verified');
    const adminToken = adminLogin.body.token;

    const coordLogin = await req('POST', '/auth/login', {
      email: 'coordinator@biogas.gov.in',
      password: 'Coord@123'
    });
    assert(coordLogin.status === 200 && coordLogin.body.user.role === 'coordinator', '3. Coordinator Login Verified');
    const coordToken = coordLogin.body.token;

    const houseLogin = await req('POST', '/auth/login', {
      email: 'household@biogas.gov.in',
      password: 'House@123'
    });
    assert(houseLogin.status === 200 && houseLogin.body.user.role === 'household', '4. Household Login Verified');
    const houseToken = houseLogin.body.token;

    // 3. Smart Waste Collection Scheduling (Phase 2)
    const pickupReq = await req(
      'POST',
      '/waste-collection',
      {
        wasteTypes: ['Cattle Dung', 'Kitchen Organic Waste'],
        estimatedQuantityKg: 25,
        preferredDate: new Date().toISOString(),
        preferredTimeSlot: 'Morning (06:00 - 09:00)',
        pickupLocation: { landmark: 'Near dairy shed' },
        additionalInstructions: 'Collected in blue bin'
      },
      houseToken
    );
    assert(pickupReq.status === 201 && pickupReq.body.success, '5. Household Submit Waste Collection Request');
    const requestId = pickupReq.body.data._id;

    // Coordinator updates request status to Scheduled
    const updateReq = await req(
      'PUT',
      `/waste-collection/${requestId}/status`,
      {
        status: 'Scheduled',
        assignedWorker: { name: 'Raju Kumar', phone: '9876543210' }
      },
      coordToken
    );
    assert(updateReq.status === 200 && updateReq.body.data.status === 'Scheduled', '6. Coordinator Schedule & Assign Collection');

    // Coordinator records completion with actual kg
    const completeReq = await req(
      'POST',
      `/waste-collection/${requestId}/complete`,
      {
        actualCollectedKg: 28,
        notes: 'Weighed and verified on field scale'
      },
      coordToken
    );
    assert(completeReq.status === 200 && completeReq.body.data.status === 'Collected', '7. Coordinator Complete Pickup & Feedstock Log');

    // 4. Biogas Plant Breakdown Reporting (Phase 3)
    const breakdown = await req(
      'POST',
      '/breakdowns',
      {
        issueCategory: 'Low Gas Pressure',
        urgency: 'Medium',
        description: 'Pressure drop in secondary distribution line leading to household cluster'
      },
      coordToken
    );
    assert(breakdown.status === 201 && breakdown.body.success, '8. Report Plant Breakdown / Technical Issue');
    const breakdownId = breakdown.body.data._id;

    // Update status to Resolved
    const resolveBrk = await req(
      'PUT',
      `/breakdowns/${breakdownId}/status`,
      {
        status: 'Resolved',
        repairDetails: 'Replaced faulty secondary pressure diaphragm',
        repairCostInr: 450,
        downtimeHours: 2.5
      },
      coordToken
    );
    assert(resolveBrk.status === 200 && resolveBrk.body.data.status === 'Resolved', '9. Coordinator / Tech Resolve Breakdown');

    // Reopen Breakdown
    const reopenBrk = await req(
      'POST',
      `/breakdowns/${breakdownId}/reopen`,
      { reason: 'Pressure fluctuating again after evening peak demand' },
      houseToken
    );
    assert(reopenBrk.status === 200 && reopenBrk.body.data.status === 'Reported', '10. Reopen Unresolved Breakdown with Reason');

    // 5. Community Complaint & Grievance Management (Phase 5)
    const complaint = await req(
      'POST',
      '/complaints',
      {
        category: 'Waste Collection Service',
        subject: 'Scheduled pickup delayed by 2 hours',
        description: 'Pickup van arrived after morning milking routine',
        priority: 'Medium'
      },
      houseToken
    );
    assert(complaint.status === 201 && complaint.body.success, '11. Submit Community Grievance Ticket');
    const complaintId = complaint.body.data._id;

    const resolveCmp = await req(
      'PUT',
      `/complaints/${complaintId}/status`,
      {
        status: 'Resolved',
        resolutionNotes: 'Route driver adjusted collection sequence to prioritize dairy farms first'
      },
      coordToken
    );
    assert(resolveCmp.status === 200 && resolveCmp.body.data.status === 'Resolved', '12. Coordinator Resolve Grievance with Notes');

    const feedbackCmp = await req(
      'POST',
      `/complaints/${complaintId}/feedback`,
      { feedbackRating: 5, feedbackComments: 'Very satisfied with prompt resolution' },
      houseToken
    );
    assert(feedbackCmp.status === 200 && feedbackCmp.body.data.feedbackRating === 5, '13. Household Submit Satisfaction Feedback');

    // 6. Gas Supply Interruption Notices (Phase 6)
    const outage = await req(
      'POST',
      '/gas-interruptions',
      {
        interruptionType: 'Planned Maintenance',
        reason: 'Periodic descaling of digester slurry outlet pipe',
        affectedAreas: ['East Grid', 'Cluster 1'],
        startTime: new Date().toISOString(),
        estimatedRestoration: new Date(Date.now() + 7200000).toISOString()
      },
      coordToken
    );
    assert(outage.status === 201 && outage.body.success, '14. Coordinator Announce Planned Gas Interruption');
    const outageId = outage.body.data._id;

    const restoreOutage = await req(
      'PUT',
      `/gas-interruptions/${outageId}/status`,
      {
        status: 'Restored',
        restorationNotes: 'Descaling complete, gas pipeline repressurized to 1.8 kPa'
      },
      coordToken
    );
    assert(restoreOutage.status === 200 && restoreOutage.body.data.status === 'Restored', '15. Mark Gas Supply Restored & Broadcast Notice');

    // 7. Government Schemes & Subsidies (Phase 8)
    const schemes = await req('GET', '/schemes', null, houseToken);
    assert(schemes.status === 200 && schemes.body.data.length > 0, '16. Browse Official Government Schemes');
    const schemeId = schemes.body.data[0]._id;

    const applySub = await req(
      'POST',
      '/subsidies',
      {
        schemeId,
        plantCapacityRequestedM3: 2,
        householdCattleCount: 4
      },
      houseToken
    );
    assert(applySub.status === 201 && applySub.body.success, '17. Apply for Government Subsidy Assistance');
    const subAppId = applySub.body.data._id;

    const approveSub = await req(
      'PUT',
      `/subsidies/${subAppId}/status`,
      {
        status: 'Approved',
        approvedSubsidyAmountInr: 18000,
        coordinatorNotes: 'Cattle herd and land tenancy verified on site'
      },
      adminToken
    );
    assert(approveSub.status === 200 && approveSub.body.data.status === 'Approved', '18. Admin Approve Subsidy Application');

    // 8. Digestate & Bio-Slurry Marketplace (Phase 9)
    const batch = await req(
      'POST',
      '/digestate/batches',
      {
        volumeLiters: 1500,
        form: 'Liquid Bio-Slurry',
        qualityTesting: {
          tested: true,
          testDate: new Date(),
          phValue: 7.5,
          nitrogenPct: 1.9,
          phosphorusPct: 1.1,
          potassiumPct: 1.2,
          heavyMetalsPass: true
        }
      },
      coordToken
    );
    assert(batch.status === 201 && batch.body.success, '19. Coordinator Register Tested Bio-Slurry Batch');
    const batchId = batch.body.data._id;

    const reqSlurry = await req(
      'POST',
      `/digestate/batches/${batchId}/request`,
      { requestedLiters: 200 },
      houseToken
    );
    assert(reqSlurry.status === 200 && reqSlurry.body.data.allocatedLiters === 200, '20. Household Reserve Digestate Fertilizer Allocation');

    // 9. Financial Transparency, Receipts & Reversals (Phase 11)
    const txn = await req(
      'POST',
      '/finance/transactions',
      {
        transactionType: 'Household Contribution Credit',
        direction: 'Credit',
        amountInr: 300,
        notes: 'Monthly community biogas maintenance contribution'
      },
      coordToken
    );
    assert(txn.status === 201 && txn.body.data.receiptNumber.startsWith('RCP-'), '21. Record Financial Ledger Transaction & Receipt');
    const txnId = txn.body.data._id;

    const verifyTxn = await req(
      'PUT',
      `/finance/transactions/${txnId}/verify`,
      { status: 'Approved' },
      adminToken
    );
    assert(verifyTxn.status === 200 && verifyTxn.body.data.verificationStatus === 'Approved', '22. Admin Verify Financial Entry');

    const reverseTxn = await req(
      'POST',
      `/finance/transactions/${txnId}/reverse`,
      { reversalReason: 'Accounting adjustment for billing correction' },
      adminToken
    );
    assert(reverseTxn.status === 200 && reverseTxn.body.data.isReversal === true, '23. Admin Auditable Counter-Reversal Execution');

    // 10. Emergency Safety Alert (Phase 16)
    const emergency = await req(
      'POST',
      '/emergencies',
      {
        incidentType: 'Suspected Gas Leakage',
        severity: 'Critical Emergency',
        locationDescription: 'Main feeder valve manifold at North Street',
        details: 'Strong sulfur odor detected near manifold junction; audible whistling sound.'
      },
      houseToken
    );
    assert(emergency.status === 201 && emergency.body.safetyChecklist.length > 0, '24. Emergency Safety Alert & Immediate Safety Checklist');
    const emergencyId = emergency.body.data._id;

    const resolveEmg = await req(
      'PUT',
      `/emergencies/${emergencyId}/status`,
      { status: 'All Clear & Resolved' },
      coordToken
    );
    assert(resolveEmg.status === 200 && resolveEmg.body.data.status === 'All Clear & Resolved', '25. Coordinator Update Emergency to All-Clear');

    // 11. Offline Batch Sync (Phase 4)
    const clientOpId = `TEST-OP-${Date.now()}`;
    const syncOp = await req(
      'POST',
      '/sync/batch',
      {
        operations: [
          {
            clientOpId,
            entityType: 'DailyContributionLog',
            operation: 'CREATE',
            payload: {
              householdId: pickupReq.body.data.household,
              actualDungKg: 22,
              kitchenWasteKg: 2
            },
            clientTimestamp: new Date().toISOString()
          }
        ]
      },
      coordToken
    );
    assert(syncOp.status === 200 && syncOp.body.appliedCount === 1, '26. Idempotent Offline Sync Batch Processing');

    // Idempotent duplicate check
    const syncDup = await req(
      'POST',
      '/sync/batch',
      {
        operations: [
          {
            clientOpId,
            entityType: 'DailyContributionLog',
            operation: 'CREATE',
            payload: { actualDungKg: 22 }
          }
        ]
      },
      coordToken
    );
    assert(syncDup.status === 200 && syncDup.body.ignoredCount === 1, '27. Duplicate Offline Op Safely Ignored');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    if (server) {
      server.close();
      console.log('\nTest server shut down cleanly.');
    }
  }

  console.log('\n========================================================');
  console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED `);
  console.log('========================================================\n');
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
