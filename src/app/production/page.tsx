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
  ShieldCheck,
} from 'lucide-react';
import { calculateJobProduction, PrintSide, PaperSize, PrintType } from '@/lib/calculations';

export default function ProductionEntryPage() {
  const { user, loading: authLoading, isOwner } = useAuth();
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
      const rand = Math.floor(1000 + Math.random() * 9000);
      setJobNumber(`PB-${new Date().getFullYear()}-${rand}`);
    }
  }, [user]);

  // Find active rate
  const activeRate = rates.find(
    (r) =>
      r.machineId === selectedMachineId &&
      r.paperSize === paperSize &&
      r.printType === printType
  );
  const unitRateVal = activeRate ? activeRate.rate : (paperSize === 'A3' ? (printType === 'COLOUR' ? 4.25 : 1.10) : (printType === 'COLOUR' ? 2.90 : 1.10));
  const gstPercentVal = activeRate?.gstPercent !== undefined ? activeRate.gstPercent : 18.0;

  // Live calculations
  const g = typeof goodPrints === 'number' ? goodPrints : 0;
  const w = typeof wastage === 'number' ? wastage : 0;
  const rep = typeof reprint === 'number' ? reprint : 0;

  const liveCalc = calculateJobProduction({
    goodPrints: g,
    wastage: w,
    reprint: rep,
    printSide,
    unitRate: unitRateVal,
    gstPercent: gstPercentVal,
  });

  const selectedMedia = mediaList.find((m) => m.id === selectedMediaId);
  const isStockAvailable = selectedMedia ? selectedMedia.currentStock >= liveCalc.sheetConsumption : true;

  // Handle Photo Upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (res.ok && json.url) {
        setWastagePhotoUrl(json.url);
      } else {
        alert(json.error || 'Failed to upload image');
      }
    } catch (err: any) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessResult(null);

    if (g <= 0) {
      setErrorMsg('Good Prints produced must be greater than 0.');
      return;
    }

    if (!selectedMachineId) {
      setErrorMsg('Please select a printing machine.');
      return;
    }

    if (!selectedMediaId) {
      setErrorMsg('Please select a paper media.');
      return;
    }

    if (w > 0 && !wastageReasonId) {
      setErrorMsg('Wastage Reason is required when wastage is greater than 0.');
      return;
    }

    if (!isStockAvailable) {
      setErrorMsg(
        `Insufficient Media Stock! Required: ${liveCalc.sheetConsumption} sheets, Available: ${selectedMedia?.currentStock || 0} sheets.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        jobNumber,
        customerName,
        product,
        orderedQuantity: typeof orderedQuantity === 'number' ? orderedQuantity : g,
        printType,
        paperSize,
        printSide,
        mediaId: selectedMediaId,
        machineId: selectedMachineId,
        goodPrints: g,
        wastage: w,
        reprint: rep,
        reprintType: rep > 0 ? reprintType : undefined,
        wastageReasonId: w > 0 ? wastageReasonId : undefined,
        wastageReasonOther: w > 0 && wastageReasonId === 'wr-10' ? wastageReasonOther : undefined,
        wastagePhotoUrl: wastagePhotoUrl || undefined,
        remarks: remarks || undefined,
      };

      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save production entry');
      }

      setSuccessResult(data.job);
      setMediaList((prev) =>
        prev.map((m) =>
          m.id === selectedMediaId
            ? { ...m, currentStock: m.currentStock - liveCalc.sheetConsumption }
            : m
        )
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForNext = () => {
    setSuccessResult(null);
    setGoodPrints('');
    setWastage(0);
    setReprint(0);
    setWastageReasonId('');
    setWastageReasonOther('');
    setWastagePhotoUrl('');
    setRemarks('');
    setOrderedQuantity('');
    setCustomerName('');
    setProduct('');
    const rand = Math.floor(1000 + Math.random() * 9000);
    setJobNumber(`PB-${new Date().getFullYear()}-${rand}`);
  };

  if (authLoading) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Printer className="w-5 h-5 text-yellow-600" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Production Entry
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-yellow-100 text-slate-950 border border-yellow-300">
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
        <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-6 text-slate-950 shadow-md animate-fade-in">
          <div className="flex items-start space-x-3">
            <CheckCircle2 className="w-6 h-6 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h2 className="text-base font-black text-slate-950">
                Production Entry Saved Successfully!
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 bg-white p-3.5 rounded-xl border border-yellow-300 text-xs">
                <div>
                  <span className="text-slate-500 font-medium block">Job Number:</span>
                  <strong className="text-slate-900 font-extrabold text-sm">{successResult.jobNumber}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Machine Clicks:</span>
                  <strong className="text-yellow-700 font-extrabold text-sm">{successResult.machineClicks} clicks</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Sheets Consumed:</span>
                  <strong className="text-slate-900 font-extrabold text-sm">{successResult.sheetConsumption} sheets</strong>
                </div>
                {isOwner ? (
                  <div>
                    <span className="text-slate-500 font-medium block">Total Cost:</span>
                    <strong className="text-purple-900 font-extrabold text-sm">₹{successResult.grandTotalCost}</strong>
                  </div>
                ) : (
                  <div>
                    <span className="text-slate-500 font-medium block">Operator:</span>
                    <strong className="text-slate-800 font-extrabold text-sm">{successResult.operatorName}</strong>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleResetForNext}
                  className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center space-x-1.5"
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
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 focus:outline-none"
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
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 focus:outline-none"
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
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 focus:outline-none"
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
                onChange={(e) => setOrderedQuantity(e.target.value === '' ? '' : parseInt(e.target.value))}
                placeholder="e.g. 500"
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Section 2: Machine & Technical Specs */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
              2. Print Specifications & Media Selection
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Machine Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Printing Machine *
                </label>
                <select
                  required
                  value={selectedMachineId}
                  onChange={(e) => setSelectedMachineId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                >
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Print Type: COLOUR vs B&W */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Print Type *
                </label>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setPrintType('COLOUR')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition ${
                      printType === 'COLOUR'
                        ? 'bg-yellow-400 text-slate-950 font-black shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Colour
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintType('BW')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition ${
                      printType === 'BW'
                        ? 'bg-slate-900 text-white font-black shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    B&W
                  </button>
                </div>
              </div>

              {/* Paper Size: A4 vs A3 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Paper Size *
                </label>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setPaperSize('A4')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition ${
                      paperSize === 'A4'
                        ? 'bg-slate-900 text-white font-black shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    A4
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaperSize('A3')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition ${
                      paperSize === 'A3'
                        ? 'bg-slate-900 text-white font-black shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    A3 (13x19)
                  </button>
                </div>
              </div>
            </div>

            {/* Print Side: Single vs Double */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Print Side (Click Multiplier) *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPrintSide('SINGLE')}
                  className={`p-3 rounded-xl border text-left flex items-start space-x-3 transition ${
                    printSide === 'SINGLE'
                      ? 'border-yellow-400 bg-yellow-50 text-slate-950 font-bold'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full border border-current flex items-center justify-center mt-0.5 flex-shrink-0">
                    {printSide === 'SINGLE' && <div className="w-2.5 h-2.5 rounded-full bg-slate-950" />}
                  </div>
                  <div>
                    <div className="text-xs font-extrabold">Single-side (Simplex)</div>
                    <div className="text-[10px] text-slate-500 font-normal">
                      1 physical sheet = <strong>1 machine click</strong>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPrintSide('DOUBLE')}
                  className={`p-3 rounded-xl border text-left flex items-start space-x-3 transition ${
                    printSide === 'DOUBLE'
                      ? 'border-yellow-400 bg-yellow-50 text-slate-950 font-bold'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full border border-current flex items-center justify-center mt-0.5 flex-shrink-0">
                    {printSide === 'DOUBLE' && <div className="w-2.5 h-2.5 rounded-full bg-slate-950" />}
                  </div>
                  <div>
                    <div className="text-xs font-extrabold">Double-side (Duplex)</div>
                    <div className="text-[10px] text-slate-500 font-normal">
                      1 physical sheet = <strong>2 machine clicks</strong>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Media Selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  Paper / Substrate Media *
                </label>
                {selectedMedia && (
                  <span className="text-[11px] font-semibold text-slate-500">
                    Current Stock:{' '}
                    <strong
                      className={
                        selectedMedia.currentStock < 200
                          ? 'text-red-600 font-extrabold'
                          : 'text-yellow-700 font-extrabold'
                      }
                    >
                      {selectedMedia.currentStock} sheets
                    </strong>
                  </span>
                )}
              </div>
              <select
                required
                value={selectedMediaId}
                onChange={(e) => setSelectedMediaId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-yellow-400 focus:outline-none"
              >
                {mediaList.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.gsm} GSM {m.name} ({m.size}) — {m.brand || 'Generic'} (Stock: {m.currentStock} sheets)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 3: Physical Production Quantities */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
              3. Production Quantities (Physical Sheets)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Good Prints */}
              <div className="bg-yellow-50/60 p-3 rounded-xl border border-yellow-200">
                <label className="block text-xs font-extrabold text-slate-900 mb-1">
                  Good Prints (Sheets) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={goodPrints}
                  onChange={(e) => setGoodPrints(e.target.value === '' ? '' : parseInt(e.target.value))}
                  placeholder="e.g. 500"
                  className="w-full px-3 py-2 text-sm font-extrabold bg-white border border-yellow-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Successfully printed sheets</span>
              </div>

              {/* Wastage */}
              <div className="bg-red-50/50 p-3 rounded-xl border border-red-200">
                <label className="block text-xs font-extrabold text-red-900 mb-1">
                  Wastage (Sheets)
                </label>
                <input
                  type="number"
                  min="0"
                  value={wastage}
                  onChange={(e) => setWastage(e.target.value === '' ? '' : parseInt(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 text-sm font-extrabold bg-white border border-red-300 rounded-lg text-red-900 focus:ring-2 focus:ring-red-400 focus:outline-none"
                />
                <span className="text-[10px] text-red-600 mt-1 block">Damaged/Spoiled physical sheets</span>
              </div>

              {/* Reprint */}
              <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-200">
                <label className="block text-xs font-extrabold text-amber-900 mb-1">
                  Reprint (Sheets)
                </label>
                <input
                  type="number"
                  min="0"
                  value={reprint}
                  onChange={(e) => setReprint(e.target.value === '' ? '' : parseInt(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 text-sm font-extrabold bg-white border border-amber-300 rounded-lg text-amber-900 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
                <span className="text-[10px] text-amber-700 mt-1 block">Additional replacement prints</span>
              </div>
            </div>

            {/* If Reprint > 0: Specify Type */}
            {rep > 0 && (
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
                <label className="block text-xs font-bold text-amber-950">
                  Reprint Reason Classification *
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <label className="flex items-center space-x-1.5 text-xs text-slate-700 font-medium">
                    <input
                      type="radio"
                      name="reprintType"
                      checked={reprintType === 'PRODUCTION_REPRINT'}
                      onChange={() => setReprintType('PRODUCTION_REPRINT')}
                    />
                    <span>1. Production Issue (Machine / Quality / Color)</span>
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
                      <span className="text-xs font-semibold text-yellow-800 flex items-center space-x-1">
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
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Right 1 Column: Live Authoritative Calculation Summary */}
        <div className="space-y-5">
          <div className="bg-slate-950 text-white p-5 rounded-2xl shadow-xl border border-slate-800 space-y-4 sticky top-20">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                  {isOwner ? 'Production & Financial Preview' : 'Production Summary'}
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-400/40">
                {isOwner ? 'Owner View' : 'Operator View'}
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
                <span className="font-extrabold text-base text-yellow-400">
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
                    <div className="p-2 rounded-lg bg-yellow-400/10 border border-yellow-400/30 text-yellow-300 flex items-center justify-between">
                      <span>Stock Available ({selectedMedia.currentStock} sheets)</span>
                      <CheckCircle2 className="w-4 h-4 text-yellow-400" />
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

              {/* Cost Calculation (OWNER ONLY) */}
              {isOwner ? (
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
                  <div className="flex items-center justify-between text-yellow-400 font-extrabold text-sm pt-2 border-t border-white/10">
                    <span>Grand Total Cost:</span>
                    <span>₹{liveCalc.grandTotalCost}</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-[11px] text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Good Prints:</span>
                    <strong className="text-white">{g} sheets</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Wastage + Reprints:</span>
                    <strong className="text-slate-300">{w + rep} sheets</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Press Assignment:</span>
                    <strong className="text-yellow-400">Konica C3070</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !isStockAvailable}
              className="w-full py-3.5 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-yellow-400/25 flex items-center justify-center space-x-2 transition transform active:scale-[0.99] disabled:opacity-50"
            >
              <FileCheck className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              <span>{submitting ? 'Saving Production...' : 'Save Production Job'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
