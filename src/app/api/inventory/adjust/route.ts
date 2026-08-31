import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireOwner } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const { user, error } = requireOwner(request);
  if (error || !user) return NextResponse.json({ error: error || 'Forbidden: Owner only' }, { status: 403 });

  try {
    const body = await request.json();
    const { mediaId, newStock, reason } = body;

    if (!mediaId || newStock === undefined || Number(newStock) < 0) {
      return NextResponse.json(
        { error: 'Valid Media ID and non-negative newStock value are required.' },
        { status: 400 }
      );
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'A valid reason is required for manual stock adjustments.' },
        { status: 400 }
      );
    }

    const result = await db.inventory.adjust(
      mediaId,
      Number(newStock),
      user.id,
      reason.trim()
    );

    return NextResponse.json({
      success: true,
      message: `Stock adjusted to ${newStock} sheets successfully.`,
      media: result.media,
      movement: result.movement,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
