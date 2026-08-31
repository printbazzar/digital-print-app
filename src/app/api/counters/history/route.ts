import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const { error } = requireAuth(request);
  if (error) return NextResponse.json({ error }, { status: 401 });

  const url = new URL(request.url);
  const machineId = url.searchParams.get('machineId') || undefined;

  const history = await db.counters.list(machineId);
  return NextResponse.json({ history });
}
