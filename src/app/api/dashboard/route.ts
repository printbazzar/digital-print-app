import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { calculateWastagePercentage } from '@/lib/calculations';
import { startOfWeek, startOfMonth, subDays, format, parseISO } from 'date-fns';

export async function GET(request: NextRequest) {
  const { error } = requireAuth(request);
  if (error) return NextResponse.json({ error }, { status: 401 });

  const url = new URL(request.url);
  const filter = url.searchParams.get('filter') || 'today';
  const customStart = url.searchParams.get('startDate');
  const customEnd = url.searchParams.get('endDate');

  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');

  let startDateStr = todayStr;
  let endDateStr = todayStr;

  if (filter === 'yesterday') {
    const yest = subDays(now, 1);
    startDateStr = format(yest, 'yyyy-MM-dd');
    endDateStr = startDateStr;
  } else if (filter === 'this_week') {
    startDateStr = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    endDateStr = todayStr;
  } else if (filter === 'this_month') {
    startDateStr = format(startOfMonth(now), 'yyyy-MM-dd');
    endDateStr = todayStr;
  } else if (filter === 'custom' && customStart && customEnd) {
    startDateStr = customStart;
    endDateStr = customEnd;
  }

  const filteredJobs = await db.jobs.list({
    startDate: startDateStr,
    endDate: endDateStr,
  });

  // Aggregations
  const totalJobs = filteredJobs.length;
  let totalGoodPrints = 0;
  let totalWastage = 0;
  let totalReprint = 0;
  let totalSheetConsumption = 0;
  let totalMachineClicks = 0;

  let totalColourClicks = 0;
  let totalBWClicks = 0;

  let totalA4Clicks = 0;
  let totalA3Clicks = 0;
  let totalBannerClicks = 0;

  let totalSingleSideSheets = 0;
  let totalDoubleSideSheets = 0;

  let totalCost = 0;
  let grandTotalCost = 0;

  for (const job of filteredJobs) {
    totalGoodPrints += job.goodPrints;
    totalWastage += job.wastage;
    totalReprint += job.reprint;
    totalSheetConsumption += job.sheetConsumption;
    totalMachineClicks += job.machineClicks;

    if (job.printType === 'COLOUR') {
      totalColourClicks += job.machineClicks;
    } else {
      totalBWClicks += job.machineClicks;
    }

    if (job.paperSize === 'A4') {
      totalA4Clicks += job.machineClicks;
    } else if (job.paperSize === 'A3') {
      totalA3Clicks += job.machineClicks;
    } else {
      totalBannerClicks += job.machineClicks;
    }

    if (job.printSide === 'SINGLE') {
      totalSingleSideSheets += job.sheetConsumption;
    } else {
      totalDoubleSideSheets += job.sheetConsumption;
    }

    totalCost += Number(job.totalCost);
    grandTotalCost += Number(job.grandTotalCost);
  }

  const wastagePercentage = calculateWastagePercentage(
    totalWastage,
    totalSheetConsumption
  );

  // Machine Counter Info for today
  const machine = await db.machines.getKonica();
  const { counter: todayCounter, totalJobClicksToday } =
    await db.counters.getOrInitToday(machine.id, todayStr);

  // Low stock media
  const allMedia = await db.media.list();
  const lowStockMedia = allMedia.filter(
    (m) => m.currentStock <= m.minimumStockLevel
  );

  // 14-day Production and Wastage Trend
  const trend14DaysAgo = format(subDays(now, 13), 'yyyy-MM-dd');
  const trendJobs = await db.jobs.list({ startDate: trend14DaysAgo, endDate: todayStr });

  const trendDays: { date: string; label: string; clicks: number; wastagePct: number; jobs: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = subDays(now, i);
    const dStr = format(d, 'yyyy-MM-dd');
    const dayLabel = format(d, 'dd MMM');
    const dayJobs = trendJobs.filter((j) => j.productionDate === dStr);

    const dayClicks = dayJobs.reduce((acc, j) => acc + j.machineClicks, 0);
    const daySheets = dayJobs.reduce((acc, j) => acc + j.sheetConsumption, 0);
    const dayWastage = dayJobs.reduce((acc, j) => acc + j.wastage, 0);
    const dayWastagePct = calculateWastagePercentage(dayWastage, daySheets);

    trendDays.push({
      date: dStr,
      label: dayLabel,
      clicks: dayClicks,
      wastagePct: dayWastagePct,
      jobs: dayJobs.length,
    });
  }

  return NextResponse.json({
    period: {
      filter,
      startDate: startDateStr,
      endDate: endDateStr,
    },
    summary: {
      totalJobs,
      totalGoodPrints,
      totalWastage,
      totalReprint,
      totalSheetConsumption,
      totalMachineClicks,
      wastagePercentage,
      totalColourClicks,
      totalBWClicks,
      totalA4Clicks,
      totalA3Clicks,
      totalBannerClicks,
      totalSingleSideSheets,
      totalDoubleSideSheets,
      totalCost: Math.round(totalCost * 100) / 100,
      grandTotalCost: Math.round(grandTotalCost * 100) / 100,
    },
    machineCounter: {
      machineId: machine.id,
      machineName: machine.name,
      openingCounter: todayCounter.openingCounter,
      closingCounter: todayCounter.closingCounter,
      machinePrintCount: todayCounter.machinePrintCount,
      totalJobClicksToday,
      difference: todayCounter.difference,
      isMatched: todayCounter.isMatched,
      isClosed: todayCounter.isClosed,
      mismatchReason: todayCounter.mismatchReason,
    },
    lowStockMedia,
    recentJobs: filteredJobs.slice(0, 10),
    trends: trendDays,
  });
}
