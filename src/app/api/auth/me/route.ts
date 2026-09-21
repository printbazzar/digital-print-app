import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, findBuiltInUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const dbUser = await db.users.findById(session.id);
  const builtIn = findBuiltInUser(session.email || session.id);

  const finalUser = dbUser || builtIn || {
    id: session.id,
    email: session.email,
    name: session.name,
    role: session.role,
  };

  return NextResponse.json({
    user: {
      id: finalUser.id,
      email: finalUser.email,
      name: finalUser.name,
      role: finalUser.role,
    },
  });
}
