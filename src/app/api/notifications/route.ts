import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const { error } = requireAuth(request);
  if (error) return NextResponse.json({ error }, { status: 401 });

  const notifications = await db.notifications.list();
  return NextResponse.json({ notifications });
}

export async function PATCH(request: NextRequest) {
  const { error } = requireAuth(request);
  if (error) return NextResponse.json({ error }, { status: 401 });

  try {
    const body = await request.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });

    await db.notifications.markRead(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
