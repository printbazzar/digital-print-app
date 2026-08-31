'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Lock, Mail, ArrowRight, ShieldCheck, UserCheck, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black p-4 sm:p-6">
      <div className="max-w-md w-full">
        {/* Brand Banner */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 rounded-2xl bg-yellow-400 items-center justify-center text-slate-950 font-black text-3xl shadow-2xl shadow-yellow-400/25 mb-4 transform hover:scale-105 transition">
            PB
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            PRINT BAZZAR <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
          </h1>
          <p className="text-sm font-semibold text-yellow-400 mt-1">
            Digital Printing Production System
          </p>
          <div className="mt-3 inline-block px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 shadow-inner">
            Primary Press: <strong className="text-yellow-400">Konica Minolta C3070</strong>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-200">
          <h2 className="text-xl font-black text-slate-950 mb-1">Sign In to Production</h2>
          <p className="text-xs text-slate-500 font-medium mb-6">
            Enter credentials to access digital production controls
          </p>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-2.5 text-xs text-red-700 font-medium">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@printbazzar.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 focus:bg-white transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-yellow-400/30 flex items-center justify-center space-x-2 transition transform active:scale-[0.99] disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            </button>
          </form>

          {/* Quick Demo Pre-fills */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block text-center mb-3">
              Quick Role Switcher
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleQuickLogin('owner@printbazzar.com', 'owner123')}
                className="p-3 rounded-xl border border-slate-300 bg-slate-50 hover:bg-yellow-50 hover:border-yellow-400 text-left transition flex items-center space-x-2.5 group"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-900 text-yellow-400 flex items-center justify-center flex-shrink-0 group-hover:bg-yellow-400 group-hover:text-slate-950 transition">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 leading-tight">Owner Access</div>
                  <div className="text-[10px] text-slate-500 font-medium">All permissions</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('operator@printbazzar.com', 'operator123')}
                className="p-3 rounded-xl border border-slate-300 bg-slate-50 hover:bg-yellow-50 hover:border-yellow-400 text-left transition flex items-center space-x-2.5 group"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-900 text-yellow-400 flex items-center justify-center flex-shrink-0 group-hover:bg-yellow-400 group-hover:text-slate-950 transition">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 leading-tight">Operator Access</div>
                  <div className="text-[10px] text-slate-500 font-medium">C3070 Press</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-6 text-xs font-medium text-slate-500">
          Print Bazzar Production Core • Konica Minolta C3070 Control
        </div>
      </div>
    </div>
  );
}
