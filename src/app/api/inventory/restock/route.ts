import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error || !user) return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { mediaId, quantity, reason } = body;

    if (!mediaId || !quantity || Number(quantity) <= 0) {
      return NextResponse.json(
        { error: 'Valid Media ID and positive quantity are required.' },
        { status: 400 }
      );
    }

    const result = await db.inventory.restock(
      mediaId,
      Number(quantity),
      user.id,
      reason
    );

    return NextResponse.json({
      success: true,
      message: `Restocked ${quantity} sheets successfully.`,
      media: result.media,
      movement: result.movement,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
