'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  Boxes,
  DollarSign,
  Search,
  Layers,
  ExternalLink,
  Coins,
  Trash2,
  X,
  RotateCcw,
} from 'lucide-react';
import { reconcileMachineCounter } from '@/lib/calculations';

export default function DailyClosingPage() {
  const { user, isOwner, loading: authLoading } = useAuth();
  const router = useRouter();

  const [counterData, setCounterData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [stockSearchTerm, setStockSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'LOW'>('ALL');

  // Today's Form state
  const [openingInput, setOpeningInput] = useState<number | ''>('');
  const [closingInput, setClosingInput] = useState<number | ''>('');
  const [mismatchReason, setMismatchReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Inline edit state for Step 1 Opening Counter
  const [isEditingOpeningInline, setIsEditingOpeningInline] = useState(false);
  const [inlineOpeningVal, setInlineOpeningVal] = useState<number | ''>('');
  const [savingInlineOpening, setSavingInlineOpening] = useState(false);

  // Modal state for Editing any Counter (today or past history)
  const [editingCounter, setEditingCounter] = useState<any | null>(null);
  const [editModalOpening, setEditModalOpening] = useState<number | ''>('');
  const [editModalClosing, setEditModalClosing] = useState<number | ''>('');
  const [editModalReason, setEditModalReason] = useState('');
  const [editModalSubmitting, setEditModalSubmitting] = useState(false);
  const [editModalError, setEditModalError] = useState<string | null>(null);

  // Modal state for Deleting any Counter
  const [deletingCounter, setDeletingCounter] = useState<any | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchCounterInfo = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [todayRes, histRes, mediaRes] = await Promise.all([
        fetch('/api/counters/today'),
        fetch('/api/counters/history'),
        fetch('/api/media'),
      ]);

      if (todayRes.ok) {
        const d = await todayRes.json();
        setCounterData(d);
        const opVal = d.counter?.openingCounter || 1067426;
        setOpeningInput(opVal);
        setInlineOpeningVal(opVal);

        if (d.counter?.closingCounter) {
          setClosingInput(d.counter.closingCounter);
          if (d.counter.mismatchReason) {
            setMismatchReason(d.counter.mismatchReason);
          }
        } else {
          const defaultExpected = opVal + (d.totalJobClicksToday || 0);
          setClosingInput(defaultExpected);
        }
      } else {
        throw new Error('Could not load current meter status.');
      }

      if (histRes.ok) {
        const h = await histRes.json();
        setHistory(h.history || []);
      }

      if (mediaRes.ok) {
        const mData = await mediaRes.json();
        setMediaList(mData.media || []);
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

  const opening = editMode && openingInput !== '' ? Number(openingInput) : (counterData?.counter?.openingCounter || 1067426);
  const jobClicks = counterData?.totalJobClicksToday || 0;
  const isClosed = counterData?.counter?.isClosed || false;

  // Live reconciliation calculation for main card
  const closingVal = Number(closingInput) || opening;
  const liveRecon = reconcileMachineCounter({
    openingCounter: opening,
    closingCounter: closingVal,
    totalJobClicks: jobClicks,
  });

  // Stock calculations for closing time inspection
  const totalPhysicalSheets = mediaList.reduce((acc, m) => acc + (m.currentStock || 0), 0);
  const totalStockValue = mediaList.reduce(
    (acc, m) => acc + ((m.currentStock || 0) * (Number(m.costPerSheet) || 0)),
    0
  );
  const lowStockCount = mediaList.filter((m) => m.currentStock <= m.minimumStockLevel).length;

  const filteredStockMedia = mediaList.filter((m) => {
    const matchesSearch = stockSearchTerm
      ? m.name.toLowerCase().includes(stockSearchTerm.toLowerCase()) ||
        m.size.toLowerCase().includes(stockSearchTerm.toLowerCase()) ||
        m.brand?.toLowerCase().includes(stockSearchTerm.toLowerCase()) ||
        m.gsm.toString().includes(stockSearchTerm)
      : true;

    if (!matchesSearch) return false;
    if (stockFilter === 'LOW') return m.currentStock <= m.minimumStockLevel;
    return true;
  });

  // Save / Update Closing for Today
  const handleCloseDay = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const op = Number(openingInput !== '' ? openingInput : opening);
    if (closingInput === '' || Number(closingInput) < op) {
      setErrorMsg(`Closing counter must be greater than or equal to opening counter (${op.toLocaleString()}).`);
      return;
    }

    if (!liveRecon.isMatched && !mismatchReason.trim()) {
      setErrorMsg(
        `MACHINE COUNT MISMATCH: Difference of ${liveRecon.difference} clicks detected between machine meter and logged jobs. You MUST provide an explanatory reason before saving.`
      );
      return;
    }

    setSubmitting(true);
    try {
      if (editMode && counterData?.counter?.id) {
        // Update existing closing entry
        const res = await fetch(`/api/counters/${counterData.counter.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            openingCounter: op,
            closingCounter: Number(closingInput),
            mismatchReason: mismatchReason.trim() || undefined,
            isClosed: true,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update counter entry');

        setSuccessMsg('Machine counter entry updated successfully!');
        setEditMode(false);
      } else {
        // Regular closing
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
      }
      fetchCounterInfo();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred while saving closing count');
    } finally {
      setSubmitting(false);
    }
  };

  // Inline Save Opening Counter for Today (Step 1)
  const handleSaveInlineOpening = async () => {
    if (inlineOpeningVal === '' || Number(inlineOpeningVal) < 0) {
      setErrorMsg('Please enter a valid positive opening counter reading.');
      return;
    }
    setSavingInlineOpening(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/counters/${counterData.counter.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          openingCounter: Number(inlineOpeningVal),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update opening counter');

      setSuccessMsg(`Opening counter successfully updated to ${Number(inlineOpeningVal).toLocaleString()}!`);
      setIsEditingOpeningInline(false);
      fetchCounterInfo();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save opening counter');
    } finally {
      setSavingInlineOpening(false);
    }
  };

  // Open Edit Modal for any counter record
  const handleOpenEditModal = (entry: any) => {
    setEditingCounter(entry);
    setEditModalOpening(entry.openingCounter);
    setEditModalClosing(entry.closingCounter !== null ? entry.closingCounter : '');
    setEditModalReason(entry.mismatchReason || '');
    setEditModalError(null);
  };

  // Save from Edit Modal
  const handleSaveModalEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCounter) return;
    setEditModalError(null);

    const op = Number(editModalOpening);
    if (isNaN(op) || op < 0) {
      setEditModalError('Invalid opening counter reading.');
      return;
    }

    let cl: number | null = null;
    if (editModalClosing !== '') {
      cl = Number(editModalClosing);
      if (isNaN(cl) || cl < op) {
        setEditModalError(`Closing counter must be greater than or equal to opening counter (${op.toLocaleString()}).`);
        return;
      }

      // Check reconciliation
      const recon = reconcileMachineCounter({
        openingCounter: op,
        closingCounter: cl,
        totalJobClicks: editingCounter.totalJobClicks || 0,
      });

      if (!recon.isMatched && !editModalReason.trim()) {
        setEditModalError(
          `Difference of ${recon.difference} clicks detected. Please enter an explanation reason.`
        );
        return;
      }
    }

    setEditModalSubmitting(true);
    try {
      const res = await fetch(`/api/counters/${editingCounter.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          openingCounter: op,
          closingCounter: cl,
          mismatchReason: editModalReason.trim() || undefined,
          isClosed: cl !== null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update counter record');

      setSuccessMsg(`Counter entry for ${editingCounter.date} updated successfully!`);
      setEditingCounter(null);
      fetchCounterInfo();
    } catch (err: any) {
      setEditModalError(err.message || 'Failed to update counter entry');
    } finally {
      setEditModalSubmitting(false);
    }
  };

  // Open Delete Modal
  const handleOpenDeleteModal = (entry: any) => {
    setDeletingCounter(entry);
    setDeleteError(null);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingCounter) return;
    setDeleteSubmitting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/counters/${deletingCounter.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete counter entry');

      setSuccessMsg(data.message || `Counter entry for ${deletingCounter.date} deleted. You can now make a fresh entry.`);
      setDeletingCounter(null);
      setEditMode(false);
      fetchCounterInfo();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete counter entry');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-full bg-slate-900 border-2 border-yellow-400 p-0.5 flex items-center justify-center shadow-md shadow-yellow-400/20 flex-shrink-0">
            <img src="/logo-icon.png" alt="Print Bazzar" className="w-full h-full object-contain rounded-full" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black text-slate-950 tracking-tight">
                Machine Counter &amp; Shift Closing
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-yellow-400 text-slate-950 border border-yellow-400">
                Daily Reconciliation
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Daily press meter reconciliation, discrepancy verification, and meter corrections
            </p>
          </div>
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
        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 flex items-start space-x-3 text-slate-950 text-xs shadow-xs animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 font-bold text-emerald-900">{successMsg}</div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start space-x-3 text-red-700 text-xs shadow-xs">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 font-semibold">{errorMsg}</div>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
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
                ) : editMode ? (
                  <span className="px-2.5 py-0.5 text-[11px] font-extrabold bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded-full flex items-center space-x-1">
                    <Edit2 className="w-3 h-3" />
                    <span>EDITING COUNTER ENTRY</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 text-[11px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full flex items-center space-x-1">
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

          {/* Action Buttons for Today */}
          <div className="flex flex-wrap items-center gap-2">
            {isClosed && !editMode && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditMode(true);
                    setOpeningInput(counterData.counter.openingCounter);
                    setClosingInput(counterData.counter.closingCounter || '');
                    setMismatchReason(counterData.counter.mismatchReason || '');
                  }}
                  className="flex items-center space-x-1.5 px-3.5 py-2 bg-yellow-400 hover:bg-yellow-500 text-slate-950 text-xs font-extrabold rounded-xl transition shadow-xs"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Opening / Closing Count</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenDeleteModal(counterData.counter)}
                  className="flex items-center space-x-1.5 px-3.5 py-2 bg-red-600/90 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition border border-red-500/30"
                  title="Delete today's closing entry to start completely fresh"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete &amp; Re-enter Fresh</span>
                </button>
              </>
            )}

            {editMode && (
              <button
                type="button"
                onClick={() => handleOpenDeleteModal(counterData.counter)}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-red-600/90 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition border border-red-500/30"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete &amp; Start Fresh</span>
              </button>
            )}
          </div>
        </div>

        {/* Edit Mode Alert Banner */}
        {editMode && (
          <div className="bg-amber-50 border-b border-amber-200 p-4 flex items-center justify-between text-amber-900 text-xs font-medium">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                <strong>Editing Mode Active:</strong> You can correct the <strong>Opening Counter</strong>, <strong>Closing Counter</strong>, or update the <strong>Mismatch Reason</strong> below.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditMode(false);
                fetchCounterInfo();
              }}
              className="text-amber-800 hover:text-amber-950 font-bold underline ml-4 flex-shrink-0"
            >
              Cancel Edit
            </button>
          </div>
        )}

        {/* 3 Step Reconciliation Form */}
        <form onSubmit={handleCloseDay} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1: Opening Counter */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 relative">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">1. Opening Counter</span>
                {!editMode && !isClosed && (
                  <button
                    type="button"
                    onClick={() => {
                      setInlineOpeningVal(opening);
                      setIsEditingOpeningInline(!isEditingOpeningInline);
                    }}
                    className="flex items-center space-x-1 px-2 py-0.5 text-[11px] font-bold text-yellow-800 bg-yellow-100 hover:bg-yellow-200 rounded-lg transition"
                    title="Correct opening counter reading"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>{isEditingOpeningInline ? 'Cancel' : 'Edit Opening'}</span>
                  </button>
                )}
                {(editMode || isClosed) && (
                  <ShieldCheck className="w-4 h-4 text-slate-400" />
                )}
              </div>

              {/* View or Edit Opening */}
              {editMode ? (
                <div>
                  <input
                    type="number"
                    required
                    min={0}
                    value={openingInput}
                    onChange={(e) => setOpeningInput(e.target.value === '' ? '' : parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-white border-2 border-yellow-400 rounded-xl text-xl font-black text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    placeholder="Enter opening count"
                  />
                  <span className="text-[10px] text-amber-700 font-bold block mt-1">
                    ✏️ Editing opening reading for this date
                  </span>
                </div>
              ) : isEditingOpeningInline ? (
                <div className="space-y-2 pt-1 animate-fade-in">
                  <input
                    type="number"
                    required
                    min={0}
                    value={inlineOpeningVal}
                    onChange={(e) => setInlineOpeningVal(e.target.value === '' ? '' : parseInt(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white border-2 border-yellow-400 rounded-xl text-lg font-black text-slate-900 font-mono focus:outline-none"
                    placeholder="Opening count"
                  />
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      disabled={savingInlineOpening}
                      onClick={handleSaveInlineOpening}
                      className="px-3 py-1 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-[11px] rounded-lg shadow-xs transition disabled:opacity-50"
                    >
                      {savingInlineOpening ? 'Saving...' : 'Save Opening'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingOpeningInline(false)}
                      className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[11px] rounded-lg transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-2xl font-black text-slate-900 font-mono">
                  {opening.toLocaleString()}
                </div>
              )}

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
                  {isClosed && !editMode ? 'Locked & Closed' : editMode ? 'Editing Entry' : 'Ready to Close'}
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
                  onClick={() => {
                    setEditMode(false);
                    fetchCounterInfo();
                  }}
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
                <span>{submitting ? 'Saving...' : editMode ? 'Save & Update Counter' : 'Lock & Close Day'}</span>
              </button>
            </div>
          )}
        </form>
      </div>

      {/* End-of-Day Inventory Stock Count & Material Valuation Verification */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Section Header Strip */}
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-slate-900 to-slate-950 text-white">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 bg-yellow-400 text-slate-950 rounded-xl font-bold">
              <Boxes className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-black text-white">
                  Closing Time Inventory Stock &amp; Valuation Check
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full">
                  Material In Hand
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Verify physical paper sheet count and total material asset valuation before day close
              </p>
            </div>
          </div>

          <Link
            href="/inventory"
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-yellow-400 text-xs font-bold rounded-xl transition border border-white/15 self-start md:self-auto"
          >
            <span>Open Stock Console</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* 3 Metric Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 bg-slate-50/50 border-b border-slate-200">
          <div className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Overall Stock Valuation</span>
              <div className="text-xl font-black text-emerald-700 font-mono mt-0.5">
                ₹{totalStockValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Total material cost in hand</span>
            </div>
            <div className="p-2.5 bg-emerald-100/60 text-emerald-800 rounded-xl font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Sheets In Stock</span>
              <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
                {totalPhysicalSheets.toLocaleString()} Sheets
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Across {mediaList.length} media catalog types</span>
            </div>
            <div className="p-2.5 bg-yellow-400/20 text-slate-950 rounded-xl font-bold">
              <Boxes className="w-5 h-5 text-yellow-700" />
            </div>
          </div>

          <div className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Low Stock Safety Alerts</span>
              <div className="text-xl font-black text-red-600 font-mono mt-0.5">
                {lowStockCount} Items
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Need replenishment soon</span>
            </div>
            <div className="p-2.5 bg-red-100/60 text-red-700 rounded-xl font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search closing stock by paper name, GSM..."
              value={stockSearchTerm}
              onChange={(e) => setStockSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 font-medium"
            />
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setStockFilter('ALL')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                stockFilter === 'ALL'
                  ? 'bg-slate-950 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Items ({mediaList.length})
            </button>
            <button
              onClick={() => setStockFilter('LOW')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center space-x-1 ${
                stockFilter === 'LOW'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Low Stock ({lowStockCount})</span>
            </button>
          </div>
        </div>

        {/* Stock Breakdown Table */}
        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 border-b border-slate-200 bg-opacity-95 backdrop-blur-xs">
              <tr>
                <th className="py-2.5 px-4">Paper / Media</th>
                <th className="py-2.5 px-4">GSM</th>
                <th className="py-2.5 px-4">Size</th>
                <th className="py-2.5 px-4">Cost / Sheet</th>
                <th className="py-2.5 px-4">Stock in Hand</th>
                <th className="py-2.5 px-4">Stock Valuation</th>
                <th className="py-2.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredStockMedia.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400">
                    No matching paper stock items.
                  </td>
                </tr>
              ) : (
                filteredStockMedia.map((m) => {
                  const isLow = m.currentStock <= m.minimumStockLevel;
                  const unitCost = Number(m.costPerSheet) || 0;
                  const rowValuation = (m.currentStock || 0) * unitCost;

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-4 font-bold text-slate-900">
                        {m.name}
                        <span className="text-[10px] text-slate-400 font-normal block">{m.brand || 'Generic'}</span>
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-700">{m.gsm} GSM</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-700">{m.size}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-900 font-mono">₹{unitCost.toFixed(2)}</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                        <span className={isLow ? 'text-red-600 font-black' : 'text-slate-900'}>
                          {m.currentStock.toLocaleString()} sheets
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono font-black text-emerald-700">
                        ₹{rowValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-4">
                        {isLow ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 rounded-full inline-flex items-center space-x-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>LOW STOCK</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-yellow-100 text-slate-950 border border-yellow-300 rounded-full inline-flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3 text-yellow-600" />
                            <span>OK</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historical Daily Closings Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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
          <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg self-start sm:self-auto">
            Click ✏️ Edit or 🗑️ Delete to correct any day's counts
          </span>
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
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No historical machine closings recorded yet.
                  </td>
                </tr>
              ) : (
                history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{h.date}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">{h.openingCounter?.toLocaleString()}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {h.closingCounter !== null ? h.closingCounter?.toLocaleString() : <span className="text-slate-400 italic">Active</span>}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-yellow-800 font-bold">
                      {h.machinePrintCount !== null ? h.machinePrintCount?.toLocaleString() : '-'}
                    </td>
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
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(h)}
                          className="p-1.5 hover:bg-yellow-100 text-yellow-800 rounded-lg transition border border-transparent hover:border-yellow-300"
                          title="Edit opening/closing counter"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDeleteModal(h)}
                          className="p-1.5 hover:bg-red-100 text-red-600 rounded-lg transition border border-transparent hover:border-red-300"
                          title="Delete entry and re-enter"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Edit Counter Entry Modal */}
      {editingCounter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-950 p-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-400 text-slate-950 rounded-xl font-bold">
                  <Edit2 className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Edit Machine Counter</h3>
                  <p className="text-xs text-slate-400">Date: {editingCounter.date}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingCounter(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveModalEdit} className="p-6 space-y-5">
              {editModalError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <span className="font-semibold">{editModalError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Opening Counter *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editModalOpening}
                    onChange={(e) => setEditModalOpening(e.target.value === '' ? '' : parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Baseline meter reading</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Closing Counter
                  </label>
                  <input
                    type="number"
                    min={Number(editModalOpening) || 0}
                    value={editModalClosing}
                    onChange={(e) => setEditModalClosing(e.target.value === '' ? '' : parseInt(e.target.value))}
                    placeholder="Leave blank if shift active"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">End-of-day meter reading</span>
                </div>
              </div>

              {/* Live Preview Inside Modal */}
              {editModalClosing !== '' && Number(editModalClosing) >= Number(editModalOpening) && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-500 font-bold border-b border-slate-200 pb-1.5 text-[11px] uppercase tracking-wider">
                    <span>Reconciliation Preview</span>
                    {Number(editModalClosing) - Number(editModalOpening) === (editingCounter.totalJobClicks || 0) ? (
                      <span className="text-yellow-700 font-extrabold flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>MATCHED</span>
                      </span>
                    ) : (
                      <span className="text-red-600 font-extrabold flex items-center space-x-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>MISMATCH</span>
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Machine Clicks</span>
                      <strong className="text-slate-900 text-xs">
                        {Number(editModalClosing) - Number(editModalOpening)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Job Ledger</span>
                      <strong className="text-slate-900 text-xs">{editingCounter.totalJobClicks || 0}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Difference</span>
                      <strong
                        className={`text-xs ${
                          Number(editModalClosing) - Number(editModalOpening) === (editingCounter.totalJobClicks || 0)
                            ? 'text-yellow-700'
                            : 'text-red-600'
                        }`}
                      >
                        {Number(editModalClosing) - Number(editModalOpening) - (editingCounter.totalJobClicks || 0)}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Discrepancy Reason Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Discrepancy / Mismatch Reason
                </label>
                <input
                  type="text"
                  value={editModalReason}
                  onChange={(e) => setEditModalReason(e.target.value)}
                  placeholder="Required if machine prints don't match job clicks..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCounter(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editModalSubmitting}
                  className="px-5 py-2 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-xs rounded-xl transition shadow-xs disabled:opacity-50"
                >
                  {editModalSubmitting ? 'Saving...' : 'Update Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Delete Counter Confirmation Modal */}
      {deletingCounter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            {/* Modal Header */}
            <div className="bg-red-600 p-5 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 text-white rounded-xl font-bold">
                  <Trash2 className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Delete Counter Record</h3>
                  <p className="text-xs text-red-100">Date: {deletingCounter.date}</p>
                </div>
              </div>
              <button
                onClick={() => setDeletingCounter(null)}
                className="p-1.5 text-red-200 hover:text-white rounded-lg hover:bg-red-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {deleteError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <span className="font-semibold">{deleteError}</span>
                </div>
              )}

              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to delete this daily counter entry for <strong>{deletingCounter.date}</strong>?
              </p>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Opening Reading:</span>
                  <strong className="text-slate-900">{deletingCounter.openingCounter?.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Closing Reading:</span>
                  <strong className="text-slate-900">{deletingCounter.closingCounter ? deletingCounter.closingCounter?.toLocaleString() : 'Not Closed'}</strong>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 font-medium">
                💡 <strong>What happens when you delete:</strong>
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  <li>The closing record for this date is completely removed.</li>
                  <li>The machine counter rolls back to the previous valid reading.</li>
                  <li>You will be able to make a <strong>fresh, clean opening &amp; closing entry</strong> immediately.</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeletingCounter(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteSubmitting}
                  onClick={handleConfirmDelete}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl transition shadow-xs flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{deleteSubmitting ? 'Deleting...' : 'Yes, Delete & Start Fresh'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
