import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error || !user) return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { machineId, date, closingCounter, mismatchReason } = body;

    if (!machineId || closingCounter === undefined) {
      return NextResponse.json(
        { error: 'Machine ID and Closing Counter value are required.' },
        { status: 400 }
      );
    }

    const todayDate = date || new Date().toISOString().split('T')[0];

    const closedRecord = await db.counters.closeDay({
      machineId,
      date: todayDate,
      closingCounter: Number(closingCounter),
      mismatchReason,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: `Day closed successfully for ${todayDate}.`,
      counter: closedRecord,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
