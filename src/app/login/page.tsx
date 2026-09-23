'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import {
  ShieldCheck,
  Printer,
  Boxes,
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();

  const [idOrEmail, setIdOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Manual Form Submission
  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idOrEmail.trim() || !password.trim()) {
      setErrorMessage('Please enter both User ID and Password.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const res = await login(idOrEmail.trim(), password.trim());
    if (!res.success) {
      setErrorMessage(res.error || 'Invalid User ID or Password.');
      setLoading(false);
    }
  };

  // 1-Click Quick Login
  const handleQuickLogin = async (role: 'OWNER' | 'STAFF') => {
    setLoading(true);
    setErrorMessage(null);

    const creds =
      role === 'OWNER'
        ? { id: 'owner', pass: 'owner@2026' }
        : { id: 'staff', pass: 'staff@2026' };

    setIdOrEmail(creds.id);
    setPassword(creds.pass);

    const res = await login(creds.id, creds.pass);
    if (!res.success) {
      setErrorMessage(res.error || 'Quick login failed.');
      setLoading(false);
    }
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
          <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
            PRINT BAZZAR PRODUCTION
          </h1>
          <p className="text-xs font-bold uppercase tracking-wider text-yellow-400">
            Digital Printing Management System
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Konica Minolta AccurioPress C3070
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6">
          {/* Quick Login Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                1-Click Quick Login
              </span>
              <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                Shop Fast Access
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Owner Card */}
              <button
                type="button"
                onClick={() => handleQuickLogin('OWNER')}
                disabled={loading}
                className="group p-3.5 rounded-xl border-2 border-amber-300 bg-gradient-to-b from-amber-50/70 to-yellow-50 hover:border-yellow-500 hover:shadow-md transition text-left cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-black text-slate-900 flex items-center gap-1">
                      👑 Owner
                    </span>
                    <span className="text-[9px] font-extrabold bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">
                      FULL
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-600 leading-tight">
                    Full system access, reports, rates &amp; settings
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-amber-800 group-hover:text-amber-950">
                  <span>Sign in as Owner</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>

              {/* Staff Card */}
              <button
                type="button"
                onClick={() => handleQuickLogin('STAFF')}
                disabled={loading}
                className="group p-3.5 rounded-xl border-2 border-blue-300 bg-gradient-to-b from-blue-50/70 to-cyan-50 hover:border-blue-500 hover:shadow-md transition text-left cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-black text-slate-900 flex items-center gap-1">
                      👷 Staff
                    </span>
                    <span className="text-[9px] font-extrabold bg-blue-200 text-blue-900 px-1.5 py-0.5 rounded">
                      JOBS
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-600 leading-tight">
                    Job Production Entry &amp; Paper Media Inventory
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-blue-800 group-hover:text-blue-950">
                  <span>Sign in as Staff</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full"></div>
            <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Or Enter Credentials
            </span>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Manual Login Form */}
          <form onSubmit={handleManualLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                User ID / Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={idOrEmail}
                  onChange={(e) => setIdOrEmail(e.target.value)}
                  placeholder="e.g. owner or staff"
                  autoComplete="username"
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-yellow-400/30 flex items-center justify-center space-x-2 transition transform active:scale-[0.99] cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>

          {/* Account Credentials Info Table */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-[11px] space-y-1.5 text-slate-600">
            <div className="font-bold text-slate-800 mb-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-yellow-600" />
              <span>Default Shop Login Details:</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60">
              <span>👑 <strong>Owner:</strong> ID: <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">owner</code></span>
              <span>Pass: <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">owner@2026</code></span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span>👷 <strong>Staff:</strong> ID: <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">staff</code></span>
              <span>Pass: <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">staff@2026</code></span>
            </div>
          </div>
        </div>

        {/* Local Server Note */}
        <div className="text-center mt-4 text-[11px] font-medium text-slate-400 space-y-0.5">
          <p>100% Offline Local PC Server • Data stored safely in this computer</p>
          <p className="text-slate-500 text-[10px]">Print Bazzar Core v2.4</p>
        </div>
      </div>
    </div>
  );
}
