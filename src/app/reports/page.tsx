'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import {
  FileSpreadsheet,
  Download,
  FileText,
  Filter,
  RefreshCw,
  Printer,
  Layers,
  AlertCircle,
  DollarSign,
  User,
  Boxes,
  Trash2,
  X,
  CheckCircle2,
} from 'lucide-react';
import { exportToExcel, exportToPDF } from '@/lib/export-utils';

export default function ReportsPage() {
  const { user, token, loading: authLoading, isOwner } = useAuth();
  const router = useRouter();

  const [period, setPeriod] = useState('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [printType, setPrintType] = useState('');
  const [paperSize, setPaperSize] = useState('');

  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Delete Job State
  const [deleteModalJob, setDeleteModalJob] = useState<any | null>(null);
  const [deletingJob, setDeletingJob] = useState(false);

  const getAuthHeaders = () => {
    const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('pb_token') : null);
    return {
      'Content-Type': 'application/json',
      ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
    };
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('period', period);
      if (period === 'custom' && startDate && endDate) {
        params.set('startDate', startDate);
        params.set('endDate', endDate);
      }
      if (printType) params.set('printType', printType);
      if (paperSize) params.set('paperSize', paperSize);

      const res = await fetch(`/api/reports?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const d = await res.json();
        setReportData(d);
      }
    } catch (err) {
      console.error('Failed to fetch report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchReport();
    }
  }, [user, authLoading, period, printType, paperSize, token]);

  const handleDeleteJobConfirm = async () => {
    if (!deleteModalJob) return;
    setDeletingJob(true);
    try {
      const res = await fetch(`/api/jobs/${deleteModalJob.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete job');

      setDeleteModalJob(null);
      fetchReport();
    } catch (err: any) {
      alert('Delete failed: ' + err.message);
    } finally {
      setDeletingJob(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  const s = reportData?.summary || {};
  const opList = reportData?.operatorReport || [];
  const mediaList = reportData?.mediaReport || [];
  const wastageList = reportData?.wastageReport || [];
  const jobsList = reportData?.jobs || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white border border-yellow-400 p-1 flex items-center justify-center shadow-xs flex-shrink-0">
            <img src="/logo-badge.png" alt="Print Bazzar" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black text-slate-950 tracking-tight">
                Production &amp; Operational Reports
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-400 text-slate-950 border border-yellow-400">
                Audit Intelligence
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Detailed shift summaries, operator efficiency, media consumption, and wastage analysis
            </p>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => exportToExcel(reportData, period)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition"
          >
            <Download className="w-4 h-4 text-yellow-600" />
            <span>Excel Export</span>
          </button>
          <button
            onClick={() => exportToPDF(reportData, period)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-yellow-400 hover:bg-yellow-500 text-slate-950 text-xs font-black rounded-xl shadow-xs transition"
          >
            <FileText className="w-4 h-4 stroke-[2.5]" />
            <span>PDF Summary</span>
          </button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1.5 font-bold text-slate-700 mr-2">
            <Filter className="w-4 h-4 text-yellow-600" />
            <span>Filter Period:</span>
          </div>

          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
            {[
              { label: 'Today', key: 'today' },
              { label: 'Yesterday', key: 'yesterday' },
              { label: 'This Week', key: 'this_week' },
              { label: 'This Month', key: 'this_month' },
              { label: 'Last Month', key: 'last_month' },
              { label: 'Custom', key: 'custom' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setPeriod(t.key)}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  period === t.key
                    ? 'bg-yellow-400 text-slate-950 font-black shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div className="flex items-center space-x-2 animate-fade-in">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
              />
              <button
                onClick={fetchReport}
                className="px-3 py-1 bg-slate-900 text-white font-bold rounded-lg"
              >
                Apply
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={printType}
            onChange={(e) => setPrintType(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none"
          >
            <option value="">All Print Modes</option>
            <option value="COLOUR">Colour Only</option>
            <option value="BW">B&amp;W Only</option>
          </select>

          <select
            value={paperSize}
            onChange={(e) => setPaperSize(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none"
          >
            <option value="">All Sizes</option>
            <option value="A4">A4</option>
            <option value="A3">A3 / 12x18 / 13x19</option>
          </select>
        </div>
      </div>

      {/* KPI Cards Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total Jobs Logged
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {s.totalJobs?.toLocaleString() || 0} Orders
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Digital printing production</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total Machine Clicks
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {s.totalMachineClicks?.toLocaleString() || 0} Clicks
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Meter counter increments</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Sheets Consumed
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {s.totalSheetConsumption?.toLocaleString() || 0} Sheets
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Good: {s.totalGoodPrints || 0} | Wst: {s.totalWastage || 0}</span>
        </div>

        {isOwner ? (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Production Value
            </span>
            <div className="text-2xl font-black text-slate-950 mt-1">
              ₹{s.grandTotalCost?.toLocaleString() || '0.00'}
            </div>
            <span className="text-[11px] text-slate-500 font-medium">Base + 18% GST included</span>
          </div>
        ) : (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Wastage Ratio
            </span>
            <div className="text-2xl font-black text-red-600 mt-1">
              {s.wastagePercent || '0.0'}%
            </div>
            <span className="text-[11px] text-slate-500 font-medium">{s.totalWastage || 0} sheets spoiled</span>
          </div>
        )}
      </div>

      {/* Detailed Production Jobs Ledger */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900">
              Detailed Job Log ({jobsList.length})
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Every job logged with specs, sheets, meter clicks, and operator tracking
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Job #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Media</th>
                <th className="py-3 px-4">Specs</th>
                <th className="py-3 px-4">Good</th>
                <th className="py-3 px-4">Wastage</th>
                <th className="py-3 px-4">Sheets</th>
                <th className="py-3 px-4">Clicks</th>
                {isOwner && <th className="py-3 px-4">Grand Cost</th>}
                <th className="py-3 px-4">Operator</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {jobsList.length === 0 ? (
                <tr>
                  <td colSpan={isOwner ? 13 : 12} className="py-8 text-center text-slate-400">
                    No production jobs logged in this filtered period.
                  </td>
                </tr>
              ) : (
                jobsList.map((j: any) => (
                  <tr key={j.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-black text-slate-900">{j.jobNumber}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{j.productionDate}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{j.customerName}</td>
                    <td className="py-3 px-4 text-slate-600 font-semibold">{j.product}</td>
                    <td className="py-3 px-4 text-slate-900 font-bold truncate max-w-[140px]">{j.mediaName}</td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 text-slate-800">
                        {j.paperSize} • {j.printType} • {j.printSide === 'DOUBLE' ? '2-Side' : '1-Side'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-900 font-black">{j.goodPrints}</td>
                    <td className="py-3 px-4">
                      {j.wastage > 0 ? (
                        <span className="text-red-600 font-black">+{j.wastage}</span>
                      ) : (
                        '0'
                      )}
                    </td>
                    <td className="py-3 px-4 font-black text-slate-900">{j.sheetConsumption}</td>
                    <td className="py-3 px-4 font-black text-yellow-800 text-sm">{j.machineClicks}</td>
                    {isOwner && <td className="py-3 px-4 font-black text-slate-950 text-sm">₹{j.grandTotalCost}</td>}
                    <td className="py-3 px-4 text-slate-600 font-semibold">{j.operatorName}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setDeleteModalJob(j)}
                        className="p-1.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-lg transition"
                        title="Delete mistaken entry & restore stock"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
    </div>
  );
}
