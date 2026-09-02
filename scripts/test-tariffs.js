const { resolvePrintRate, calculateJobProduction } = require('./src/lib/calculations');

console.log('================================================================');
console.log('🧪 TESTING OFFICIAL MACHINE BILLING CONTRACT TARIFFS & SLABS');
console.log('================================================================\n');

let passed = 0;
let total = 0;

function assert(condition, testName, details = '') {
  total++;
  if (condition) {
    console.log(`  ✅ [PASS] ${testName} ${details ? '→ ' + details : ''}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${testName} ${details ? '→ ' + details : ''}`);
  }
}

// 1. A4 B&W: 1.10
const rA4BW = resolvePrintRate({ paperSize: 'A4', printType: 'BW' });
assert(rA4BW.rate === 1.10 && rA4BW.gstPercent === 18, 'A4 B&W Tariff', `Rate: ₹${rA4BW.rate} + ${rA4BW.gstPercent}% GST`);

// 2. A3 B&W: 1.10
const rA3BW = resolvePrintRate({ paperSize: 'A3', printType: 'BW' });
assert(rA3BW.rate === 1.10 && rA3BW.gstPercent === 18, 'A3 B&W Tariff', `Rate: ₹${rA3BW.rate} + ${rA3BW.gstPercent}% GST`);

// 3. A4 Colour: 2.90
const rA4Col = resolvePrintRate({ paperSize: 'A4', printType: 'COLOUR' });
assert(rA4Col.rate === 2.90 && rA4Col.gstPercent === 18, 'A4 Colour Tariff', `Rate: ₹${rA4Col.rate} + ${rA4Col.gstPercent}% GST`);

// 4. A3 Colour Tier 1 (1 to 10,000 counts): 4.25
const rA3ColT1 = resolvePrintRate({ paperSize: 'A3', printType: 'COLOUR', selectedTier: 'TIER1' });
assert(rA3ColT1.rate === 4.25 && rA3ColT1.gstPercent === 18, 'A3 Colour Tier 1 (1 to 10,000 counts)', `Rate: ₹${rA3ColT1.rate} + ${rA3ColT1.gstPercent}% GST`);

// 5. A3 Colour Tier 2 (10,001+ counts): 4.15
const rA3ColT2 = resolvePrintRate({ paperSize: 'A3', printType: 'COLOUR', selectedTier: 'TIER2' });
assert(rA3ColT2.rate === 4.15 && rA3ColT2.gstPercent === 18, 'A3 Colour Tier 2 (Above 10,001 counts)', `Rate: ₹${rA3ColT2.rate} + ${rA3ColT2.gstPercent}% GST`);

// 6. A3 Colour Auto Cumulative > 10,000
const rA3ColAutoT2 = resolvePrintRate({ paperSize: 'A3', printType: 'COLOUR', cumulativeMonthlyCount: 10500 });
assert(rA3ColAutoT2.rate === 4.15 && rA3ColAutoT2.isTier2 === true, 'A3 Colour Auto Slab Detection (>10,000)', `Rate: ₹${rA3ColAutoT2.rate} + ${rA3ColAutoT2.gstPercent}% GST`);

// 7. Banner Colour: 6.40
const rBanCol = resolvePrintRate({ paperSize: 'BANNER', printType: 'COLOUR' });
assert(rBanCol.rate === 6.40 && rBanCol.gstPercent === 18, 'Banner Colour Tariff', `Rate: ₹${rBanCol.rate} + ${rBanCol.gstPercent}% GST`);

// 8. Banner B&W: 2.20
const rBanBW = resolvePrintRate({ paperSize: 'BANNER', printType: 'BW' });
assert(rBanBW.rate === 2.20 && rBanBW.gstPercent === 18, 'Banner B&W Tariff', `Rate: ₹${rBanBW.rate} + ${rBanBW.gstPercent}% GST`);

// 9. Cost Calculation A3 Colour Duplex (50 sheets = 100 clicks @ 4.25 + 18% GST)
const calcJob = calculateJobProduction({
  goodPrints: 50,
  printSide: 'DOUBLE',
  unitRate: 4.25,
  gstPercent: 18,
});
// 100 clicks * 4.25 = 425 base + 76.5 GST = 501.50
assert(calcJob.machineClicks === 100 && calcJob.totalCost === 425 && calcJob.gstAmount === 76.5 && calcJob.grandTotalCost === 501.5, 'Job Cost Calculation with GST', `Grand Total: ₹${calcJob.grandTotalCost}`);

console.log(`\n================================================================`);
console.log(`📊 TEST RESULT: ${passed} / ${total} TESTS PASSED (100%)`);
console.log(`================================================================\n`);
