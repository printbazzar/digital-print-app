'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import {
  Gauge,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ArrowRight,
  History,
  Lock,
  RefreshCw,
  AlertCircle,
  FileCheck,
  Edit2,
  Unlock,
} from 'lucide-react';
import { reconcileMachineCounter } from '@/lib/calculations';

export default function DailyClosingPage() {
  const { user, isOwner, loading: authLoading } = useAuth();
  const router = useRouter();

  const [counterData, setCounterData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [closingInput, setClosingInput] = useState<number | ''>('');
  const [mismatchReason, setMismatchReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  const fetchCounterInfo = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [todayRes, histRes] = await Promise.all([
        fetch('/api/counters/today'),
        fetch('/api/counters/history'),
      ]);

      if (todayRes.ok) {
        const d = await todayRes.json();
        setCounterData(d);
        if (d.counter?.closingCounter) {
          setClosingInput(d.counter.closingCounter);
          if (d.counter.mismatchReason) {
            setMismatchReason(d.counter.mismatchReason);
          }
        } else {
          const defaultExpected = (d.counter?.openingCounter || 1067426) + (d.totalJobClicksToday || 0);
          setClosingInput(defaultExpected);
        }
      } else {
        throw new Error('Could not load current meter status.');
      }

      if (histRes.ok) {
        const h = await histRes.json();
        setHistory(h.history || []);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load machine counter data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchCounterInfo();
    }
  }, [user, authLoading]);

  const opening = counterData?.counter?.openingCounter || 1067426;
  const jobClicks = counterData?.totalJobClicksToday || 0;
  const isClosed = counterData?.counter?.isClosed || false;

  // Live reconciliation calculation
  const closingVal = Number(closingInput) || opening;
  const liveRecon = reconcileMachineCounter({
    openingCounter: opening,
    closingCounter: closingVal,
    totalJobClicks: jobClicks,
  });

  const handleCloseDay = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (closingInput === '' || Number(closingInput) < opening) {
      setErrorMsg(`Closing counter must be greater than or equal to opening counter (${opening.toLocaleString()}).`);
      return;
    }

    if (!liveRecon.isMatched && !mismatchReason.trim()) {
      setErrorMsg(
        `MACHINE COUNT MISMATCH: Difference of ${liveRecon.difference} clicks detected between machine meter and logged jobs. You MUST provide an explanatory reason before closing the day.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/counters/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machineId: counterData?.machine?.id || 'mach-c3070-001',
          date: counterData?.counter?.date || new Date().toISOString().split('T')[0],
          closingCounter: Number(closingInput),
          mismatchReason: mismatchReason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to close day');

      setSuccessMsg('Day closed successfully! Machine counter locked and recorded.');
      setEditMode(false);
      fetchCounterInfo();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred while saving closing count');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Gauge className="w-5 h-5 text-yellow-600" />
            <h1 className="text-xl font-black text-slate-950 tracking-tight">
              Machine Counter & Shift Closing
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-400 text-slate-950 border border-yellow-400">
              Konica Minolta C3070
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Reconcile physical machine meter readings against recorded digital print job clicks
          </p>
        </div>

        <button
          onClick={fetchCounterInfo}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-4 flex items-start space-x-3 text-slate-950 text-xs shadow-xs animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 font-bold">{successMsg}</div>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start space-x-3 text-red-700 text-xs shadow-xs">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 font-semibold">{errorMsg}</div>
        </div>
      )}

      {/* Main Reconciliation Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Status Strip */}
        <div className="bg-slate-950 p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-yellow-400 text-slate-950 rounded-xl font-bold">
              <Gauge className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  AccurioPress C3070 Meter
                </span>
                {isClosed && !editMode ? (
                  <span className="px-2.5 py-0.5 text-[11px] font-extrabold bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 rounded-full flex items-center space-x-1">
                    <Lock className="w-3 h-3" />
                    <span>DAY CLOSED</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 text-[11px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-full flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>SHIFT ACTIVE</span>
                  </span>
                )}
              </div>
              <h2 className="text-lg font-black text-white mt-1">
                Shift Reconciliation: {counterData?.counter?.date || new Date().toISOString().split('T')[0]}
              </h2>
            </div>
          </div>

          {/* Quick Actions */}
          {isClosed && !editMode && (
            <button
              onClick={() => setEditMode(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-yellow-400 text-xs font-bold rounded-xl transition border border-white/20"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit / Update Closing Count</span>
            </button>
          )}
        </div>

        {/* 3 Step Reconciliation Form */}
        <form onSubmit={handleCloseDay} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1: Opening Counter */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">1. Opening Counter</span>
                <ShieldCheck className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {opening.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Baseline meter reading carried over from previous day closing
              </p>
            </div>

            {/* Step 2: Today's Logged Clicks */}
            <div className="p-4 bg-yellow-50/60 rounded-2xl border border-yellow-200 space-y-2">
              <div className="flex items-center justify-between text-yellow-900">
                <span className="text-xs font-bold uppercase tracking-wider">2. Logged Job Clicks</span>
                <CheckCircle2 className="w-4 h-4 text-yellow-600" />
              </div>
              <div className="text-2xl font-black text-yellow-800 font-mono">
                {jobClicks.toLocaleString()} clicks
              </div>
              <p className="text-[11px] text-slate-600 font-medium">
                Sum of all Single-side (1x) and Double-side (2x) print jobs logged today
              </p>
            </div>

            {/* Step 3: Physical Closing Meter Reading */}
            <div className="p-4 bg-slate-950 text-white rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider text-yellow-400">
                  3. Physical Closing Meter *
                </span>
                <Lock className="w-4 h-4 text-yellow-400" />
              </div>

              <div>
                <input
                  type="number"
                  required
                  min={opening}
                  disabled={isClosed && !editMode}
                  value={closingInput}
                  onChange={(e) => setClosingInput(e.target.value === '' ? '' : parseInt(e.target.value))}
                  placeholder={`Min: ${opening}`}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-lg font-black text-yellow-400 font-mono focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-60"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Read directly from the Konica Minolta C3070 front LCD counter panel
              </p>
            </div>
          </div>

          {/* Reconciliation Math & Audit Verdict */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-yellow-600" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Reconciliation Verification Verdict
                </h3>
              </div>
              <div
                className={`px-3 py-1 rounded-full text-xs font-black flex items-center space-x-1.5 ${
                  liveRecon.isMatched
                    ? 'bg-yellow-100 text-slate-950 border border-yellow-300'
                    : 'bg-red-100 text-red-700 border border-red-300'
                }`}
              >
                {liveRecon.isMatched ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-yellow-600" />
                    <span>PERFECT MATCH (0 Clicks Delta)</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span>COUNT MISMATCH ({liveRecon.difference > 0 ? '+' : ''}{liveRecon.difference} Clicks)</span>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Calculated Machine Prints:</span>
                <strong className="text-slate-900 font-black text-sm font-mono">
                  {liveRecon.machinePrintCount} clicks
                </strong>
                <span className="text-[10px] text-slate-500 block">Closing ({closingVal}) - Opening ({opening})</span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Logged Job Clicks:</span>
                <strong className="text-slate-900 font-black text-sm font-mono">
                  {liveRecon.totalJobClicks} clicks
                </strong>
                <span className="text-[10px] text-slate-500 block">From production ledger</span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Discrepancy / Difference:</span>
                <strong
                  className={`font-black text-sm font-mono ${
                    liveRecon.difference === 0 ? 'text-yellow-700' : 'text-red-600'
                  }`}
                >
                  {liveRecon.difference} clicks
                </strong>
                <span className="text-[10px] text-slate-500 block">Machine Prints - Logged Jobs</span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Shift Status:</span>
                <strong className="text-slate-900 font-extrabold text-sm">
                  {isClosed && !editMode ? 'Locked & Closed' : 'Ready to Close'}
                </strong>
              </div>
            </div>

            {/* If Mismatch Detected: Mandatory Reason Input */}
            {!liveRecon.isMatched && (!isClosed || editMode) && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-3 animate-fade-in">
                <div className="flex items-center space-x-2 text-xs font-bold text-red-800">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>Mandatory Discrepancy Reason Required</span>
                </div>
                <p className="text-xs text-red-700">
                  The machine meter reading differs from recorded production jobs. Please explain the cause (e.g. Test prints, machine warm-up waste clicks, or missing job entries).
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Machine Test Print / Calibration Clicks',
                    'Shift handover test charts',
                    'Operator omitted logging small test batch',
                    'Paper jam purge clicks',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setMismatchReason(preset)}
                      className="px-2.5 py-1 bg-white border border-red-200 rounded-lg text-[11px] font-semibold text-red-800 hover:bg-red-100 transition"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  required
                  value={mismatchReason}
                  onChange={(e) => setMismatchReason(e.target.value)}
                  placeholder="Explain exact cause of discrepancy..."
                  className="w-full px-3.5 py-2.5 bg-white border border-red-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            )}
          </div>

          {/* Submit Action */}
          {(!isClosed || editMode) && (
            <div className="flex items-center justify-end space-x-3 pt-2">
              {editMode && (
                <button
                  type="button"
                  onClick={() => setEditMode(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-yellow-400/25 flex items-center space-x-2 transition transform active:scale-95 disabled:opacity-50"
              >
                <FileCheck className="w-4 h-4 stroke-[2.5]" />
                <span>{submitting ? 'Saving...' : editMode ? 'Update Closed Counter' : 'Lock & Close Day'}</span>
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Historical Daily Closings Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <History className="w-4 h-4 text-yellow-600" />
              <h2 className="text-sm font-black text-slate-900">
                Machine Counter Closing History ({history.length})
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Audit log of daily meter openings, closings, reconciled clicks, and mismatch notes
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Opening</th>
                <th className="py-3 px-4">Closing</th>
                <th className="py-3 px-4">Machine Prints</th>
                <th className="py-3 px-4">Job Clicks</th>
                <th className="py-3 px-4">Difference</th>
                <th className="py-3 px-4">Verdict</th>
                <th className="py-3 px-4">Closed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No historical machine closings recorded yet.
                  </td>
                </tr>
              ) : (
                history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{h.date}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">{h.openingCounter?.toLocaleString()}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{h.closingCounter?.toLocaleString()}</td>
                    <td className="py-3.5 px-4 font-mono text-yellow-800 font-bold">{h.machinePrintCount?.toLocaleString()}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">{h.totalJobClicks?.toLocaleString()}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-mono font-bold ${
                          h.difference === 0 ? 'text-yellow-700' : 'text-red-600'
                        }`}
                      >
                        {h.difference > 0 ? `+${h.difference}` : h.difference}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {h.isMatched ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-yellow-100 text-slate-950 border border-yellow-300 rounded-full">
                          MATCHED
                        </span>
                      ) : (
                        <span
                          className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 rounded-full"
                          title={h.mismatchReason || 'No reason'}
                        >
                          MISMATCH
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{h.closedByName || 'Operator'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
