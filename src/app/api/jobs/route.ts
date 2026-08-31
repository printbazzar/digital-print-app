import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const { error } = requireAuth(request);
  if (error) return NextResponse.json({ error }, { status: 401 });

  const url = new URL(request.url);
  const date = url.searchParams.get('date') || undefined;
  const startDate = url.searchParams.get('startDate') || undefined;
  const endDate = url.searchParams.get('endDate') || undefined;
  const operatorId = url.searchParams.get('operatorId') || undefined;
  const machineId = url.searchParams.get('machineId') || undefined;
  const search = url.searchParams.get('search') || undefined;

  const jobs = await db.jobs.list({
    date,
    startDate,
    endDate,
    operatorId,
    machineId,
    search,
  });

  return NextResponse.json({ jobs });
}

export async function POST(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error || !user) return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const {
      jobNumber,
      customerName,
      product,
      orderedQuantity,
      printType,
      paperSize,
      printSide,
      mediaId,
      machineId,
      goodPrints,
      wastage,
      reprint,
      reprintType,
      wastageReasonId,
      wastageReasonOther,
      wastagePhotoUrl,
      remarks,
      productionDate,
    } = body;

    // Required field validation
    if (!jobNumber || !customerName || !product) {
      return NextResponse.json(
        { error: 'Job Number, Customer Name, and Product Name are required.' },
        { status: 400 }
      );
    }

    if (!orderedQuantity || Number(orderedQuantity) <= 0) {
      return NextResponse.json(
        { error: 'Ordered Quantity must be greater than 0.' },
        { status: 400 }
      );
    }

    if (!['COLOUR', 'BW'].includes(printType)) {
      return NextResponse.json(
        { error: 'Print Type must be COLOUR or BW.' },
        { status: 400 }
      );
    }

    if (!['A4', 'A3'].includes(paperSize)) {
      return NextResponse.json(
        { error: 'Paper Size must be A4 or A3.' },
        { status: 400 }
      );
    }

    if (!['SINGLE', 'DOUBLE'].includes(printSide)) {
      return NextResponse.json(
        { error: 'Print Side must be SINGLE or DOUBLE.' },
        { status: 400 }
      );
    }

    if (!mediaId) {
      return NextResponse.json({ error: 'Media is required.' }, { status: 400 });
    }

    if (!machineId) {
      return NextResponse.json({ error: 'Machine is required.' }, { status: 400 });
    }

    if (goodPrints === undefined || Number(goodPrints) < 0) {
      return NextResponse.json(
        { error: 'Good prints quantity must be non-negative.' },
        { status: 400 }
      );
    }

    const job = await db.jobs.create({
      jobNumber,
      customerName,
      product,
      orderedQuantity: Number(orderedQuantity),
      printType,
      paperSize,
      printSide,
      mediaId,
      machineId,
      goodPrints: Number(goodPrints),
      wastage: Number(wastage || 0),
      reprint: Number(reprint || 0),
      reprintType: reprintType || undefined,
      wastageReasonId: wastageReasonId || undefined,
      wastageReasonOther: wastageReasonOther || undefined,
      wastagePhotoUrl: wastagePhotoUrl || undefined,
      remarks: remarks || undefined,
      operatorId: user.id,
      productionDate: productionDate || undefined,
    });

    return NextResponse.json({
      success: true,
      message: `Production entry saved successfully. Job: ${job.jobNumber}, Clicks: ${job.machineClicks}, Sheets Used: ${job.sheetConsumption}.`,
      job,
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
