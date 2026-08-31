import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireOwner } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const { user, error } = requireOwner(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Forbidden: Owner only' }, { status: 403 });
  }

  const logs = await db.auditLogs.list(150);
  return NextResponse.json({ logs });
}
