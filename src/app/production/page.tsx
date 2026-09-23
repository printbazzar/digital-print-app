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
  Trash2,
  X,
  AlertTriangle,
  History,
  Check,
  Search,
  Edit2,
  Save,
} from 'lucide-react';
import { calculateJobProduction, resolvePrintRate, PrintSide, PaperSize, PrintType } from '@/lib/calculations';

export default function ProductionEntryPage() {
  const { user, token, loading: authLoading, isOwner } = useAuth();
  const router = useRouter();

  // Master lists
  const [machines, setMachines] = useState<any[]>([]);
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [wastageReasons, setWastageReasons] = useState<any[]>([]);
  const [rates, setRates] = useState<any[]>([]);
  const [todayJobs, setTodayJobs] = useState<any[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [searchJobTerm, setSearchJobTerm] = useState('');

  // Form State
  const [jobNumber, setJobNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [product, setProduct] = useState('');
  const [orderedQuantity, setOrderedQuantity] = useState<number | ''>('');
  const [printType, setPrintType] = useState<PrintType>('COLOUR');
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [selectedTier, setSelectedTier] = useState<'TIER1' | 'TIER2'>('TIER1');
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

  // Delete Job Modal
  const [deleteModalJob, setDeleteModalJob] = useState<any | null>(null);
  const [deletingJob, setDeletingJob] = useState(false);

  // Edit Job Modal
  const [editModalJob, setEditModalJob] = useState<any | null>(null);
  const [editJobNumber, setEditJobNumber] = useState('');
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editProduct, setEditProduct] = useState('');
  const [editOrderedQuantity, setEditOrderedQuantity] = useState<number | ''>('');
  const [editPrintType, setEditPrintType] = useState<PrintType>('COLOUR');
  const [editPaperSize, setEditPaperSize] = useState<PaperSize>('A3');
  const [editSelectedTier, setEditSelectedTier] = useState<'TIER1' | 'TIER2'>('TIER1');
  const [editPrintSide, setEditPrintSide] = useState<PrintSide>('SINGLE');
  const [editMediaId, setEditMediaId] = useState('');
  const [editMachineId, setEditMachineId] = useState('');
  const [editGoodPrints, setEditGoodPrints] = useState<number | ''>('');
  const [editWastage, setEditWastage] = useState<number | ''>(0);
  const [editReprint, setEditReprint] = useState<number | ''>(0);
  const [editReprintType, setEditReprintType] = useState<'PRODUCTION_REPRINT' | 'CUSTOMER_ADDITIONAL'>('PRODUCTION_REPRINT');
  const [editWastageReasonId, setEditWastageReasonId] = useState('');
  const [editWastageReasonOther, setEditWastageReasonOther] = useState('');
  const [editRemarks, setEditRemarks] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [toastMsg, setToastMsg] = useState<{ jobNumber: string; customer: string; clicks: number; sheets: number } | null>(null);

  const getAuthHeaders = () => {
    const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('pb_token') : null);
    return {
      'Content-Type': 'application/json',
      ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
    };
  };

  const fetchTodayJobs = async () => {
    setLoadingJobs(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/jobs?date=${todayStr}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const d = await res.json();
        setTodayJobs(d.jobs || []);
      }
    } catch (err) {
      console.error('Failed to load jobs:', err);
    } finally {
      setLoadingJobs(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading]);

  // Load masters & today's jobs with instant sessionStorage cache
  useEffect(() => {
    // 1. Instant Cache Hydration (0ms load time)
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('pb_masters_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.machines?.length) {
            setMachines(parsed.machines);
            setSelectedMachineId((prev) => prev || parsed.machines[0].id);
          }
          if (parsed.media?.length) {
            setMediaList(parsed.media);
            setSelectedMediaId((prev) => prev || parsed.media[0].id);
          }
          if (parsed.wastageReasons?.length) setWastageReasons(parsed.wastageReasons);
          if (parsed.rates?.length) setRates(parsed.rates);
        }
      } catch {}
    }

    // 2. Background Revalidation
    const loadMasters = async () => {
      try {
        const headers = getAuthHeaders();
        const todayStr = new Date().toISOString().split('T')[0];
        const [machRes, medRes, wrRes, ratesRes, jobsRes] = await Promise.all([
          fetch('/api/machines', { headers }),
          fetch('/api/media', { headers }),
          fetch('/api/wastage-reasons', { headers }),
          fetch('/api/rates', { headers }),
          fetch(`/api/jobs?date=${todayStr}`, { headers }),
        ]);

        let mList: any[] = [];
        let medList: any[] = [];
        let wrList: any[] = [];
        let rList: any[] = [];

        if (machRes.ok) {
          const d = await machRes.json();
          mList = d.machines || [];
          setMachines(mList);
          if (mList.length > 0) setSelectedMachineId((prev) => prev || mList[0].id);
        }
        if (medRes.ok) {
          const d = await medRes.json();
          medList = d.media || [];
          setMediaList(medList);
          if (medList.length > 0) setSelectedMediaId((prev) => prev || medList[0].id);
        }
        if (wrRes.ok) {
          const d = await wrRes.json();
          wrList = d.reasons || [];
          setWastageReasons(wrList);
        }
        if (ratesRes.ok) {
          const d = await ratesRes.json();
          rList = d.rates || [];
          setRates(rList);
        }
        if (jobsRes.ok) {
          const d = await jobsRes.json();
          setTodayJobs(d.jobs || []);
        }

        // Update sessionStorage cache
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('pb_masters_cache', JSON.stringify({
            machines: mList,
            media: medList,
            wastageReasons: wrList,
            rates: rList,
          }));
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

  // Official Machine Billing Contract Tariff Resolution
  const rateInfo = resolvePrintRate({
    paperSize,
    printType,
    selectedTier,
    dbRates: rates,
  });
  const unitRateVal = rateInfo.rate;
  const gstPercentVal = rateInfo.gstPercent;

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

  // Edit Job Modal State & Calculations
  const openEditModal = (j: any) => {
    setEditModalJob(j);
    setEditJobNumber(j.jobNumber || '');
    setEditCustomerName(j.customerName || '');
    setEditProduct(j.product || '');
    setEditOrderedQuantity(j.orderedQuantity !== undefined && j.orderedQuantity !== null ? j.orderedQuantity : '');
    setEditPrintType((j.printType as PrintType) || 'COLOUR');
    setEditPaperSize((j.paperSize as PaperSize) || 'A3');
    setEditSelectedTier('TIER1');
    setEditPrintSide((j.printSide as PrintSide) || 'SINGLE');
    setEditMediaId(j.mediaId || (mediaList[0]?.id || ''));
    setEditMachineId(j.machineId || (machines[0]?.id || ''));
    setEditGoodPrints(j.goodPrints !== undefined ? j.goodPrints : '');
    setEditWastage(j.wastage !== undefined ? j.wastage : 0);
    setEditReprint(j.reprint !== undefined ? j.reprint : 0);
    setEditReprintType(j.reprintType || 'PRODUCTION_REPRINT');
    setEditWastageReasonId(j.wastageReasonId || '');
    setEditWastageReasonOther(j.wastageReasonOther || '');
    setEditRemarks(j.remarks || '');
    setEditError(null);
  };

  const editG = typeof editGoodPrints === 'number' ? Math.max(0, editGoodPrints) : 0;
  const editW = typeof editWastage === 'number' ? Math.max(0, editWastage) : 0;
  const editRep = typeof editReprint === 'number' ? Math.max(0, editReprint) : 0;

  const editSelectedMedia = mediaList.find((m) => m.id === editMediaId) || editModalJob?.media;

  const editRateInfo = resolvePrintRate({
    paperSize: editPaperSize,
    printType: editPrintType,
    selectedTier: editSelectedTier,
    dbRates: rates,
  });

  const editLiveCalc = calculateJobProduction({
    goodPrints: editG,
    wastage: editW,
    reprint: editRep,
    printSide: editPrintSide,
    unitRate: editRateInfo.rate,
    gstPercent: editRateInfo.gstPercent,
  });

  const oldSheets = editModalJob?.sheetConsumption || 0;
  const newSheets = editLiveCalc.sheetConsumption;
  const isSameMedia = editModalJob?.mediaId === editMediaId;
  const sheetsDiff = newSheets - oldSheets;

  const handleSaveEditJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalJob) return;

    if (editG <= 0) {
      setEditError('Good prints produced must be greater than 0.');
      return;
    }

    if (editW > 0 && !editWastageReasonId) {
      setEditError('Please select a Wastage Reason since wastage is greater than 0.');
      return;
    }

    setSavingEdit(true);
    setEditError(null);

    try {
      const payload = {
        jobNumber: editJobNumber.trim(),
        customerName: editCustomerName.trim(),
        product: editProduct.trim(),
        orderedQuantity: editOrderedQuantity !== '' ? Number(editOrderedQuantity) : editG,
        printType: editPrintType,
        paperSize: editPaperSize,
        selectedTier: editSelectedTier,
        printSide: editPrintSide,
        mediaId: editMediaId,
        machineId: editMachineId || editModalJob.machineId,
        goodPrints: editG,
        wastage: editW,
        reprint: editRep,
        reprintType: editReprintType || undefined,
        wastageReasonId: editW > 0 ? (editWastageReasonId || undefined) : undefined,
        wastageReasonOther: editWastageReasonOther || undefined,
        remarks: editRemarks.trim() || undefined,
      };

      const res = await fetch(`/api/jobs/${editModalJob.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update job');
      }

      // 1. Update in todayJobs list
      setTodayJobs((prev) =>
        prev.map((item) => (item.id === editModalJob.id ? { ...item, ...data.job } : item))
      );

      // 2. Refresh media stocks from server
      try {
        const medRes = await fetch('/api/media', { headers: getAuthHeaders() });
        if (medRes.ok) {
          const medData = await medRes.json();
          setMediaList(medData.media || []);
        }
      } catch (err) {
        console.error(err);
      }

      const updatedJobNum = data.job?.jobNumber || editJobNumber;
      const updatedCustomer = data.job?.customerName || editCustomerName;

      // 3. Close modal
      setEditModalJob(null);

      // 4. Show success toast
      setToastMsg({
        jobNumber: updatedJobNum,
        customer: updatedCustomer,
        clicks: data.job?.machineClicks || 0,
        sheets: data.job?.sheetConsumption || 0,
      });
    } catch (err: any) {
      setEditError(err.message || 'Failed to save changes');
    } finally {
      setSavingEdit(false);
    }
  };

  // ZERO-LAG INSTANT FORM SUBMISSION (Optimistic UI)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

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

    // 1. Snapshot all form values
    const savedJobNumber = jobNumber.trim();
    const savedCustomerName = customerName.trim();
    const savedProduct = product.trim();
    const savedGoodPrints = g;
    const savedWastage = w;
    const savedReprint = rep;
    const savedPrintType = printType;
    const savedPaperSize = paperSize;
    const savedSelectedTier = selectedTier;
    const savedPrintSide = printSide;
    const savedMediaId = selectedMediaId;
    const savedMachineId = selectedMachineId;
    const savedSheetConsumption = liveCalc.sheetConsumption;
    const savedMachineClicks = liveCalc.machineClicks;
    const savedUnitRate = unitRateVal;
    const savedGrandTotal = liveCalc.grandTotalCost;
    const savedMediaName = selectedMedia ? `${selectedMedia.gsm} GSM ${selectedMedia.name} (${selectedMedia.size})` : 'Media';
    const tempId = 'temp-' + Date.now();

    const optimisticJob = {
      id: tempId,
      jobNumber: savedJobNumber,
      customerName: savedCustomerName,
      product: savedProduct,
      orderedQuantity: typeof orderedQuantity === 'number' ? orderedQuantity : g,
      printType: savedPrintType,
      paperSize: savedPaperSize,
      printSide: savedPrintSide,
      mediaId: savedMediaId,
      mediaName: savedMediaName,
      machineId: savedMachineId,
      machineName: machines.find((m) => m.id === savedMachineId)?.name || 'Konica Minolta C3070',
      goodPrints: savedGoodPrints,
      wastage: savedWastage,
      reprint: savedReprint,
      sheetConsumption: savedSheetConsumption,
      machineClicks: savedMachineClicks,
      grandTotalCost: savedGrandTotal,
      operatorName: user?.name || 'Operator',
      productionDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };

    // 2. INSTANT OPTIMISTIC STATE UPDATE (<1ms) - Instant table insert
    setTodayJobs((prev) => [optimisticJob, ...prev]);

    // 3. INSTANT STOCK DEDUCTION (<1ms)
    setMediaList((prev) =>
      prev.map((m) =>
        m.id === savedMediaId
          ? { ...m, currentStock: Math.max(0, m.currentStock - savedSheetConsumption) }
          : m
      )
    );

    // 4. INSTANT FLASH TOAST (<1ms)
    setToastMsg({
      jobNumber: savedJobNumber,
      customer: savedCustomerName,
      clicks: savedMachineClicks,
      sheets: savedSheetConsumption,
    });
    setTimeout(() => {
      setToastMsg((curr) => (curr?.jobNumber === savedJobNumber ? null : curr));
    }, 4500);

    // 5. INSTANT AUTO-RESET FOR NEXT JOB (<1ms) - Operator can immediately type next job!
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

    // 6. ASYNC BACKGROUND DB SYNC
    const payload = {
      jobNumber: savedJobNumber,
      customerName: savedCustomerName,
      product: savedProduct,
      orderedQuantity: typeof orderedQuantity === 'number' ? orderedQuantity : g,
      printType: savedPrintType,
      paperSize: savedPaperSize,
      selectedTier: savedSelectedTier,
      unitRate: savedUnitRate,
      printSide: savedPrintSide,
      mediaId: savedMediaId,
      machineId: savedMachineId,
      goodPrints: savedGoodPrints,
      wastage: savedWastage,
      reprint: savedReprint,
      reprintType: savedReprint > 0 ? reprintType : undefined,
      wastageReasonId: savedWastage > 0 ? wastageReasonId : undefined,
      wastageReasonOther: savedWastage > 0 && wastageReasonId === 'wr-10' ? wastageReasonOther : undefined,
      wastagePhotoUrl: wastagePhotoUrl || undefined,
      remarks: remarks.trim() || undefined,
    };

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save production entry');
      }

      // Replace optimistic temp ID with real ID
      if (data.job) {
        setTodayJobs((prev) =>
          prev.map((j) => (j.id === tempId ? { ...data.job, isOptimistic: false } : j))
        );
      }
    } catch (err: any) {
      // Rollback on server error
      setTodayJobs((prev) => prev.filter((j) => j.id !== tempId));
      setMediaList((prev) =>
        prev.map((m) =>
          m.id === savedMediaId
            ? { ...m, currentStock: m.currentStock + savedSheetConsumption }
            : m
        )
      );
      setErrorMsg(`Failed to save Job #${savedJobNumber}: ${err.message}`);
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

  // Handle Delete Job
  const handleDeleteJobConfirm = async () => {
    if (!deleteModalJob) return;
    setDeletingJob(true);
    try {
      const res = await fetch(`/api/jobs/${deleteModalJob.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete job');

      // Remove from today's list
      setTodayJobs((prev) => prev.filter((j) => j.id !== deleteModalJob.id));

      // Restore stock in local state
      if (data.restoredSheets) {
        setMediaList((prev) =>
          prev.map((m) =>
            m.id === deleteModalJob.mediaId
              ? { ...m, currentStock: m.currentStock + deleteModalJob.sheetConsumption }
              : m
          )
        );
      }

      setDeleteModalJob(null);
    } catch (err: any) {
      alert('Delete failed: ' + err.message);
    } finally {
      setDeletingJob(false);
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
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Production Entry
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-yellow-400 text-slate-950 border border-yellow-400">
                Live Production
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Fast, touch-optimized job production entry with instant sheet deduction &amp; click calculation
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleResetForNext}
            className="flex items-center space-x-1 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>New Job / Reset</span>
          </button>
        </div>
      </div>

      {/* Instant Success Toast Banner */}
      {toastMsg && (
        <div className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-4 text-emerald-950 shadow-md flex items-center justify-between animate-fade-in">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 font-black text-sm shadow-xs">
              ✓
            </div>
            <div>
              <div className="text-sm font-black text-emerald-950 flex items-center gap-2">
                <span>⚡ {toastMsg.jobNumber} Saved Instantly!</span>
                <span className="text-[11px] font-extrabold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                  Customer: {toastMsg.customer}
                </span>
              </div>
              <p className="text-xs text-emerald-800 font-semibold mt-0.5">
                {toastMsg.sheets} sheets deducted from stock • {toastMsg.clicks} machine clicks logged. Form ready for next entry!
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                const found = todayJobs.find((j: any) => j.jobNumber === toastMsg.jobNumber);
                if (found) {
                  openEditModal(found);
                  setToastMsg(null);
                }
              }}
              className="px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-950 border border-emerald-400 rounded-xl text-xs font-black shadow-xs transition flex items-center space-x-1.5"
              title="Click to edit this order if there was any mistake"
            >
              <Edit2 className="w-3.5 h-3.5 text-emerald-700 stroke-[2.5]" />
              <span>✏️ Edit This Job</span>
            </button>
            <button
              type="button"
              onClick={() => setToastMsg(null)}
              className="p-1.5 text-emerald-600 hover:text-emerald-900 rounded-lg hover:bg-emerald-100 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start space-x-3 text-xs text-red-700 shadow-xs animate-fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
          <div className="font-bold flex-1">{errorMsg}</div>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Production Form */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Input Controls */}
        <div className="lg:col-span-2 space-y-5">
          {/* 1. Job Identification */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <span className="w-6 h-6 rounded-full bg-yellow-400 text-slate-950 flex items-center justify-center font-bold text-xs">
                1
              </span>
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                Job &amp; Customer Details
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Job Number *
                </label>
                <input
                  type="text"
                  required
                  value={jobNumber}
                  onChange={(e) => setJobNumber(e.target.value)}
                  placeholder="PB-2026-XXXX or Invoice #"
                  className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Customer / Client Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Reliance / Local Studio / John"
                  className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Product / Job Description *
                </label>
                <input
                  type="text"
                  required
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  placeholder="e.g. Visiting Cards, Menu Card, Brochure"
                  className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ordered Quantity (Finished Pieces)
                </label>
                <input
                  type="number"
                  min="1"
                  value={orderedQuantity}
                  onChange={(e) =>
                    setOrderedQuantity(e.target.value === '' ? '' : parseInt(e.target.value))
                  }
                  placeholder="e.g. 100 or 500"
                  className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 2. Print Specifications */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <span className="w-6 h-6 rounded-full bg-yellow-400 text-slate-950 flex items-center justify-center font-bold text-xs">
                2
              </span>
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                Print Mode &amp; Paper Spec
              </h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Print Colour Mode */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Print Colour Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPrintType('COLOUR')}
                      className={`py-2 text-xs font-black rounded-xl border transition ${
                        printType === 'COLOUR'
                          ? 'bg-yellow-400 text-slate-950 border-yellow-400 shadow-xs ring-1 ring-yellow-500'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      🌈 Colour
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintType('BW')}
                      className={`py-2 text-xs font-black rounded-xl border transition ${
                        printType === 'BW'
                          ? 'bg-slate-950 text-white border-slate-950 shadow-xs ring-1 ring-slate-800'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {isOwner ? '⚫ B&W (₹1.10)' : '⚫ B&W (Monochrome)'}
                    </button>
                  </div>
                </div>

                {/* Print Side */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Print Sides (Clicks Multiplier)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPrintSide('SINGLE')}
                      className={`py-2 text-xs font-black rounded-xl border transition ${
                        printSide === 'SINGLE'
                          ? 'bg-yellow-400 text-slate-950 border-yellow-400 shadow-xs ring-1 ring-yellow-500'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Single (1 Click)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintSide('DOUBLE')}
                      className={`py-2 text-xs font-black rounded-xl border transition ${
                        printSide === 'DOUBLE'
                          ? 'bg-yellow-400 text-slate-950 border-yellow-400 shadow-xs ring-1 ring-yellow-500'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Double (2 Clicks)
                    </button>
                  </div>
                </div>
              </div>

              {/* Print Format / Click Size Tier */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Print Format / Click Size Tier
                  </label>
                  <span className="text-[11px] font-black text-slate-900 bg-yellow-100 border border-yellow-300 px-2 py-0.5 rounded-md">
                    {isOwner ? `Applied: ₹${unitRateVal.toFixed(2)} + ${gstPercentVal}% GST` : `Format: ${paperSize} • ${printType}`}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPaperSize('A4')}
                    className={`py-2.5 px-3 rounded-xl border transition text-left flex flex-col justify-between ${
                      paperSize === 'A4'
                        ? 'bg-yellow-400 text-slate-950 border-yellow-500 shadow-xs ring-1 ring-yellow-500'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="font-extrabold text-xs block">A4 Size</span>
                    <span className="text-[10px] font-bold mt-1 opacity-85">
                      {isOwner ? (printType === 'COLOUR' ? '₹2.90 + 18% GST' : '₹1.10 + 18% GST') : 'Standard Single Size'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaperSize('A3')}
                    className={`py-2.5 px-3 rounded-xl border transition text-left flex flex-col justify-between ${
                      paperSize === 'A3'
                        ? 'bg-yellow-400 text-slate-950 border-yellow-500 shadow-xs ring-1 ring-yellow-500'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="font-extrabold text-xs block">A3 / 12x18 / 13x19</span>
                    <span className="text-[10px] font-bold mt-1 opacity-85">
                      {isOwner
                        ? (printType === 'COLOUR'
                            ? (selectedTier === 'TIER2' ? '₹4.15 (10,001+)' : '₹4.25 (1-10k)')
                            : '₹1.10 + 18% GST')
                        : 'Standard Press Sheet'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaperSize('BANNER')}
                    className={`py-2.5 px-3 rounded-xl border transition text-left flex flex-col justify-between ${
                      paperSize === 'BANNER'
                        ? 'bg-yellow-400 text-slate-950 border-yellow-500 shadow-xs ring-1 ring-yellow-500'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="font-extrabold text-xs block">BANNER (13x26+)</span>
                    <span className="text-[10px] font-bold mt-1 opacity-85">
                      {isOwner ? (printType === 'COLOUR' ? '₹6.40 + 18% GST' : '₹2.20 + 18% GST') : 'Long Banner Sheet'}
                    </span>
                  </button>
                </div>
              </div>

              {/* A3 Colour Machine Billing Slab Selector - OWNER ONLY */}
              {isOwner && paperSize === 'A3' && printType === 'COLOUR' && (
                <div className="bg-amber-50/80 border border-amber-300 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
                  <div>
                    <div className="text-xs font-black text-amber-950 flex items-center space-x-1.5">
                      <span>⚡ Machine Billing Contract Slab:</span>
                      <span className="text-[10px] font-extrabold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                        {selectedTier === 'TIER2' ? 'Active: Volume Discount' : 'Active: Standard Slab'}
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      1 to 10,000 prints @ ₹4.25 • Above 10,001 prints @ ₹4.15 (+18% GST)
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedTier('TIER1')}
                      className={`px-3 py-1.5 text-xs font-black rounded-lg transition border ${
                        selectedTier === 'TIER1'
                          ? 'bg-yellow-400 text-slate-950 border-yellow-500 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      1 – 10,000 (₹4.25)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTier('TIER2')}
                      className={`px-3 py-1.5 text-xs font-black rounded-lg transition border ${
                        selectedTier === 'TIER2'
                          ? 'bg-yellow-400 text-slate-950 border-yellow-500 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      10,001+ (₹4.15)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Media Selector */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Paper Media / Substrate *
              </label>
              <select
                value={selectedMediaId}
                onChange={(e) => setSelectedMediaId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 focus:outline-none"
              >
                {mediaList.map((m) => {
                  const unitCost = Number(m.costPerSheet || 0);
                  return (
                    <option key={m.id} value={m.id}>
                      {m.gsm} GSM {m.name} ({m.size}) {isOwner ? `— ₹${unitCost.toFixed(2)}/sheet ` : ''}[Stock: {m.currentStock}]
                    </option>
                  );
                })}
              </select>

              {selectedMedia && (
                isOwner ? (
                  <div className="mt-2.5 p-2.5 bg-slate-100/90 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs border border-slate-200">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-slate-500 font-semibold">Paper Purchase Cost:</span>
                      <span className="font-mono font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        ₹{Number(selectedMedia.costPerSheet || 0).toFixed(2)} / sheet
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-slate-500 font-medium">Job Paper Value ({liveCalc.sheetConsumption} sh):</span>
                      <span className="font-mono font-black text-slate-900">
                        ₹{(liveCalc.sheetConsumption * Number(selectedMedia.costPerSheet || 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2.5 p-2.5 bg-slate-100/90 rounded-xl flex items-center justify-between text-xs border border-slate-200">
                    <span className="text-slate-600 font-semibold">Available Paper Inventory Stock:</span>
                    <span className="font-mono font-black text-slate-900 text-sm">
                      {selectedMedia.currentStock.toLocaleString()} sheets in stock
                    </span>
                  </div>
                )
              )}
            </div>
          </div>

          {/* 3. Output Quantities */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <span className="w-6 h-6 rounded-full bg-yellow-400 text-slate-950 flex items-center justify-center font-bold text-xs">
                3
              </span>
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                Printed Quantities &amp; Wastage
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Good Prints Produced *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={goodPrints}
                  onChange={(e) =>
                    setGoodPrints(e.target.value === '' ? '' : parseInt(e.target.value))
                  }
                  placeholder="e.g. 50 or 100"
                  className="w-full px-3.5 py-2.5 text-base font-black bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-red-600 mb-1">
                  Wastage Sheets
                </label>
                <input
                  type="number"
                  min="0"
                  value={wastage}
                  onChange={(e) =>
                    setWastage(e.target.value === '' ? '' : parseInt(e.target.value))
                  }
                  placeholder="0"
                  className="w-full px-3.5 py-2.5 text-base font-black bg-red-50/50 border border-red-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-400 focus:border-red-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reprint Sheets
                </label>
                <input
                  type="number"
                  min="0"
                  value={reprint}
                  onChange={(e) =>
                    setReprint(e.target.value === '' ? '' : parseInt(e.target.value))
                  }
                  placeholder="0"
                  className="w-full px-3.5 py-2.5 text-base font-black bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Wastage Reason Dropdown */}
            {w > 0 && (
              <div className="p-4 bg-red-50/70 rounded-xl border border-red-200 space-y-3 animate-fade-in">
                <div className="flex items-center space-x-1.5 text-red-800 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>Wastage Reason Specification (Required for {w} sheets)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Reason Category *
                    </label>
                    <select
                      required
                      value={wastageReasonId}
                      onChange={(e) => setWastageReasonId(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold bg-white border border-red-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400"
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
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Specify Other Reason *
                      </label>
                      <input
                        type="text"
                        required
                        value={wastageReasonOther}
                        onChange={(e) => setWastageReasonOther(e.target.value)}
                        placeholder="Explain reason..."
                        className="w-full px-3 py-2 text-xs bg-white border border-red-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 font-medium"
                      />
                    </div>
                  )}
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
                className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 focus:outline-none"
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

              {/* Cost Calculation */}
              {isOwner ? (
                <div className="pt-2 border-t border-white/10 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Active Tariff:</span>
                    <span className="font-bold text-yellow-400 text-right max-w-[180px] truncate">{rateInfo.tierLabel}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Billing Rate:</span>
                    <span className="font-semibold text-white">₹{liveCalc.unitCost.toFixed(2)} / click</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Base Cost ({liveCalc.machineClicks} clicks):</span>
                    <span className="font-semibold text-white">₹{liveCalc.totalCost.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>GST ({liveCalc.unitCost > 0 ? '18%' : '0%'}):</span>
                    <span className="font-semibold text-white">₹{liveCalc.gstAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Paper Material Cost ({liveCalc.sheetConsumption} sh):</span>
                    <span className="font-semibold text-emerald-400 font-mono">
                      ₹{(liveCalc.sheetConsumption * Number(selectedMedia?.costPerSheet || 0)).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-yellow-400 font-extrabold text-sm pt-2 border-t border-white/10">
                    <span>Grand Total Cost:</span>
                    <span>₹{liveCalc.grandTotalCost.toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <div className="pt-2 border-t border-white/10 space-y-1 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Job Specs:</span>
                    <span className="font-bold text-white">{printType} • {paperSize}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Print Sides:</span>
                    <span className="font-semibold text-white">{printSide === 'DOUBLE' ? '2 Sides (Duplex)' : '1 Side (Simplex)'}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Total Machine Clicks:</span>
                    <span className="font-bold text-yellow-400">{liveCalc.machineClicks} clicks</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Inventory Deducted:</span>
                    <span className="font-bold text-emerald-400">{liveCalc.sheetConsumption} sheets</span>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !isStockAvailable}
              className="w-full py-3.5 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-yellow-400/25 flex items-center justify-center space-x-2 transition transform active:scale-[0.98] disabled:opacity-50"
            >
              <FileCheck className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              <span>⚡ Save Production Job (Instant)</span>
            </button>
          </div>
        </div>
      </form>

      {/* TODAY'S LOGGED JOBS TABLE WITH SEARCH & DELETE OPTION */}
      {(() => {
        const filteredTodayJobs = todayJobs.filter((j: any) => {
          if (!searchJobTerm.trim()) return true;
          const q = searchJobTerm.toLowerCase().trim();
          return (
            (j.jobNumber && j.jobNumber.toLowerCase().includes(q)) ||
            (j.customerName && j.customerName.toLowerCase().includes(q)) ||
            (j.product && j.product.toLowerCase().includes(q)) ||
            (j.mediaName && j.mediaName.toLowerCase().includes(q)) ||
            (j.operatorName && j.operatorName.toLowerCase().includes(q))
          );
        });

        return (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <History className="w-4 h-4 text-yellow-600" />
                  <h3 className="text-sm font-black text-slate-900">
                    Today&apos;s Production Entries ({filteredTodayJobs.length}{filteredTodayJobs.length !== todayJobs.length ? ` of ${todayJobs.length}` : ''})
                  </h3>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Search by Job # or Customer Name, or click 🗑️ to delete mistaken entries.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Search Bar Input */}
                <div className="relative min-w-[240px] sm:min-w-[280px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchJobTerm}
                    onChange={(e) => setSearchJobTerm(e.target.value)}
                    placeholder="🔍 Search Job #, Customer name..."
                    className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                  />
                  {searchJobTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchJobTerm('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={fetchTodayJobs}
                  className="flex items-center space-x-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition self-start sm:self-auto"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingJobs ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Job #</th>
                    <th className="py-3 px-4">Customer &amp; Product</th>
                    <th className="py-3 px-4">Print Specs</th>
                    <th className="py-3 px-4">Media Used</th>
                    <th className="py-3 px-4">Good / Wst</th>
                    <th className="py-3 px-4">Clicks</th>
                    {isOwner && <th className="py-3 px-4">Cost (INR)</th>}
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredTodayJobs.length === 0 ? (
                    <tr>
                      <td colSpan={isOwner ? 8 : 7} className="py-8 text-center text-slate-400">
                        {searchJobTerm
                          ? `No production jobs matching "${searchJobTerm}" found.`
                          : 'No production jobs logged today yet.'}
                      </td>
                    </tr>
                  ) : (
                    filteredTodayJobs.map((j: any) => (
                  <tr key={j.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-black text-slate-900">
                      {j.jobNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{j.customerName}</div>
                      <div className="text-[10px] text-slate-400 font-semibold">{j.product}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                            j.printType === 'COLOUR'
                              ? 'bg-yellow-100 text-slate-950 border border-yellow-300'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {j.printType}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {j.paperSize}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {j.printSide === 'DOUBLE' ? '2-Side' : '1-Side'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-900 font-bold truncate max-w-[150px]">
                        {j.mediaName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold">
                        {j.sheetConsumption} sheets used
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-black text-slate-900">{j.goodPrints} good</div>
                      {j.wastage > 0 && (
                        <div className="text-[10px] text-red-600 font-bold">
                          +{j.wastage} waste ({j.wastageReasonName || 'N/A'})
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-black text-yellow-800 text-sm">
                      {j.machineClicks} clicks
                    </td>
                    {isOwner && (
                      <td className="py-3 px-4 font-black text-slate-950 text-sm">
                        ₹{j.grandTotalCost}
                      </td>
                    )}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(j)}
                          className="px-2.5 py-1.5 bg-yellow-100 hover:bg-yellow-400 text-slate-950 rounded-lg font-black text-xs transition flex items-center space-x-1 shadow-2xs border border-yellow-300"
                          title="Edit job details, quantities, media, or remarks"
                        >
                          <Edit2 className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteModalJob(j)}
                          className="px-2.5 py-1.5 bg-red-50 hover:bg-red-600 text-red-700 hover:text-white rounded-lg font-bold text-xs transition flex items-center space-x-1"
                          title="Delete mistaken entry & restore sheets"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
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
    );
  })()}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModalJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-red-600 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center space-x-2.5">
                <Trash2 className="w-5 h-5" />
                <h3 className="text-sm font-black">Delete Production Job?</h3>
              </div>
              <button
                onClick={() => setDeleteModalJob(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-red-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600 font-medium">
                Are you sure you want to delete this job entry?
              </p>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="font-black text-slate-900 text-sm">
                  Job #{deleteModalJob.jobNumber} — {deleteModalJob.customerName}
                </div>
                <div className="text-slate-500 font-semibold">{deleteModalJob.product}</div>
                <div className="text-slate-700 pt-1 font-bold">
                  Media: {deleteModalJob.mediaName}
                </div>
              </div>

              <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-xl text-yellow-900 font-bold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-yellow-700 flex-shrink-0" />
                <span>
                  <strong>+{deleteModalJob.sheetConsumption} sheets</strong> will be automatically refunded &amp; restored to stock.
                </span>
              </div>

              <div className="pt-2 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setDeleteModalJob(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deletingJob}
                  onClick={handleDeleteJobConfirm}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-md shadow-red-600/20 transition disabled:opacity-50 flex items-center justify-center space-x-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{deletingJob ? 'Deleting...' : 'Yes, Delete Job'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PRODUCTION JOB MODAL */}
      {editModalJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            {/* Modal Header */}
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-yellow-400 text-slate-950 flex items-center justify-center font-black">
                  <Edit2 className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-black text-white">Edit Production Job</h3>
                    <span className="px-2 py-0.5 rounded bg-yellow-400/20 text-yellow-300 font-mono text-xs font-bold border border-yellow-400/30">
                      {editModalJob.jobNumber}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Correct any entry mistakes; stock and machine clicks will automatically recalculate.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditModalJob(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEditJob} className="p-6 space-y-4 text-xs">
              {editError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 font-bold flex items-center space-x-2 animate-fade-in">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              {/* 1. Job & Customer Details */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  1. Customer &amp; Product Info
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Job Number *</label>
                    <input
                      type="text"
                      required
                      value={editJobNumber}
                      onChange={(e) => setEditJobNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Customer Name *</label>
                    <input
                      type="text"
                      required
                      value={editCustomerName}
                      onChange={(e) => setEditCustomerName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Product Description *</label>
                    <input
                      type="text"
                      required
                      value={editProduct}
                      onChange={(e) => setEditProduct(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Print Specs & Media */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  2. Print Specifications &amp; Paper Substrate
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Print Type */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Print Mode</label>
                    <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-lg border border-slate-300">
                      <button
                        type="button"
                        onClick={() => setEditPrintType('COLOUR')}
                        className={`py-1.5 font-black text-xs rounded transition ${
                          editPrintType === 'COLOUR'
                            ? 'bg-yellow-400 text-slate-950 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Colour
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditPrintType('BW')}
                        className={`py-1.5 font-black text-xs rounded transition ${
                          editPrintType === 'BW'
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        B&amp;W
                      </button>
                    </div>
                  </div>

                  {/* Paper Size */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Size Format</label>
                    <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-lg border border-slate-300">
                      {(['A4', 'A3', 'BANNER'] as PaperSize[]).map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setEditPaperSize(sz)}
                          className={`py-1.5 font-black text-[11px] rounded transition ${
                            editPaperSize === sz
                              ? 'bg-yellow-400 text-slate-950 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {sz === 'A3' ? 'A3 / 13x19' : sz}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Print Sides */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Printing Side</label>
                    <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-lg border border-slate-300">
                      <button
                        type="button"
                        onClick={() => setEditPrintSide('SINGLE')}
                        className={`py-1.5 font-black text-xs rounded transition ${
                          editPrintSide === 'SINGLE'
                            ? 'bg-yellow-400 text-slate-950 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        1-Side
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditPrintSide('DOUBLE')}
                        className={`py-1.5 font-black text-xs rounded transition ${
                          editPrintSide === 'DOUBLE'
                            ? 'bg-yellow-400 text-slate-950 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        2-Side (x2)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Paper Media Selection */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Paper Media / Substrate *
                  </label>
                  <select
                    value={editMediaId}
                    onChange={(e) => setEditMediaId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  >
                    {mediaList.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.gsm} GSM {m.name} ({m.size}) {isOwner ? `— ₹${Number(m.costPerSheet || 0).toFixed(2)}/sheet ` : ''}[Stock: {m.currentStock}]
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. Output Quantities & Wastage */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  3. Printed Output &amp; Wastage Counts
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Good Prints *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={editGoodPrints}
                      onChange={(e) => setEditGoodPrints(e.target.value === '' ? '' : parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-black text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Wastage Sheets</label>
                    <input
                      type="number"
                      min="0"
                      value={editWastage}
                      onChange={(e) => setEditWastage(e.target.value === '' ? 0 : parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-black text-base text-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Reprint Sheets</label>
                    <input
                      type="number"
                      min="0"
                      value={editReprint}
                      onChange={(e) => setEditReprint(e.target.value === '' ? 0 : parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-black text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  </div>
                </div>

                {/* Wastage Reason Dropdown if Wastage > 0 */}
                {editW > 0 && (
                  <div className="pt-2 border-t border-slate-200">
                    <label className="block font-bold text-red-700 mb-1">
                      Wastage Reason (Required since wastage is {editW} sheets) *
                    </label>
                    <select
                      required
                      value={editWastageReasonId}
                      onChange={(e) => setEditWastageReasonId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-red-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-400"
                    >
                      <option value="">-- Select Wastage Reason --</option>
                      {wastageReasons.map((wr) => (
                        <option key={wr.id} value={wr.id}>
                          {wr.reason}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Remarks / Note</label>
                  <input
                    type="text"
                    value={editRemarks}
                    onChange={(e) => setEditRemarks(e.target.value)}
                    placeholder="e.g. Corrected good prints count from customer job sheet"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
              </div>

              {/* 4. Live Stock & Financial Recalculation Strip */}
              <div className="p-4 bg-slate-950 text-white rounded-xl space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center space-x-2">
                    <History className="w-4 h-4 text-yellow-400" />
                    <span className="font-bold text-slate-300 text-xs">Live Calculation Impact:</span>
                  </div>
                  {isOwner && (
                    <span className="font-mono text-xs text-yellow-400 font-bold">
                      Billing Rate: ₹{editRateInfo.rate.toFixed(2)}/click
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Machine Clicks:</span>
                    <span className="font-black text-white font-mono">
                      {editModalJob.machineClicks} → {editLiveCalc.machineClicks} clicks
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Sheet Consumption:</span>
                    <span className="font-black text-white font-mono">
                      {oldSheets} → {newSheets} sheets
                    </span>
                  </div>
                  {isOwner && (
                    <div>
                      <span className="text-slate-400 block text-[11px]">Job Billing Cost:</span>
                      <span className="font-black text-yellow-400 font-mono">
                        ₹{editModalJob.grandTotalCost} → ₹{editLiveCalc.grandTotalCost.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Stock Adjustment Impact Badge */}
                <div className="pt-2 border-t border-slate-800 text-[11px] font-bold">
                  {isSameMedia ? (
                    sheetsDiff > 0 ? (
                      <span className="text-amber-400 flex items-center space-x-1">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>⚠️ Will deduct {sheetsDiff} additional sheet(s) from {editSelectedMedia?.name || 'media'}.</span>
                      </span>
                    ) : sheetsDiff < 0 ? (
                      <span className="text-emerald-400 flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>✅ Will refund and restore {Math.abs(sheetsDiff)} sheet(s) back to {editSelectedMedia?.name || 'media'}.</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">
                        Paper stock consumption remains unchanged ({newSheets} sheets).
                      </span>
                    )
                  ) : (
                    <span className="text-cyan-400 flex items-center space-x-1">
                      <RefreshCw className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>🔄 Will return {oldSheets} sheets to previous paper &amp; deduct {newSheets} sheets from newly selected paper.</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-2 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setEditModalJob(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 py-3 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black rounded-xl shadow-md shadow-yellow-400/25 transition disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <Save className="w-4 h-4 stroke-[2.5]" />
                  <span>{savingEdit ? 'Saving Changes...' : 'Save Job Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
