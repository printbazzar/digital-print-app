'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import {
  Printer,
  Layers,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Upload,
  ArrowRight,
  RefreshCw,
  Info,
  DollarSign,
  FileCheck,
} from 'lucide-react';
import { calculateJobProduction, PrintSide, PaperSize, PrintType } from '@/lib/calculations';

export default function ProductionEntryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Master lists
  const [machines, setMachines] = useState<any[]>([]);
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [wastageReasons, setWastageReasons] = useState<any[]>([]);
  const [rates, setRates] = useState<any[]>([]);

  // Form State
  const [jobNumber, setJobNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [product, setProduct] = useState('');
  const [orderedQuantity, setOrderedQuantity] = useState<number | ''>('');
  const [printType, setPrintType] = useState<PrintType>('COLOUR');
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [printSide, setPrintSide] = useState<PrintSide>('SINGLE');
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [selectedMediaId, setSelectedMediaId] = useState('');
  const [goodPrints, setGoodPrints] = useState<number | ''>('');
  const [wastage, setWastage] = useState<number | ''>(0);
  const [reprint, setReprint] = useState<number | ''>(0);
  const [reprintType, setReprintType] = useState<'PRODUCTION_REPRINT' | 'CUSTOMER_ADDITIONAL'>('PRODUCTION_REPRINT');
  const [wastageReasonId, setWastageReasonId] = useState('');
  const [wastageReasonOther, setWastageReasonOther] = useState('');
  const [wastagePhotoUrl, setWastagePhotoUrl] = useState('');
  const [remarks, setRemarks] = useState('');

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading]);

  // Load masters
  useEffect(() => {
    const loadMasters = async () => {
      try {
        const [machRes, medRes, wrRes, ratesRes] = await Promise.all([
          fetch('/api/machines'),
          fetch('/api/media'),
          fetch('/api/wastage-reasons'),
          fetch('/api/rates'),
        ]);

        if (machRes.ok) {
          const d = await machRes.json();
          setMachines(d.machines || []);
          if (d.machines?.length > 0) setSelectedMachineId(d.machines[0].id);
        }
        if (medRes.ok) {
          const d = await medRes.json();
          setMediaList(d.media || []);
          if (d.media?.length > 0) setSelectedMediaId(d.media[0].id);
        }
        if (wrRes.ok) {
          const d = await wrRes.json();
          setWastageReasons(d.reasons || []);
        }
        if (ratesRes.ok) {
          const d = await ratesRes.json();
          setRates(d.rates || []);
        }
      } catch (err) {
        console.error('Failed to load masters:', err);
      }
    };

    if (user) {
      loadMasters();
      // Generate default job number
      const rand = Math.floor(1000 + Math.random() * 9000);
      setJobNumber(`PB-${new Date().getFullYear()}-${rand}`);
    }
  }, [user]);

  // Find active rate for preview
  const activeRate = rates.find(
    (r) =>
      r.machineId === selectedMachineId &&
      r.paperSize === paperSize &&
      r.printType === printType
  );

  const selectedMedia = mediaList.find((m) => m.id === selectedMediaId);

  // Live calculation preview
  const g = Number(goodPrints) || 0;
  const w = Number(wastage) || 0;
  const r = Number(reprint) || 0;
  const unitRateVal = activeRate?.rate ?? (paperSize === 'A3' ? (printType === 'COLOUR' ? 4.25 : 1.10) : (printType === 'COLOUR' ? 2.90 : 1.10));
  const gstPercentVal = activeRate?.gstPercent ?? 18.0;

  const liveCalc = calculateJobProduction({
    goodPrints: g,
    wastage: w,
    reprint: r,
    printSide,
    unitRate: unitRateVal,
    gstPercent: gstPercentVal,
  });

  const isStockAvailable = selectedMedia ? selectedMedia.currentStock >= liveCalc.sheetConsumption : true;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setWastagePhotoUrl(data.url);
    } catch (err: any) {
      setErrorMsg(`Photo upload failed: ${err.message}`);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessResult(null);

    if (!jobNumber.trim() || !customerName.trim() || !product.trim()) {
      setErrorMsg('Please fill in Job Number, Customer Name, and Product.');
      return;
    }

    if (!orderedQuantity || Number(orderedQuantity) <= 0) {
      setErrorMsg('Ordered quantity must be greater than 0.');
      return;
    }

    if (goodPrints === '' || Number(goodPrints) < 0) {
      setErrorMsg('Please enter good prints count.');
      return;
    }

    if (w > 0 && !wastageReasonId) {
      setErrorMsg('Please select a Wastage Reason for the recorded wastage.');
      return;
    }

    if (!isStockAvailable) {
      setErrorMsg(`Insufficient stock: Only ${selectedMedia?.currentStock} sheets available in inventory.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobNumber: jobNumber.trim(),
          customerName: customerName.trim(),
          product: product.trim(),
          orderedQuantity: Number(orderedQuantity),
          printType,
          paperSize,
          printSide,
          mediaId: selectedMediaId,
          machineId: selectedMachineId,
          goodPrints: Number(goodPrints),
          wastage: w,
          reprint: r,
          reprintType: r > 0 ? reprintType : undefined,
          wastageReasonId: w > 0 ? wastageReasonId : undefined,
          wastageReasonOther: w > 0 && wastageReasonId === 'wr-10' ? wastageReasonOther : undefined,
          wastagePhotoUrl: wastagePhotoUrl || undefined,
          remarks: remarks.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save production entry');
      }

      setSuccessResult(data.job);
      // Refresh media inventory
      const medRes = await fetch('/api/media');
      if (medRes.ok) {
        const d = await medRes.json();
        setMediaList(d.media || []);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForNext = () => {
    const rand = Math.floor(1000 + Math.random() * 9000);
    setJobNumber(`PB-${new Date().getFullYear()}-${rand}`);
    setCustomerName('');
    setProduct('');
    setOrderedQuantity('');
    setGoodPrints('');
    setWastage(0);
    setReprint(0);
    setWastageReasonId('');
    setWastageReasonOther('');
    setWastagePhotoUrl('');
    setRemarks('');
    setSuccessResult(null);
    setErrorMsg(null);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Printer className="w-5 h-5 text-emerald-600" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Production Entry
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Konica Minolta C3070
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Fast, touch-optimized job production entry with instant sheet deduction & click calculation
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleResetForNext}
            className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Form</span>
          </button>
        </div>
      </div>

      {/* Success Confirmation Card */}
      {successResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-emerald-950 shadow-md">
          <div className="flex items-start space-x-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h2 className="text-base font-bold text-emerald-900">
                Production Entry Saved Successfully!
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 bg-white/80 p-3.5 rounded-xl border border-emerald-200 text-xs">
                <div>
                  <span className="text-slate-500 font-medium block">Job Number:</span>
                  <strong className="text-slate-900 font-extrabold text-sm">{successResult.jobNumber}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Machine Clicks:</span>
                  <strong className="text-emerald-700 font-extrabold text-sm">{successResult.machineClicks} clicks</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Sheets Consumed:</span>
                  <strong className="text-slate-900 font-extrabold text-sm">{successResult.sheetConsumption} sheets</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Total Cost:</span>
                  <strong className="text-purple-900 font-extrabold text-sm">₹{successResult.grandTotalCost}</strong>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleResetForNext}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-1.5"
                >
                  <span>Enter Next Job</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start space-x-3 text-red-700 text-xs shadow-xs">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 font-semibold">{errorMsg}</div>
        </div>
      )}

      {/* Production Entry Form */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Form Fields */}
        <div className="lg:col-span-2 space-y-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          {/* Section 1: Job Header */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
              <span>1. Job & Customer Specification</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Job Number *
                </label>
                <input
                  type="text"
                  required
                  value={jobNumber}
                  onChange={(e) => setJobNumber(e.target.value)}
                  placeholder="PB-2026-0001"
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Apex Marketing"
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Product *
                </label>
                <input
                  type="text"
                  required
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  placeholder="e.g. Visiting Cards, Brochure"
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ordered Quantity (Units / Sheets) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={orderedQuantity}
                onChange={(e) => setOrderedQuantity(e.target.value ? Number(e.target.value) : '')}
                placeholder="100"
                className="w-full sm:w-1/3 px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 2: Press & Print Configuration */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
              <span>2. Print & Media Parameters</span>
            </h3>

            {/* Print Type, Paper Size, Side Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Print Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Print Mode
                </label>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setPrintType('COLOUR')}
                    className={`py-2 text-xs font-bold rounded-lg transition ${
                      printType === 'COLOUR'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Colour
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintType('BW')}
                    className={`py-2 text-xs font-bold rounded-lg transition ${
                      printType === 'BW'
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    B&W
                  </button>
                </div>
              </div>

              {/* Paper Size */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Paper Size
                </label>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setPaperSize('A4')}
                    className={`py-2 text-xs font-bold rounded-lg transition ${
                      paperSize === 'A4'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    A4
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaperSize('A3')}
                    className={`py-2 text-xs font-bold rounded-lg transition ${
                      paperSize === 'A3'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    A3
                  </button>
                </div>
              </div>

              {/* Side (Single vs Double) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Sides (Duplex / Simplex)
                </label>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setPrintSide('SINGLE')}
                    className={`py-2 text-xs font-bold rounded-lg transition ${
                      printSide === 'SINGLE'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    1-Side (1 clk)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintSide('DOUBLE')}
                    className={`py-2 text-xs font-bold rounded-lg transition ${
                      printSide === 'DOUBLE'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    2-Side (2 clk)
                  </button>
                </div>
              </div>
            </div>

            {/* Media Dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Select Media / Paper Stock *
              </label>
              <select
                value={selectedMediaId}
                onChange={(e) => setSelectedMediaId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {mediaList.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.gsm} GSM {m.name} ({m.size}) — {m.brand || 'Generic'} [Stock: {m.currentStock} sheets]
                  </option>
                ))}
              </select>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 3: Production Counts */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
              <span>3. Actual Shift Output Counts</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Good Prints (Physical Sheets) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={goodPrints}
                  onChange={(e) => setGoodPrints(e.target.value ? Number(e.target.value) : '')}
                  placeholder="e.g. 100"
                  className="w-full px-3 py-2 text-sm font-bold text-emerald-900 bg-emerald-50/50 border border-emerald-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Wastage (Sheets)
                </label>
                <input
                  type="number"
                  min="0"
                  value={wastage}
                  onChange={(e) => setWastage(e.target.value ? Number(e.target.value) : 0)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-sm font-bold text-red-900 bg-red-50/50 border border-red-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reprint (Sheets)
                </label>
                <input
                  type="number"
                  min="0"
                  value={reprint}
                  onChange={(e) => setReprint(e.target.value ? Number(e.target.value) : 0)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-sm font-bold text-blue-900 bg-blue-50/50 border border-blue-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* If Reprint > 0: Reprint Scenario */}
            {r > 0 && (
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
                <label className="block text-xs font-bold text-blue-900 mb-1">
                  Reprint Scenario Type
                </label>
                <div className="flex gap-3">
                  <label className="flex items-center space-x-1.5 text-xs text-slate-700 font-medium">
                    <input
                      type="radio"
                      name="reprintType"
                      checked={reprintType === 'PRODUCTION_REPRINT'}
                      onChange={() => setReprintType('PRODUCTION_REPRINT')}
                    />
                    <span>1. Production Reprint</span>
                  </label>
                  <label className="flex items-center space-x-1.5 text-xs text-slate-700 font-medium">
                    <input
                      type="radio"
                      name="reprintType"
                      checked={reprintType === 'CUSTOMER_ADDITIONAL'}
                      onChange={() => setReprintType('CUSTOMER_ADDITIONAL')}
                    />
                    <span>2. Customer Additional Requirement</span>
                  </label>
                </div>
              </div>
            )}

            {/* If Wastage > 0: Reason Dropdown & Photo Upload */}
            {w > 0 && (
              <div className="p-4 bg-red-50/50 border border-red-200 rounded-xl space-y-3">
                <div className="flex items-center space-x-1.5 text-red-800 font-bold text-xs">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span>Wastage Reason & Documentation Required</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Wastage Reason *
                    </label>
                    <select
                      required
                      value={wastageReasonId}
                      onChange={(e) => setWastageReasonId(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold bg-white border border-red-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                    >
                      <option value="">-- Select Wastage Reason --</option>
                      {wastageReasons.map((wr) => (
                        <option key={wr.id} value={wr.id}>
                          {wr.reason}
                        </option>
                      ))}
                    </select>
                  </div>

                  {wastageReasonId === 'wr-10' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Specify Other Reason *
                      </label>
                      <input
                        type="text"
                        required
                        value={wastageReasonOther}
                        onChange={(e) => setWastageReasonOther(e.target.value)}
                        placeholder="Explain specific cause..."
                        className="w-full px-3 py-2 text-xs font-semibold bg-white border border-red-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* Optional Photo Upload */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Optional Wastage Photo Evidence
                  </label>
                  <div className="flex items-center space-x-3">
                    <label className="cursor-pointer px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center space-x-1.5 transition">
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                      <span>{uploadingPhoto ? 'Uploading...' : 'Upload Photo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                    {wastagePhotoUrl && (
                      <span className="text-xs font-semibold text-emerald-700 flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Photo attached</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Remarks / Notes
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional operator notes..."
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Right 1 Column: Live Authoritative Calculation Summary */}
        <div className="space-y-5">
          <div className="bg-gradient-to-b from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-xl border border-slate-700 space-y-4 sticky top-20">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
              <div className="flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                  Live Calculations
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Authoritative Math
              </span>
            </div>

            {/* Click & Sheet Metrics */}
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Physical Sheets Consumed:</span>
                <span className="font-extrabold text-base text-white">
                  {liveCalc.sheetConsumption} sheets
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Machine Clicks Generated:</span>
                <span className="font-extrabold text-base text-emerald-400">
                  {liveCalc.machineClicks} clicks
                </span>
              </div>

              <div className="text-[11px] text-slate-400 bg-white/5 p-2 rounded-lg leading-relaxed">
                Formula: {liveCalc.sheetConsumption} sheets × {printSide === 'DOUBLE' ? '2 clicks (Duplex)' : '1 click (Simplex)'} = <strong>{liveCalc.machineClicks} clicks</strong>
              </div>

              {/* Stock Status Badge */}
              <div className="py-2">
                <span className="text-slate-400 block mb-1">Inventory Verification:</span>
                {selectedMedia ? (
                  isStockAvailable ? (
                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between">
                      <span>Stock Available ({selectedMedia.currentStock} sheets)</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                  ) : (
                    <div className="p-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 flex items-center justify-between">
                      <span>Insufficient ({selectedMedia.currentStock} sheets)</span>
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    </div>
                  )
                ) : (
                  <span className="text-slate-500">No media selected</span>
                )}
              </div>

              {/* Cost Calculation */}
              <div className="pt-2 border-t border-white/10 space-y-1.5">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Base Print Rate:</span>
                  <span className="font-semibold text-white">₹{liveCalc.unitCost} / click</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Base Cost:</span>
                  <span className="font-semibold text-white">₹{liveCalc.totalCost}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>GST (18%):</span>
                  <span className="font-semibold text-white">₹{liveCalc.gstAmount}</span>
                </div>
                <div className="flex items-center justify-between text-emerald-400 font-extrabold text-sm pt-2 border-t border-white/10">
                  <span>Grand Total Cost:</span>
                  <span>₹{liveCalc.grandTotalCost}</span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !isStockAvailable}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 transition disabled:opacity-50"
            >
              <FileCheck className="w-4 h-4" />
              <span>{submitting ? 'Saving Production...' : 'Save Production Job'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
