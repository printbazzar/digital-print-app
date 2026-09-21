import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { comparePassword, signToken, findBuiltInUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawId = body.email || body.username || body.userId || '';
    const rawPass = body.password || '';

    const idOrEmail = rawId.toString().trim().toLowerCase();
    const password = rawPass.toString().trim();

    if (!idOrEmail || !password) {
      return NextResponse.json(
        { error: 'User ID and password are required.' },
        { status: 400 }
      );
    }

    const builtIn = findBuiltInUser(idOrEmail);
    const user = await db.users.findByEmail(idOrEmail);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid User ID or Password. Please check your credentials.' },
        { status: 401 }
      );
    }

    // Password verification logic:
    let isMatch = false;

    // 1. Direct match with built-in allowed passwords (e.g. owner@2026, owner123, staff@2026, staff123)
    if (builtIn && builtIn.passwords.includes(password)) {
      isMatch = true;
    }

    // 2. Direct match based on role defaults
    if (!isMatch) {
      if (user.role === 'OWNER' && (password === 'owner@2026' || password === 'owner123' || password === 'print@2026')) {
        isMatch = true;
      } else if (
        user.role === 'OPERATOR' &&
        (password === 'staff@2026' || password === 'staff123' || password === 'operator123' || password === 'operator@2026' || password === 'print@2026')
      ) {
        isMatch = true;
      }
    }

    // 3. Compare with user's stored bcrypt passwordHash
    if (!isMatch && user.passwordHash) {
      isMatch = await comparePassword(password, user.passwordHash);
    }

    if (!isMatch) {
      return NextResponse.json(
        { error: 'Invalid password. Please enter the correct password.' },
        { status: 401 }
      );
    }

    const token = signToken(user);

    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

    response.cookies.set('pb_token', token, {
      httpOnly: false, // accessible to client for fast bootstrap
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
