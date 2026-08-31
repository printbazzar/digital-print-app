import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireOwner } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = requireAuth(request);
  if (error) return NextResponse.json({ error }, { status: 401 });

  const job = await db.jobs.getById(params.id);
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  return NextResponse.json({ job });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = requireOwner(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Forbidden: Owner edit privilege required.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const updated = await db.jobs.update(params.id, body, user.id);
    if (!updated) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    return NextResponse.json({ success: true, job: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
