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

export async function PATCH(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error || !user) return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const machine = await db.machines.getKonica();
    const date = body.date || new Date().toISOString().split('T')[0];
    const { counter } = await db.counters.getOrInitToday(machine.id, date);

    const updated = await db.counters.update(counter.id, body, user.id);
    return NextResponse.json({
      success: true,
      message: "Today's counter updated successfully.",
      counter: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error || !user) return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });

  try {
    const url = new URL(request.url);
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    const machine = await db.machines.getKonica();
    const { counter } = await db.counters.getOrInitToday(machine.id, date);

    const result = await db.counters.delete(counter.id, user.id);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
