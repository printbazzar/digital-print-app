// Comprehensive End-to-End Workflow Integration Test
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

// Load business modules
const {
  calculateSheetConsumption,
  calculateMachineClicks,
  calculateJobProduction,
  reconcileMachineCounter,
} = require('../src/lib/calculations');

describe('Full Production Workflow & Reconciliation Suite', () => {
  it('Simulates shift production: double-side clicks and sheet consumption', () => {
    // Job 1: 100 good, 10 wastage, 5 reprint, Double side, A3 Colour
    const job1 = calculateJobProduction({
      goodPrints: 100,
      wastage: 10,
      reprint: 5,
      printSide: 'DOUBLE',
      unitRate: 4.25,
      gstPercent: 18.0,
    });

    assert.equal(job1.sheetConsumption, 115, 'Sheet consumption should be 115');
    assert.equal(job1.machineClicks, 230, 'Double side machine clicks should be 230');
    assert.equal(job1.totalCost, 977.5, 'Base cost = 230 * 4.25 = 977.5');
    assert.equal(job1.gstAmount, 175.95, 'GST 18% = 175.95');
    assert.equal(job1.grandTotalCost, 1153.45, 'Grand total = 1153.45');
  });

  it('Simulates shift production: single-side clicks and stock deduction', () => {
    // Job 2: 50 good, 0 wastage, 0 reprint, Single side, A4 B&W
    const job2 = calculateJobProduction({
      goodPrints: 50,
      wastage: 0,
      reprint: 0,
      printSide: 'SINGLE',
      unitRate: 1.10,
      gstPercent: 18.0,
    });

    assert.equal(job2.sheetConsumption, 50, 'Single side sheets consumed = 50');
    assert.equal(job2.machineClicks, 50, 'Single side clicks = 50');
    assert.equal(job2.totalCost, 55.0, 'Base cost = 55.0');
    assert.equal(job2.grandTotalCost, 64.9, 'Grand cost with GST = 64.9');
  });

  it('Reconciles total shift clicks against physical Konica C3070 meter', () => {
    const openingMeter = 1067426;
    const totalShiftJobClicks = 230 + 50; // 280 clicks

    // Scenario A: Meter displays exact matching clicks (1,067,706)
    const exactMatch = reconcileMachineCounter({
      openingCounter: openingMeter,
      closingCounter: 1067706,
      totalJobClicks: totalShiftJobClicks,
    });
    assert.equal(exactMatch.machinePrintCount, 280);
    assert.equal(exactMatch.difference, 0);
    assert.equal(exactMatch.isMatched, true);
    assert.equal(exactMatch.requiresReason, false);

    // Scenario B: Physical meter shows 290 clicks (+10 mismatch due to test prints)
    const mismatch = reconcileMachineCounter({
      openingCounter: openingMeter,
      closingCounter: 1067716,
      totalJobClicks: totalShiftJobClicks,
    });
    assert.equal(mismatch.machinePrintCount, 290);
    assert.equal(mismatch.difference, 10);
    assert.equal(mismatch.isMatched, false);
    assert.equal(mismatch.requiresReason, true);
  });
});
