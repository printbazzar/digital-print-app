'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'OPERATOR';
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (idOrEmail: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isOwner: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEFAULT_OWNER_USER: AuthUser = {
  id: 'usr-owner-001',
  email: 'owner@printbazzar.com',
  name: 'Owner (Print Bazzar)',
  role: 'OWNER',
};

export const DEFAULT_OPERATOR_USER: AuthUser = {
  id: 'usr-operator-001',
  email: 'staff@printbazzar.com',
  name: 'Staff Operator (Print Bazzar)',
  role: 'OPERATOR',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // 1. Initial Load: Check localStorage for existing session
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const storedUser = localStorage.getItem('pb_user');
        const storedToken = localStorage.getItem('pb_token');

        if (storedUser && storedToken) {
          try {
            const parsedUser: AuthUser = JSON.parse(storedUser);
            setUser(parsedUser);
            setToken(storedToken);
          } catch {
            localStorage.removeItem('pb_user');
            localStorage.removeItem('pb_token');
          }
        }
      }
    } catch (e) {
      console.warn('Failed to restore session:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Route Guard & Enforcement based on auth state & role
  useEffect(() => {
    if (loading) return;

    if (!user) {
      // If not logged in, redirect to /login
      if (pathname !== '/login') {
        router.replace('/login');
      }
    } else {
      // If user is already logged in and attempts to access /login
      if (pathname === '/login') {
        if (user.role === 'OPERATOR') {
          router.replace('/production');
        } else {
          router.replace('/');
        }
      } else if (user.role === 'OPERATOR') {
        // Staff / Operator is strictly restricted to Job Entry and Inventory
        const allowedOperatorPaths = ['/production', '/inventory'];
        const isAllowed = allowedOperatorPaths.some(
          (p) => pathname === p || pathname.startsWith(p + '/')
        );
        if (!isAllowed) {
          router.replace('/production');
        }
      }
    }
  }, [user, loading, pathname, router]);

  const login = async (
    idOrEmail: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: idOrEmail, password }),
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        return {
          success: false,
          error: data?.error || 'Invalid User ID or Password. Please try again.',
        };
      }

      const loggedUser: AuthUser = data.user;
      const loggedToken: string = data.token;

      setUser(loggedUser);
      setToken(loggedToken);

      if (typeof window !== 'undefined') {
        localStorage.setItem('pb_user', JSON.stringify(loggedUser));
        localStorage.setItem('pb_token', loggedToken);
        document.cookie = `pb_token=${loggedToken}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
      }

      if (loggedUser.role === 'OPERATOR') {
        router.replace('/production');
      } else {
        router.replace('/');
      }

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Login connection failed. Please try again.',
      };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pb_user');
      localStorage.removeItem('pb_token');
      document.cookie =
        'pb_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    }
    router.replace('/login');
  };

  const isOwner = user?.role === 'OWNER';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        isOwner,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
