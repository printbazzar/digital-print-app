// Unit Tests for Print Bazzar Business Calculations Engine
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Basic JS mirror of calculations for testing
function calculateSheetConsumption(goodPrints, wastage = 0, reprint = 0) {
  const g = Math.max(0, Math.floor(goodPrints || 0));
  const w = Math.max(0, Math.floor(wastage || 0));
  const r = Math.max(0, Math.floor(reprint || 0));
  return g + w + r;
}

function calculateMachineClicks(sheetConsumption, printSide) {
  const sheets = Math.max(0, Math.floor(sheetConsumption || 0));
  const multiplier = printSide === 'DOUBLE' ? 2 : 1;
  return sheets * multiplier;
}

function calculatePrintCost(machineClicks, unitRate, gstPercent = 18.0) {
  const clicks = Math.max(0, Math.floor(machineClicks || 0));
  const rate = Math.max(0, Number(unitRate) || 0);
  const gst = Math.max(0, Number(gstPercent) || 0);

  const rawTotal = clicks * rate;
  const totalCost = Math.round(rawTotal * 100) / 100;
  const rawGst = totalCost * (gst / 100);
  const gstAmount = Math.round(rawGst * 100) / 100;
  const grandTotalCost = Math.round((totalCost + gstAmount) * 100) / 100;

  return { totalCost, gstAmount, grandTotalCost };
}

function reconcileMachineCounter(input) {
  const opening = Math.max(0, Math.floor(input.openingCounter || 0));
  const closing = Math.max(0, Math.floor(input.closingCounter || 0));
  const jobClicks = Math.max(0, Math.floor(input.totalJobClicks || 0));

  const machinePrintCount = Math.max(0, closing - opening);
  const difference = machinePrintCount - jobClicks;
  const isMatched = difference === 0;

  return {
    machinePrintCount,
    totalJobClicks: jobClicks,
    difference,
    isMatched,
    requiresReason: !isMatched,
  };
}

describe('Print Bazzar Core Calculations Engine', () => {
  it('Requirement #11: Single side consumes 1 sheet and generates 1 machine click', () => {
    const sheets = 100;
    const clicks = calculateMachineClicks(sheets, 'SINGLE');
    assert.equal(clicks, 100);
  });

  it('Requirement #11: Double side consumes 1 sheet and generates 2 machine clicks', () => {
    const sheets = 100;
    const clicks = calculateMachineClicks(sheets, 'DOUBLE');
    assert.equal(clicks, 200);
  });

  it('Requirement #12: Sheet consumption combines good prints, wastage, and reprints', () => {
    const consumption = calculateSheetConsumption(100, 10, 5);
    assert.equal(consumption, 115);
  });

  it('Requirement #10 & #35: Cost calculation with standard GST rates', () => {
    // A4 Colour: 200 clicks @ 2.90 + 18% GST
    const cost = calculatePrintCost(200, 2.90, 18.0);
    assert.equal(cost.totalCost, 580.0);
    assert.equal(cost.gstAmount, 104.4);
    assert.equal(cost.grandTotalCost, 684.4);
  });

  it('Requirement #55: Machine Counter test case (100000 to 100650 -> 650)', () => {
    const res = reconcileMachineCounter({
      openingCounter: 100000,
      closingCounter: 100650,
      totalJobClicks: 650,
    });
    assert.equal(res.machinePrintCount, 650);
    assert.equal(res.isMatched, true);
    assert.equal(res.difference, 0);
  });

  it('Requirement #56: Important Test Case - Opening 1,067,426, Closing 1,067,626 (200 clicks)', () => {
    // Scenario 1: Matched 200 clicks
    const matched = reconcileMachineCounter({
      openingCounter: 1067426,
      closingCounter: 1067626,
      totalJobClicks: 200,
    });
    assert.equal(matched.machinePrintCount, 200);
    assert.equal(matched.isMatched, true);
    assert.equal(matched.requiresReason, false);

    // Scenario 2: Mismatched 190 clicks recorded in jobs (Difference = 10)
    const mismatched = reconcileMachineCounter({
      openingCounter: 1067426,
      closingCounter: 1067626,
      totalJobClicks: 190,
    });
    assert.equal(mismatched.machinePrintCount, 200);
    assert.equal(mismatched.totalJobClicks, 190);
    assert.equal(mismatched.difference, 10);
    assert.equal(mismatched.isMatched, false);
    assert.equal(mismatched.requiresReason, true);
  });
});
