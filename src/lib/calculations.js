// CommonJS / ES compatible calculations module
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

function calculateJobProduction(input) {
  const sheetConsumption = calculateSheetConsumption(
    input.goodPrints,
    input.wastage,
    input.reprint
  );
  const machineClicks = calculateMachineClicks(sheetConsumption, input.printSide);
  const { totalCost, gstAmount, grandTotalCost } = calculatePrintCost(
    machineClicks,
    input.unitRate,
    input.gstPercent !== undefined ? input.gstPercent : 18.0
  );

  const wastage = Math.max(0, Math.floor(input.wastage || 0));
  const wastagePercentage =
    sheetConsumption > 0
      ? Math.round((wastage / sheetConsumption) * 10000) / 100
      : 0;

  return {
    sheetConsumption,
    machineClicks,
    unitCost: Math.round(Number(input.unitRate) * 100) / 100,
    totalCost,
    gstAmount,
    grandTotalCost,
    wastagePercentage,
  };
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

function calculateWastagePercentage(totalWastage, totalSheets) {
  if (!totalSheets || totalSheets <= 0) return 0;
  return Math.round((totalWastage / totalSheets) * 10000) / 100;
}

module.exports = {
  calculateSheetConsumption,
  calculateMachineClicks,
  calculatePrintCost,
  calculateJobProduction,
  reconcileMachineCounter,
  calculateWastagePercentage,
};
