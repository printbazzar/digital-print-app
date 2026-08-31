import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { calculateWastagePercentage } from '@/lib/calculations';
import { format, subDays, startOfWeek, startOfMonth } from 'date-fns';

export async function GET(request: NextRequest) {
  const { error } = requireAuth(request);
  if (error) return NextResponse.json({ error }, { status: 401 });

  const url = new URL(request.url);
  const period = url.searchParams.get('period') || 'today';
  const customStart = url.searchParams.get('startDate');
  const customEnd = url.searchParams.get('endDate');
  const operatorId = url.searchParams.get('operatorId') || undefined;
  const machineId = url.searchParams.get('machineId') || undefined;
  const printType = url.searchParams.get('printType') || undefined;
  const paperSize = url.searchParams.get('paperSize') || undefined;

  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');

  let startDate = todayStr;
  let endDate = todayStr;

  if (period === 'yesterday') {
    const yest = subDays(now, 1);
    startDate = format(yest, 'yyyy-MM-dd');
    endDate = startDate;
  } else if (period === 'this_week') {
    startDate = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    endDate = todayStr;
  } else if (period === 'this_month') {
    startDate = format(startOfMonth(now), 'yyyy-MM-dd');
    endDate = todayStr;
  } else if (period === 'custom' && customStart && customEnd) {
    startDate = customStart;
    endDate = customEnd;
  }

  const allJobs = await db.jobs.list({
    startDate,
    endDate,
    operatorId,
    machineId,
  });

  let jobs = allJobs;
  if (printType) {
    jobs = jobs.filter((j) => j.printType === printType);
  }
  if (paperSize) {
    jobs = jobs.filter((j) => j.paperSize === paperSize);
  }

  // Summary Metrics
  const totalJobs = jobs.length;
  let totalGoodPrints = 0;
  let totalWastage = 0;
  let totalReprint = 0;
  let totalSheetConsumption = 0;
  let totalClicks = 0;
  let totalColourClicks = 0;
  let totalBWClicks = 0;
  let totalA4Clicks = 0;
  let totalA3Clicks = 0;
  let totalSingleSide = 0;
  let totalDoubleSide = 0;
  let totalCost = 0;
  let grandTotalCost = 0;

  // Breakdown aggregators
  const operatorMap = new Map<string, { name: string; jobs: number; good: number; wastage: number; clicks: number; cost: number }>();
  const mediaMap = new Map<string, { name: string; sheets: number; jobs: number }>();
  const wastageMap = new Map<string, { reason: string; quantity: number }>();

  for (const j of jobs) {
    totalGoodPrints += j.goodPrints;
    totalWastage += j.wastage;
    totalReprint += j.reprint;
    totalSheetConsumption += j.sheetConsumption;
    totalClicks += j.machineClicks;

    if (j.printType === 'COLOUR') totalColourClicks += j.machineClicks;
    else totalBWClicks += j.machineClicks;

    if (j.paperSize === 'A4') totalA4Clicks += j.machineClicks;
    else totalA3Clicks += j.machineClicks;

    if (j.printSide === 'SINGLE') totalSingleSide += j.sheetConsumption;
    else totalDoubleSide += j.sheetConsumption;

    totalCost += Number(j.totalCost);
    grandTotalCost += Number(j.grandTotalCost);

    // Operator aggregation
    const opKey = j.operatorId;
    const op = operatorMap.get(opKey) || {
      name: j.operatorName || 'Operator',
      jobs: 0,
      good: 0,
      wastage: 0,
      clicks: 0,
      cost: 0,
    };
    op.jobs += 1;
    op.good += j.goodPrints;
    op.wastage += j.wastage;
    op.clicks += j.machineClicks;
    op.cost += Number(j.grandTotalCost);
    operatorMap.set(opKey, op);

    // Media aggregation
    const medKey = j.mediaId;
    const med = mediaMap.get(medKey) || {
      name: j.mediaName || 'Media',
      sheets: 0,
      jobs: 0,
    };
    med.sheets += j.sheetConsumption;
    med.jobs += 1;
    mediaMap.set(medKey, med);

    // Wastage reason aggregation
    if (j.wastage > 0) {
      const wReason = j.wastageReasonName || j.wastageReasonOther || 'Unspecified';
      const wr = wastageMap.get(wReason) || { reason: wReason, quantity: 0 };
      wr.quantity += j.wastage;
      wastageMap.set(wReason, wr);
    }
  }

  const wastagePercentage = calculateWastagePercentage(totalWastage, totalSheetConsumption);

  const operatorReport = Array.from(operatorMap.values()).map((op) => ({
    ...op,
    wastagePct: calculateWastagePercentage(op.wastage, op.good + op.wastage),
    cost: Math.round(op.cost * 100) / 100,
  }));

  const mediaReport = Array.from(mediaMap.values()).sort((a, b) => b.sheets - a.sheets);

  const wastageReport = Array.from(wastageMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .map((w) => ({
      ...w,
      percentage: totalWastage > 0 ? Math.round((w.quantity / totalWastage) * 10000) / 100 : 0,
    }));

  return NextResponse.json({
    period: {
      key: period,
      startDate,
      endDate,
    },
    summary: {
      totalJobs,
      totalGoodPrints,
      totalWastage,
      totalReprint,
      totalSheetConsumption,
      totalClicks,
      wastagePercentage,
      totalColourClicks,
      totalBWClicks,
      totalA4Clicks,
      totalA3Clicks,
      totalSingleSide,
      totalDoubleSide,
      totalCost: Math.round(totalCost * 100) / 100,
      grandTotalCost: Math.round(grandTotalCost * 100) / 100,
    },
    operatorReport,
    mediaReport,
    wastageReport,
    jobs,
  });
}
