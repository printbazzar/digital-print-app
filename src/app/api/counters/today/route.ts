import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const { error } = requireAuth(request);
  if (error) return NextResponse.json({ error }, { status: 401 });

  const url = new URL(request.url);
  const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
  const machine = await db.machines.getKonica();

  const { counter, totalJobClicksToday } = await db.counters.getOrInitToday(
    machine.id,
    date
  );

  return NextResponse.json({
    machine,
    counter,
    totalJobClicksToday,
  });
}
