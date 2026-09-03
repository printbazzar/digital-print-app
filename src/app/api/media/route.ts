import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const { error } = requireAuth(request);
  if (error) return NextResponse.json({ error }, { status: 401 });

  const media = await db.media.list();
  return NextResponse.json({ media });
}

export async function POST(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error || !user) return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { name, gsm, size, brand, costPerSheet, currentStock, minimumStockLevel, unit } = body;

    if (!name || !gsm || !size) {
      return NextResponse.json({ error: 'Name, GSM, and Size are required' }, { status: 400 });
    }

    const created = await db.media.create({
      name: name.trim(),
      gsm: Number(gsm),
      size: size.trim(),
      brand: brand?.trim() || 'Generic',
      costPerSheet: costPerSheet !== undefined ? Math.max(0, Number(costPerSheet)) : 0,
      currentStock: Math.max(0, Number(currentStock) || 0),
      minimumStockLevel: Math.max(0, Number(minimumStockLevel) || 100),
      unit: unit || 'sheets',
      isActive: true,
    });

    return NextResponse.json({ success: true, media: created }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error || !user) return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { id, name, gsm, size, brand, costPerSheet, minimumStockLevel, isActive } = body;

    if (!id) return NextResponse.json({ error: 'Media ID is required' }, { status: 400 });

    const updated = await db.media.update(id, {
      name: name?.trim(),
      gsm: gsm !== undefined ? Number(gsm) : undefined,
      size: size?.trim(),
      brand: brand?.trim(),
      costPerSheet: costPerSheet !== undefined ? Math.max(0, Number(costPerSheet)) : undefined,
      minimumStockLevel: minimumStockLevel !== undefined ? Number(minimumStockLevel) : undefined,
      isActive,
    });

    return NextResponse.json({ success: true, media: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
