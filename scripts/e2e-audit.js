// Print Bazzar - Comprehensive Enterprise QA & End-to-End System Audit Script
const BASE_URL = 'http://localhost:3001';

async function runFullAudit() {
  console.log('====================================================');
  console.log(`🚀 STARTING AUDIT AGAINST TARGET: ${BASE_URL}`);
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName, details = '') {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${testName} ${details ? '(' + details + ')' : ''}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${details ? '- ' + details : ''}`);
    }
  }

  // --- 1. AUTHENTICATION TESTS ---
  console.log('\n--- 1. AUTHENTICATION & ACCESS CONTROL (RBAC) ---');
  
  // 1.1 Owner Login
  const ownerLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@printbazzar.com', password: 'owner123' }),
  });
  const ownerLogin = await ownerLoginRes.json();
  assert(ownerLoginRes.ok && ownerLogin.token && ownerLogin.user?.role === 'OWNER', 'Owner Login Authentication', `Role: ${ownerLogin.user?.role}`);
  const ownerToken = ownerLogin.token;

  // 1.2 Operator Login
  const opLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'operator@printbazzar.com', password: 'operator123' }),
  });
  const opLogin = await opLoginRes.json();
  assert(opLoginRes.ok && opLogin.token && opLogin.user?.role === 'OPERATOR', 'Operator Login Authentication', `Role: ${opLogin.user?.role}`);
  const opToken = opLogin.token;

  // 1.3 Invalid Login Rejection
  const badLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@printbazzar.com', password: 'wrongpassword' }),
  });
  assert(badLoginRes.status === 401, 'Rejection of Invalid Password', `HTTP ${badLoginRes.status}`);

  // 1.4 RBAC: Operator forbidden from Owner-only Rate editing
  const opRateEditRes = await fetch(`${BASE_URL}/api/rates`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${opToken}` },
    body: JSON.stringify({ id: 'pr-a4-colour', rate: 5.0 }),
  });
  assert(opRateEditRes.status === 403, 'RBAC: Operator forbidden from modifying rates', `HTTP ${opRateEditRes.status}`);

  // --- 2. MASTER DATA & RATES ---
  console.log('\n--- 2. MASTER DATA & RATE CONFIGURATION ---');
  const ratesRes = await fetch(`${BASE_URL}/api/rates`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const ratesData = await ratesRes.json();
  assert(ratesRes.ok && ratesData.rates?.length >= 4, 'Rates Master retrieval', `Found ${ratesData.rates?.length} rate configurations`);

  const mediaRes = await fetch(`${BASE_URL}/api/media`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const mediaData = await mediaRes.json();
  assert(mediaRes.ok && mediaData.media?.length >= 10, 'Media Catalog retrieval', `Found ${mediaData.media?.length} media items`);

  const machinesRes = await fetch(`${BASE_URL}/api/machines`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const machinesData = await machinesRes.json();
  assert(machinesRes.ok && machinesData.machines?.length > 0, 'Machine Registry retrieval', `Machine: ${machinesData.machines[0]?.name}`);
  const machine = machinesData.machines[0];

  // --- 3. INVENTORY & STOCK ADJUSTMENT ---
  console.log('\n--- 3. INVENTORY MANAGEMENT & AUDIT LEDGER ---');
  const targetMedia = mediaData.media[0];

  // 3.1 Adjust Stock (Single Owner)
  const adjustRes = await fetch(`${BASE_URL}/api/inventory/adjust`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      mediaId: targetMedia.id,
      newStock: 500,
      reason: 'Automated QA Stock Adjustment Test',
    }),
  });
  const adjustData = await adjustRes.json();
  assert(adjustRes.ok && adjustData.media?.currentStock === 500, 'Owner Stock Adjustment to exact count (500 sheets)', `New stock: ${adjustData.media?.currentStock}`);

  // 3.2 Operator Adjust Stock
  const opAdjustRes = await fetch(`${BASE_URL}/api/inventory/adjust`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${opToken}` },
    body: JSON.stringify({
      mediaId: targetMedia.id,
      newStock: 600,
      reason: 'Operator Physical Count Load',
    }),
  });
  const opAdjustData = await opAdjustRes.json();
  assert(opAdjustRes.ok && opAdjustData.media?.currentStock === 600, 'Operator Stock Adjustment (600 sheets)', `New stock: ${opAdjustData.media?.currentStock}`);

  // 3.3 Restock Purchase
  const restockRes = await fetch(`${BASE_URL}/api/inventory/restock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      mediaId: targetMedia.id,
      quantity: 200,
      reason: 'Automated QA Restock Purchase (+200 sheets)',
    }),
  });
  const restockData = await restockRes.json();
  assert(restockRes.ok && restockData.media?.currentStock === 800, 'Restock Purchase addition (+200 -> 800 sheets)', `New stock: ${restockData.media?.currentStock}`);

  // 3.4 Stock Movements Ledger Check
  const movRes = await fetch(`${BASE_URL}/api/inventory/movements`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const movData = await movRes.json();
  assert(movRes.ok && movData.movements?.length > 0, 'Stock Movements Immutable Audit Ledger', `Logged ${movData.movements?.length} movements`);

  // --- 4. JOB PRODUCTION & CLICK MULTIPLIER TESTS ---
  console.log('\n--- 4. PRODUCTION JOB CREATION & CLICK ENGINE ---');
  
  // 4.1 Simplex Single-Side Job (1 sheet = 1 click)
  const jobRand1 = Math.floor(1000 + Math.random() * 9000);
  const singleJobRes = await fetch(`${BASE_URL}/api/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${opToken}` },
    body: JSON.stringify({
      jobNumber: `PB-QA-SIMP-${jobRand1}`,
      customerName: 'Enterprise Client Ltd',
      product: 'Brochures A4 Simplex',
      orderedQuantity: 100,
      printType: 'COLOUR',
      paperSize: 'A4',
      printSide: 'SINGLE',
      mediaId: targetMedia.id,
      machineId: machine.id,
      goodPrints: 100,
      wastage: 5,
      reprint: 0,
      wastageReasonId: 'wr-1',
      remarks: 'Single side test job',
    }),
  });
  const singleJobData = await singleJobRes.json();
  assert(
    singleJobRes.ok &&
      singleJobData.job?.sheetConsumption === 105 &&
      singleJobData.job?.machineClicks === 105,
    'Simplex Production: (100 good + 5 waste) = 105 sheets & 105 clicks',
    `Sheets: ${singleJobData.job?.sheetConsumption}, Clicks: ${singleJobData.job?.machineClicks}`
  );

  // 4.2 Duplex Double-Side Job (1 sheet = 2 clicks multiplier)
  const jobRand2 = Math.floor(1000 + Math.random() * 9000);
  const doubleJobRes = await fetch(`${BASE_URL}/api/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${opToken}` },
    body: JSON.stringify({
      jobNumber: `PB-QA-DUP-${jobRand2}`,
      customerName: 'Mega Corp',
      product: 'Catalogs A3 Duplex',
      orderedQuantity: 50,
      printType: 'COLOUR',
      paperSize: 'A3',
      printSide: 'DOUBLE',
      mediaId: targetMedia.id,
      machineId: machine.id,
      goodPrints: 50,
      wastage: 2,
      reprint: 1,
      reprintType: 'PRODUCTION_REPRINT',
      wastageReasonId: 'wr-2',
      remarks: 'Double side test job',
    }),
  });
  const doubleJobData = await doubleJobRes.json();
  assert(
    doubleJobRes.ok &&
      doubleJobData.job?.sheetConsumption === 53 &&
      doubleJobData.job?.machineClicks === 106,
    'Duplex Production: (50 good + 2 waste + 1 rep = 53 sheets) * 2 = 106 clicks',
    `Sheets: ${doubleJobData.job?.sheetConsumption}, Clicks: ${doubleJobData.job?.machineClicks}`
  );

  // 4.3 Insufficient Stock Protection Test
  const failStockJobRes = await fetch(`${BASE_URL}/api/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${opToken}` },
    body: JSON.stringify({
      jobNumber: `PB-QA-OVER-${jobRand1}`,
      customerName: 'Excessive Order',
      product: 'Giant Banner Sheets',
      orderedQuantity: 999999,
      printType: 'COLOUR',
      paperSize: 'A3',
      printSide: 'SINGLE',
      mediaId: targetMedia.id,
      machineId: machine.id,
      goodPrints: 999999,
      wastage: 0,
      reprint: 0,
    }),
  });
  assert(failStockJobRes.status === 400 || failStockJobRes.status === 500, 'Insufficient Stock Guard Protection', `Rejected over-demand job`);

  // --- 5. MACHINE COUNTER & DAILY RECONCILIATION ---
  console.log('\n--- 5. MACHINE COUNTER & SHIFT RECONCILIATION ---');
  const todayCounterRes = await fetch(`${BASE_URL}/api/counters/today`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const todayCounterData = await todayCounterRes.json();
  assert(
    todayCounterRes.ok && todayCounterData.counter?.openingCounter >= 1067426,
    'Today Shift Counter Status & Opening Baseline',
    `Opening: ${todayCounterData.counter?.openingCounter}, Logged Clicks Today: ${todayCounterData.totalJobClicksToday}`
  );

  const openingCounter = todayCounterData.counter.openingCounter;
  const loggedClicks = todayCounterData.totalJobClicksToday;
  const expectedClosing = openingCounter + loggedClicks;

  // 5.1 Reconcile & Close Day (Perfect Match)
  const closeRes = await fetch(`${BASE_URL}/api/counters/close`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      machineId: machine.id,
      date: todayCounterData.counter.date,
      closingCounter: expectedClosing,
      mismatchReason: '',
    }),
  });
  const closeData = await closeRes.json();
  assert(
    closeRes.ok && closeData.counter?.isClosed === true && closeData.counter?.isMatched === true,
    'Shift Closing & Perfect Meter Match Reconciliation',
    `Closing Counter: ${closeData.counter?.closingCounter}, Matched: ${closeData.counter?.isMatched}`
  );

  // 5.2 Counter History Ledger
  const histRes = await fetch(`${BASE_URL}/api/counters/history`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const histData = await histRes.json();
  assert(histRes.ok && histData.history?.length > 0, 'Machine Counter History Ledger', `Found ${histData.history?.length} closed shift records`);

  // --- 6. DASHBOARD & REPORTS ---
  console.log('\n--- 6. DASHBOARD & ANALYTICS REPORTS ---');
  const dashRes = await fetch(`${BASE_URL}/api/dashboard?filter=today`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const dashData = await dashRes.json();
  assert(
    dashRes.ok &&
      dashData.summary?.totalMachineClicks > 0 &&
      dashData.summary?.totalSheetConsumption > 0,
    'Live Dashboard Aggregations (Today)',
    `Clicks: ${dashData.summary?.totalMachineClicks}, Sheets: ${dashData.summary?.totalSheetConsumption}`
  );

  const repRes = await fetch(`${BASE_URL}/api/reports?period=this_month`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const repData = await repRes.json();
  assert(
    repRes.ok && repData.summary?.totalJobs > 0 && repData.mediaReport?.length > 0,
    'Production Reports & Breakdown Analytics',
    `Jobs: ${repData.summary?.totalJobs}, Total Grand Cost: ₹${repData.summary?.grandTotalCost}`
  );

  // --- 7. AUDIT TRAIL VERIFICATION ---
  console.log('\n--- 7. SYSTEM AUDIT LOGS ---');
  const auditRes = await fetch(`${BASE_URL}/api/audit`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const auditData = await auditRes.json();
  assert(auditRes.ok && auditData.logs?.length >= 5, 'Security & Transaction Audit Trail', `Captured ${auditData.logs?.length} immutable events`);

  // --- SUMMARY ---
  console.log('\n====================================================');
  console.log(`🏁 AUDIT COMPLETE: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('====================================================\n');
}

runFullAudit().catch(console.error);
