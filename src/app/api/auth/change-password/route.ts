import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, comparePassword, hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'New password and confirm password do not match.' },
        { status: 400 }
      );
    }

    // Fetch user from Supabase database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // Validate current password
    const isMatch = await comparePassword(currentPassword, dbUser.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Incorrect current password. Please try again.' },
        { status: 400 }
      );
    }

    // Hash and update new password
    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_CHANGED',
        entity: 'User',
        entityId: user.id,
        newValue: { action: 'User changed their own password' },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully!',
    });
  } catch (err: any) {
    console.error('Password change error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to change password' },
      { status: 500 }
    );
  }
}
