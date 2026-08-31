// Print Bazzar - Authentication & RBAC Utilities
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

export interface UserEntity {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'OPERATOR';
}

const JWT_SECRET = process.env.JWT_SECRET || 'pb_digital_print_production_secret_key_2026_c3070';
const JWT_EXPIRES_IN = '7d';

export interface AuthPayload {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'OPERATOR';
}

export function signToken(user: UserEntity | AuthPayload): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function getSessionFromRequest(request: NextRequest): AuthPayload | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (decoded) return decoded;
  }

  const cookieToken = request.cookies.get('pb_token')?.value;
  if (cookieToken) {
    const decoded = verifyToken(cookieToken);
    if (decoded) return decoded;
  }

  return null;
}

export function requireAuth(request: NextRequest): { user: AuthPayload | null; error?: string } {
  const user = getSessionFromRequest(request);
  if (!user) {
    return { user: null, error: 'Unauthorized: Authentication required.' };
  }
  return { user };
}

export function requireOwner(request: NextRequest): { user: AuthPayload | null; error?: string } {
  const { user, error } = requireAuth(request);
  if (error || !user) return { user: null, error: error || 'Unauthorized' };
  if (user.role !== 'OWNER') {
    return { user: null, error: 'Forbidden: Owner privilege required.' };
  }
  return { user };
}
