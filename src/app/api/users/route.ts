import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireOwner } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const { user, error } = requireOwner(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Forbidden: Owner privilege required to view staff console.' }, { status: 403 });
  }

  const users = await db.users.list();
  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  const { user, error } = requireOwner(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Forbidden: Owner privilege required to add staff.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, email, password, role } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Staff Full Name is required.' }, { status: 400 });
    }

    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Login Email / Username is required.' }, { status: 400 });
    }

    if (!password || password.length < 4) {
      return NextResponse.json({ error: 'Password must be at least 4 characters long.' }, { status: 400 });
    }

    const created = await db.users.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role: role === 'OWNER' ? 'OWNER' : 'OPERATOR',
    });

    return NextResponse.json({
      success: true,
      message: `Staff member '${created.name}' created successfully.`,
      user: created,
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create staff member' }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const { user, error } = requireOwner(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Forbidden: Owner privilege required.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, name, email, role, password, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'Staff User ID is required.' }, { status: 400 });
    }

    const updated = await db.users.update(id, {
      name,
      email,
      role,
      password,
      isActive,
    });

    return NextResponse.json({
      success: true,
      message: `Staff '${updated.name}' updated successfully.`,
      user: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update staff' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const { user, error } = requireOwner(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Forbidden: Owner privilege required.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Staff User ID is required.' }, { status: 400 });
    }

    const result = await db.users.delete(id);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete staff' }, { status: 400 });
  }
}
