import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireOwner } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const { error } = requireAuth(request);
  if (error) return NextResponse.json({ error }, { status: 401 });

  const url = new URL(request.url);
  const machineId = url.searchParams.get('machineId') || undefined;

  const rates = await db.rates.list(machineId);
  return NextResponse.json({ rates });
}

export async function PUT(request: NextRequest) {
  const { user, error } = requireOwner(request);
  if (error || !user) return NextResponse.json({ error: error || 'Forbidden: Owner only' }, { status: 403 });

  try {
    const body = await request.json();
    const { id, rate, gstPercent } = body;

    if (!id || rate === undefined) {
      return NextResponse.json({ error: 'Rate ID and rate are required' }, { status: 400 });
    }

    const updated = await db.rates.update(id, Number(rate), gstPercent !== undefined ? Number(gstPercent) : undefined);
    if (!updated) return NextResponse.json({ error: 'Print rate not found' }, { status: 404 });

    return NextResponse.json({ success: true, rate: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
