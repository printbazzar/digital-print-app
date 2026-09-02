// Print Bazzar - Core Business Calculation Engine
// Authoritative calculation functions for Digital Printing Production

export type PrintSide = 'SINGLE' | 'DOUBLE';
export type PaperSize = 'A4' | 'A3' | 'BANNER';
export type PrintType = 'COLOUR' | 'BW';

export interface PrintRateTierInfo {
  rate: number;
  gstPercent: number;
  tierLabel: string;
  isTier2: boolean;
}

/**
 * Resolves standard unit rate according to Konica Minolta machine billing contract:
 * - A4 & A3 B&W: ₹1.10 + 18% GST
 * - A4 Colour: ₹2.90 + 18% GST
 * - A3 Colour (1-10,000 counts): ₹4.25 + 18% GST
 * - A3 Colour (10,001+ counts): ₹4.15 + 18% GST
 * - Banner Colour: ₹6.40 + 18% GST
 * - Banner B&W: ₹2.20 + 18% GST
 */
export function resolvePrintRate(options: {
  paperSize: PaperSize;
  printType: PrintType;
  selectedTier?: 'TIER1' | 'TIER2' | 'AUTO';
  cumulativeMonthlyCount?: number;
  dbRates?: Array<{
    paperSize: PaperSize | string;
    printType: PrintType | string;
    rate: number;
    tier2Rate?: number | null;
    tierThreshold?: number | null;
    gstPercent?: number;
  }>;
}): PrintRateTierInfo {
  const { paperSize, printType, selectedTier = 'AUTO', cumulativeMonthlyCount = 0, dbRates } = options;

  const dbRate = dbRates?.find((r) => r.paperSize === paperSize && r.printType === printType);

  let baseRate = dbRate ? Number(dbRate.rate) : (paperSize === 'BANNER' ? (printType === 'COLOUR' ? 6.40 : 2.20) : (paperSize === 'A4' ? (printType === 'COLOUR' ? 2.90 : 1.10) : (printType === 'COLOUR' ? 4.25 : 1.10)));
  let tier2Rate = dbRate?.tier2Rate !== undefined && dbRate?.tier2Rate !== null ? Number(dbRate.tier2Rate) : (paperSize === 'A3' && printType === 'COLOUR' ? 4.15 : baseRate);
  let threshold = dbRate?.tierThreshold ?? 10000;
  let gstPercent = dbRate?.gstPercent !== undefined ? Number(dbRate.gstPercent) : 18.0;

  // Determine if Tier 2 (Volume discount > 10,000) applies
  let isTier2 = false;
  if (paperSize === 'A3' && printType === 'COLOUR') {
    if (selectedTier === 'TIER2') {
      isTier2 = true;
    } else if (selectedTier === 'TIER1') {
      isTier2 = false;
    } else {
      isTier2 = cumulativeMonthlyCount > threshold;
    }
  }

  const activeRate = isTier2 ? tier2Rate : baseRate;
  let tierLabel = `${paperSize} ${printType}`;
  if (paperSize === 'A3' && printType === 'COLOUR') {
    tierLabel = isTier2
      ? `A3 Colour (10,001+ Counts Slab @ ₹${activeRate.toFixed(2)} + 18% GST)`
      : `A3 Colour (1 - 10,000 Counts Slab @ ₹${activeRate.toFixed(2)} + 18% GST)`;
  } else if (paperSize === 'BANNER') {
    tierLabel = `Banner ${printType === 'COLOUR' ? 'Colour' : 'B&W'} (₹${activeRate.toFixed(2)} + 18% GST)`;
  } else {
    tierLabel = `${paperSize} ${printType === 'COLOUR' ? 'Colour' : 'B&W'} (₹${activeRate.toFixed(2)} + 18% GST)`;
  }

  return {
    rate: activeRate,
    gstPercent,
    tierLabel,
    isTier2,
  };
}

export interface ProductionCalculationInput {
  goodPrints: number;
  wastage?: number;
  reprint?: number;
  printSide: PrintSide;
  unitRate: number; // rate before GST
  gstPercent?: number; // default 18%
}

export interface ProductionCalculationResult {
  sheetConsumption: number;
  machineClicks: number;
  unitCost: number;
  totalCost: number;
  gstAmount: number;
  grandTotalCost: number;
  wastagePercentage: number;
}

export interface CounterReconciliationInput {
  openingCounter: number;
  closingCounter: number;
  totalJobClicks: number;
}

export interface CounterReconciliationResult {
  machinePrintCount: number;
  totalJobClicks: number;
  difference: number;
  isMatched: boolean;
  requiresReason: boolean;
}

/**
 * Calculates physical sheet consumption from good prints, wastage, and reprint.
 */
export function calculateSheetConsumption(
  goodPrints: number,
  wastage: number = 0,
  reprint: number = 0
): number {
  const g = Math.max(0, Math.floor(goodPrints || 0));
  const w = Math.max(0, Math.floor(wastage || 0));
  const r = Math.max(0, Math.floor(reprint || 0));
  return g + w + r;
}

/**
 * Calculates machine clicks from sheet count and simplex/duplex side.
 * Single side: 1 physical sheet = 1 machine click
 * Double side: 1 physical sheet = 2 machine clicks
 */
export function calculateMachineClicks(
  sheetConsumption: number,
  printSide: PrintSide
): number {
  const sheets = Math.max(0, Math.floor(sheetConsumption || 0));
  const multiplier = printSide === 'DOUBLE' ? 2 : 1;
  return sheets * multiplier;
}

/**
 * Calculates print cost with GST breakdown.
 */
export function calculatePrintCost(
  machineClicks: number,
  unitRate: number,
  gstPercent: number = 18.0
): { totalCost: number; gstAmount: number; grandTotalCost: number } {
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

/**
 * Full production job calculation combining sheets, clicks, wastage, and costs.
 */
export function calculateJobProduction(
  input: ProductionCalculationInput
): ProductionCalculationResult {
  const sheetConsumption = calculateSheetConsumption(
    input.goodPrints,
    input.wastage,
    input.reprint
  );
  const machineClicks = calculateMachineClicks(sheetConsumption, input.printSide);
  const { totalCost, gstAmount, grandTotalCost } = calculatePrintCost(
    machineClicks,
    input.unitRate,
    input.gstPercent ?? 18.0
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

/**
 * Reconciles physical machine counter readings against recorded job clicks.
 */
export function reconcileMachineCounter(
  input: CounterReconciliationInput
): CounterReconciliationResult {
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

/**
 * Calculates wastage percentage.
 */
export function calculateWastagePercentage(
  totalWastage: number,
  totalSheets: number
): number {
  if (!totalSheets || totalSheets <= 0) return 0;
  return Math.round((totalWastage / totalSheets) * 10000) / 100;
}
