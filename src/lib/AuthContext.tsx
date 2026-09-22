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
  login: (email: string, password: string) => Promise<void>;
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

const DIRECT_ACCESS_TOKEN = 'pb-direct-access-token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(DEFAULT_OWNER_USER);
  const [token, setToken] = useState<string | null>(DIRECT_ACCESS_TOKEN);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Ensure direct access token is saved in localStorage and cookies
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('pb_token', DIRECT_ACCESS_TOKEN);
        document.cookie = `pb_token=${DIRECT_ACCESS_TOKEN}; path=/; max-age=31536000; SameSite=Lax`;
      }
    } catch {
      // Ignore storage errors
    }

    // If currently on /login, auto-redirect directly to dashboard
    if (pathname === '/login') {
      router.replace('/');
    }
  }, [pathname, router]);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.user) {
          setUser(data.user);
          setToken(data.token || DIRECT_ACCESS_TOKEN);
          if (data.token) {
            localStorage.setItem('pb_token', data.token);
            document.cookie = `pb_token=${data.token}; path=/; max-age=31536000; SameSite=Lax`;
          }
          router.push('/');
          return;
        }
      }
    } catch (err) {
      console.warn('Login request failed, proceeding with direct owner access:', err);
    }

    // Direct fail-safe: always log in as Owner
    setUser(DEFAULT_OWNER_USER);
    setToken(DIRECT_ACCESS_TOKEN);
    router.push('/');
  };

  const logout = () => {
    // Reset to Owner and stay on dashboard
    setUser(DEFAULT_OWNER_USER);
    setToken(DIRECT_ACCESS_TOKEN);
    router.push('/');
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || DEFAULT_OWNER_USER,
        token: token || DIRECT_ACCESS_TOKEN,
        loading: false,
        login,
        logout,
        isOwner: true,
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
