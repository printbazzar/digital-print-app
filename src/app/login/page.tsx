'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    // Immediately redirect to home dashboard
    const timer = setTimeout(() => {
      router.replace('/');
    }, 400);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black p-4 sm:p-6">
      <div className="max-w-md w-full text-center">
        {/* Brand Banner */}
        <div className="mb-6">
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

        {/* Access Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-200">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>

          <h2 className="text-xl font-black text-slate-950 mb-1">Direct Access Unlocked</h2>
          <p className="text-xs text-slate-500 font-medium mb-6">
            Logging you directly into Print Bazzar Production as <strong>Owner</strong> with full permissions...
          </p>

          <Link
            href="/"
            className="w-full py-3.5 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-yellow-400/30 flex items-center justify-center space-x-2 transition transform active:scale-[0.99]"
          >
            <span>Enter Dashboard Immediately</span>
            <ArrowRight className="w-4 h-4 text-slate-950 stroke-[2.5]" />
          </Link>
        </div>

        <div className="text-center mt-6 text-xs font-medium text-slate-500">
          Print Bazzar Production Core • Direct Access Enabled
        </div>
      </div>
    </div>
  );
}
