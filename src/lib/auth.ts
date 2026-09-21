// Print Bazzar - Authentication & RBAC Utilities
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

export interface UserEntity {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'OPERATOR';
  passwordHash?: string;
  isActive?: boolean;
}

export interface BuiltInUser {
  id: string;
  email: string;
  aliases: string[];
  name: string;
  passwords: string[];
  passwordHash: string;
  role: 'OWNER' | 'OPERATOR';
  isActive: boolean;
}

// Built-in system accounts with new easy credentials
export const BUILT_IN_USERS: BuiltInUser[] = [
  {
    id: 'usr-owner-001',
    email: 'owner@printbazzar.com',
    aliases: ['owner', 'admin', 'owner@printbazzar.com', 'owner@printbazzar.in'],
    name: 'Owner (Print Bazzar)',
    passwords: ['owner@2026', 'owner123', 'print@2026'],
    passwordHash: '$2a$10$N0WXreBhjz4bnr.iEo0fJe7Da8iKWIFWMdzcrLsWgOwzUWVIflV.G', // hash of 'owner@2026'
    role: 'OWNER',
    isActive: true,
  },
  {
    id: 'usr-operator-001',
    email: 'staff@printbazzar.com',
    aliases: ['staff', 'operator', 'staff@printbazzar.com', 'operator@printbazzar.com', 'staff1', 'operator1'],
    name: 'Staff Operator (Print Bazzar)',
    passwords: ['staff@2026', 'staff123', 'operator123', 'operator@2026', 'print@2026'],
    passwordHash: '$2a$10$vVaqUPCpZXdxsqob9q.7KeIPraTuMHoFxgg0IU/95kPZjtN2pUXV2', // hash of 'staff@2026'
    role: 'OPERATOR',
    isActive: true,
  },
];

export function findBuiltInUser(idOrEmail: string): BuiltInUser | undefined {
  if (!idOrEmail) return undefined;
  const clean = idOrEmail.toLowerCase().trim();
  return BUILT_IN_USERS.find(
    (u) => u.email === clean || u.id === clean || u.aliases.includes(clean)
  );
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
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
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
