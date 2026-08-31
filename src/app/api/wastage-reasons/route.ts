import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireOwner } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const { error } = requireAuth(request);
  if (error) return NextResponse.json({ error }, { status: 401 });

  const reasons = await db.wastageReasons.list();
  return NextResponse.json({ reasons });
}

export async function POST(request: NextRequest) {
  const { user, error } = requireOwner(request);
  if (error || !user) return NextResponse.json({ error: error || 'Forbidden: Owner only' }, { status: 403 });

  try {
    const body = await request.json();
    const { reason } = body;

    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: 'Reason string is required' }, { status: 400 });
    }

    const created = await db.wastageReasons.create(reason.trim());
    return NextResponse.json({ success: true, reason: created }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
