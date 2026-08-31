import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireOwner } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const { error } = requireAuth(request);
  if (error) return NextResponse.json({ error }, { status: 401 });

  const machines = await db.machines.list();
  return NextResponse.json({ machines });
}

export async function PATCH(request: NextRequest) {
  const { user, error } = requireOwner(request);
  if (error || !user) return NextResponse.json({ error: error || 'Unauthorized' }, { status: 403 });

  try {
    const body = await request.json();
    const { id, name, model, department, initialCounter } = body;
    if (!id) return NextResponse.json({ error: 'Machine ID is required' }, { status: 400 });

    const updated = await db.machines.update(id, {
      name,
      model,
      department,
      initialCounter: initialCounter !== undefined ? Number(initialCounter) : undefined,
    });

    return NextResponse.json({ success: true, machine: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
