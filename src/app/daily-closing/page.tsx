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
} from 'lucide-react';
import { reconcileMachineCounter } from '@/lib/calculations';

export default function DailyClosingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [counterData, setCounterData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [closingInput, setClosingInput] = useState<number | ''>('');
  const [mismatchReason, setMismatchReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
        }
      }

      if (histRes.ok) {
        const h = await histRes.json();
        setHistory(h.history || []);
      }
    } catch (err: any) {
      setErrorMsg('Failed to load machine counter data.');
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
          machineId: counterData.machine.id,
          date: counterData.counter.date,
          closingCounter: Number(closingInput),
          mismatchReason: mismatchReason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to close day');

      setSuccessMsg('Day closed successfully! Machine counter locked and recorded.');
      fetchCounterInfo();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Gauge className="w-5 h-5 text-emerald-600" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Machine Counter & Day Closure
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Konica Minolta C3070
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Reconcile physical machine meter readings against recorded digital print job clicks
          </p>
        </div>

        <button
          onClick={fetchCounterInfo}
          className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Meters</span>
        </button>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start space-x-3 text-emerald-900 text-xs shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 font-bold">{successMsg}</div>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start space-x-3 text-red-700 text-xs shadow-xs">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 font-bold leading-relaxed">{errorMsg}</div>
        </div>
      )}

      {/* Main Reconciliation Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Counter Input & Comparison */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Shift Date: {counterData?.counter?.date}
              </span>
              <h2 className="text-base font-extrabold text-slate-900 mt-0.5">
                Daily Counter Verification
              </h2>
            </div>
            {isClosed ? (
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold flex items-center space-x-1">
                <Lock className="w-3.5 h-3.5" />
                <span>DAY CLOSED</span>
              </span>
            ) : (
              <span className="px-3 py-1 bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-xs font-bold flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5" />
                <span>PENDING CLOSURE</span>
              </span>
            )}
          </div>

          <form onSubmit={handleCloseDay} className="space-y-5">
            {/* Counter Readings Display */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Opening Counter (Read-only) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Opening Counter
                  </span>
                  <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-semibold">
                    Auto Baseline
                  </span>
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {opening.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Inherited from previous closing reading
                </div>
              </div>

              {/* Job Clicks Total */}
              <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl">
                <div className="flex items-center justify-between text-emerald-800 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Total Job Clicks Recorded
                  </span>
                  <span className="text-[10px] bg-emerald-200 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                    Live System Clicks
                  </span>
                </div>
                <div className="text-2xl font-black text-emerald-800">
                  {jobClicks.toLocaleString()}
                </div>
                <div className="text-[11px] text-emerald-700 mt-1">
                  Sum of all job clicks logged today
                </div>
              </div>
            </div>

            {/* Closing Counter Entry */}
            <div>
              <label className="block text-xs font-extrabold text-slate-800 mb-1 uppercase tracking-wider">
                Physical Machine Closing Counter *
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={opening}
                  required
                  disabled={isClosed}
                  value={closingInput}
                  onChange={(e) => setClosingInput(e.target.value ? Number(e.target.value) : '')}
                  placeholder={`e.g. ${(opening + jobClicks).toString()}`}
                  className="w-full px-4 py-3 text-lg font-black text-slate-900 bg-slate-50 border-2 border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Check the physical meter display on the Konica Minolta C3070 and enter the exact numerical reading.
              </p>
            </div>

            {/* Live Comparison Meter Status */}
            {closingInput !== '' && (
              <div
                className={`p-4 rounded-xl border ${
                  liveRecon.isMatched
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {liveRecon.isMatched ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                    )}
                    <span className="text-sm font-extrabold">
                      {liveRecon.isMatched ? 'METERS MATCHED PERFECTLY' : 'MACHINE COUNT MISMATCH DETECTED'}
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                      liveRecon.isMatched
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-600 text-white'
                    }`}
                  >
                    Diff: {liveRecon.difference} Clicks
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 text-xs bg-white/70 p-2.5 rounded-lg border border-slate-200/50">
                  <div>
                    <span className="text-slate-500 block">Machine Print Count:</span>
                    <strong className="text-slate-900 font-bold">{liveRecon.machinePrintCount} clicks</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Job Production Total:</span>
                    <strong className="text-slate-900 font-bold">{liveRecon.totalJobClicks} clicks</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Discrepancy:</span>
                    <strong className={liveRecon.difference !== 0 ? 'text-amber-700 font-bold' : 'text-emerald-700 font-bold'}>
                      {liveRecon.difference === 0 ? 'None (0)' : `${liveRecon.difference} clicks`}
                    </strong>
                  </div>
                </div>

                {/* If Mismatch: Enforce Mismatch Reason */}
                {!liveRecon.isMatched && (
                  <div className="mt-4 pt-3 border-t border-amber-200/80 space-y-2">
                    <label className="block text-xs font-bold text-amber-900">
                      Mandatory Mismatch Explanation Reason *
                    </label>
                    <textarea
                      required
                      disabled={isClosed}
                      rows={2}
                      value={mismatchReason}
                      onChange={(e) => setMismatchReason(e.target.value)}
                      placeholder="Explain reason for counter difference (e.g., test prints, unlogged jam clears, double clicks)..."
                      className="w-full p-2.5 text-xs bg-white border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-amber-700 block">
                      * This explanation will be permanently stamped in the audit log and day closure report.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Action Button */}
            {!isClosed && (
              <button
                type="submit"
                disabled={submitting || closingInput === ''}
                className="w-full py-3 bg-slate-900 hover:bg-black text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <span>{submitting ? 'Submitting Closure...' : 'Submit & Close Day'}</span>
              </button>
            )}
          </form>
        </div>

        {/* Right 1 Column: Guidelines & Information */}
        <div className="space-y-4">
          <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Day Closure Rules</span>
            </h3>

            <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
              <div className="p-2.5 bg-white/5 rounded-xl border border-white/5">
                <strong className="text-white block mb-0.5">1. Automatic Chaining</strong>
                Today's closing counter automatically becomes tomorrow's opening counter.
              </div>

              <div className="p-2.5 bg-white/5 rounded-xl border border-white/5">
                <strong className="text-white block mb-0.5">2. No Silent Alterations</strong>
                The system will never artificially modify the machine counter. Discrepancies are highlighted and audited.
              </div>

              <div className="p-2.5 bg-white/5 rounded-xl border border-white/5">
                <strong className="text-white block mb-0.5">3. Immutable Lock</strong>
                Once day closure is completed, operator submission is locked to prevent accidental duplication.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Day Closures Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center space-x-2">
          <History className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-bold text-slate-900">
            Historical Machine Meter Closures ({history.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Opening</th>
                <th className="py-3 px-4">Closing</th>
                <th className="py-3 px-4">Machine Clicks</th>
                <th className="py-3 px-4">Job Clicks</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Reason / Notes</th>
                <th className="py-3 px-4">Closed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No historical closing records yet.
                  </td>
                </tr>
              ) : (
                history.map((h: any) => (
                  <tr key={h.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{h.date}</td>
                    <td className="py-3 px-4">{h.openingCounter?.toLocaleString()}</td>
                    <td className="py-3 px-4">{h.closingCounter?.toLocaleString() || '-'}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {h.machinePrintCount !== undefined ? h.machinePrintCount.toLocaleString() : '-'}
                    </td>
                    <td className="py-3 px-4 text-emerald-700 font-bold">
                      {h.totalJobClicks?.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      {h.isClosed ? (
                        h.isMatched ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            MATCHED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            DIFF: {h.difference}
                          </span>
                        )
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                          ACTIVE
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-[200px] truncate text-slate-500">
                      {h.mismatchReason || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{h.closedByName || '-'}</td>
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
