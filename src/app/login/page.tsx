'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import {
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  Check,
} from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoId: string, demoPass: string) => {
    setEmail(demoId);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black p-4 sm:p-6">
      <div className="max-w-md w-full">
        {/* Brand Banner */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <img
              src="/logo-white.png"
              alt="Print Bazzar - More than you expect"
              className="h-16 sm:h-20 w-auto object-contain filter drop-shadow-md"
            />
          </div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-yellow-400">
            Digital Printing Production Management System
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-200">
          <h2 className="text-xl font-black text-slate-950 mb-1">Sign In to Production</h2>
          <p className="text-xs text-slate-500 font-medium mb-6">
            Enter credentials or select quick access below to continue
          </p>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-2.5 text-xs text-red-700 font-medium animate-fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5 uppercase tracking-wider">
                User ID / Email Address
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner or staff"
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
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
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

          {/* Quick Role Switcher Buttons */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block text-center mb-3">
              One-Click Role Switcher
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleQuickLogin('owner', 'owner@2026')}
                className="p-3 rounded-xl border border-slate-300 bg-slate-50 hover:bg-yellow-50 hover:border-yellow-400 text-left transition flex items-center space-x-2.5 group"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-yellow-400 flex items-center justify-center flex-shrink-0 group-hover:bg-yellow-400 group-hover:text-slate-950 transition">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-900 leading-tight">Owner Access</div>
                  <div className="text-[10px] text-slate-500 font-medium">All permissions</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('staff', 'staff@2026')}
                className="p-3 rounded-xl border border-slate-300 bg-slate-50 hover:bg-yellow-50 hover:border-yellow-400 text-left transition flex items-center space-x-2.5 group"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-yellow-400 flex items-center justify-center flex-shrink-0 group-hover:bg-yellow-400 group-hover:text-slate-950 transition">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-900 leading-tight">Staff Access</div>
                  <div className="text-[10px] text-slate-500 font-medium">C3070 Press</div>
                </div>
              </button>
            </div>
          </div>

          {/* Credentials Helper Box */}
          <div className="mt-5 p-4 rounded-xl bg-slate-950 text-white text-xs border border-yellow-400/40 space-y-2.5">
            <div className="flex items-center space-x-2 text-yellow-400 font-black text-xs uppercase tracking-wider">
              <KeyRound className="w-4 h-4 flex-shrink-0" />
              <span>Official Login Credentials</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                <div>
                  <span className="font-extrabold text-yellow-400 block text-[11px]">👑 Owner Account:</span>
                  <div className="text-slate-300 font-mono text-[11px]">
                    ID: <strong className="text-white">owner</strong> &nbsp;|&nbsp; Pass: <strong className="text-white">owner@2026</strong>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('owner', 'owner@2026')}
                  className="px-2.5 py-1 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-[10px] rounded-lg transition"
                >
                  Fill
                </button>
              </div>

              <div className="flex items-center justify-between bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                <div>
                  <span className="font-extrabold text-yellow-400 block text-[11px]">👷 Staff Account:</span>
                  <div className="text-slate-300 font-mono text-[11px]">
                    ID: <strong className="text-white">staff</strong> &nbsp;|&nbsp; Pass: <strong className="text-white">staff@2026</strong>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('staff', 'staff@2026')}
                  className="px-2.5 py-1 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-[10px] rounded-lg transition"
                >
                  Fill
                </button>
              </div>
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
