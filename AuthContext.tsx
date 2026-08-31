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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check localStorage and cookie on boot
    const storedToken = localStorage.getItem('pb_token');
    if (storedToken) {
      setToken(storedToken);
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${storedToken}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.user) {
            setUser(data.user);
          } else {
            localStorage.removeItem('pb_token');
            setUser(null);
            setToken(null);
          }
        })
        .catch(() => {
          localStorage.removeItem('pb_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('pb_token', data.token);
    document.cookie = `pb_token=${data.token}; path=/; max-age=604800; SameSite=Lax`;
    router.push('/');
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('pb_token');
    document.cookie = 'pb_token=; path=/; max-age=0';
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        isOwner: user?.role === 'OWNER',
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
