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
} from 'lucide-react';
import { exportToExcel, exportToPDF } from '@/lib/export-utils';

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [period, setPeriod] = useState('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [printType, setPrintType] = useState('');
  const [paperSize, setPaperSize] = useState('');

  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

      const res = await fetch(`/api/reports?${params.toString()}`);
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
  }, [user, authLoading, period, printType, paperSize]);

  if (authLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
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
      {/* Header & Export Actions */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Production Reports & Analytics
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Konica C3070
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Filterable performance audits, sheet consumption ledgers, and exportable reports
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => reportData && exportToExcel(reportData)}
            disabled={!reportData || jobsList.length === 0}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel (.xlsx)</span>
          </button>

          <button
            onClick={() => reportData && exportToPDF(reportData)}
            disabled={!reportData || jobsList.length === 0}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-sm transition disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF (.pdf)</span>
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center space-x-1 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
          <Filter className="w-3.5 h-3.5" />
          <span>Filters:</span>
        </div>

        {/* Period Selector */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          {[
            { key: 'today', label: 'Today' },
            { key: 'yesterday', label: 'Yesterday' },
            { key: 'this_week', label: 'This Week' },
            { key: 'this_month', label: 'This Month' },
            { key: 'custom', label: 'Custom' },
          ].map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                period === p.key ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom Date Inputs if Custom Selected */}
        {period === 'custom' && (
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
            <button
              onClick={fetchReport}
              className="px-2.5 py-1 bg-emerald-600 text-white font-bold rounded-lg text-xs"
            >
              Apply
            </button>
          </div>
        )}

        {/* Print Type Filter */}
        <select
          value={printType}
          onChange={(e) => setPrintType(e.target.value)}
          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
        >
          <option value="">All Print Modes</option>
          <option value="COLOUR">Colour Only</option>
          <option value="BW">B&W Only</option>
        </select>

        {/* Paper Size Filter */}
        <select
          value={paperSize}
          onChange={(e) => setPaperSize(e.target.value)}
          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
        >
          <option value="">All Sizes</option>
          <option value="A4">A4 Size</option>
          <option value="A3">A3 Size</option>
        </select>

        <button
          onClick={fetchReport}
          className="ml-auto flex items-center space-x-1 text-slate-500 hover:text-slate-800 font-bold"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Jobs Logged</div>
          <div className="text-xl font-black text-slate-900 mt-0.5">{s.totalJobs || 0}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Total Clicks</div>
          <div className="text-xl font-black text-emerald-700 mt-0.5">{s.totalClicks?.toLocaleString() || 0}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Sheets Used</div>
          <div className="text-xl font-black text-slate-900 mt-0.5">{s.totalSheetConsumption?.toLocaleString() || 0}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Good Prints</div>
          <div className="text-xl font-black text-slate-900 mt-0.5">{s.totalGoodPrints?.toLocaleString() || 0}</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Wastage Sheets</div>
          <div className="text-xl font-black text-red-600 mt-0.5">
            {s.totalWastage || 0} <span className="text-xs font-bold text-slate-500">({s.wastagePercentage}%)</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Grand Cost (INR)</div>
          <div className="text-xl font-black text-purple-900 mt-0.5">₹{s.grandTotalCost?.toLocaleString() || 0}</div>
        </div>
      </div>

      {/* Breakdowns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Operator Performance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900">
            <User className="w-4 h-4 text-emerald-600" />
            <h3>Operator Performance ({opList.length})</h3>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {opList.length === 0 ? (
              <div className="py-4 text-slate-400 text-center">No operator records.</div>
            ) : (
              opList.map((op: any, i: number) => (
                <div key={i} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-800">{op.name}</div>
                    <div className="text-[10px] text-slate-400">
                      {op.jobs} jobs • {op.good} good sheets
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-slate-900">{op.clicks} clicks</div>
                    <div className="text-[10px] text-red-600 font-semibold">{op.wastage} wasted ({op.wastagePct}%)</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Media Sheet Consumption */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900">
            <Boxes className="w-4 h-4 text-blue-600" />
            <h3>Media Consumption ({mediaList.length})</h3>
          </div>

          <div className="divide-y divide-slate-100 text-xs max-h-64 overflow-y-auto">
            {mediaList.length === 0 ? (
              <div className="py-4 text-slate-400 text-center">No media consumed.</div>
            ) : (
              mediaList.map((m: any, i: number) => (
                <div key={i} className="py-2.5 flex items-center justify-between">
                  <div className="font-semibold text-slate-800 truncate max-w-[180px]">
                    {m.name}
                  </div>
                  <div className="text-right">
                    <strong className="text-slate-900 font-extrabold">{m.sheets} sheets</strong>
                    <div className="text-[10px] text-slate-400">{m.jobs} jobs</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Wastage Reasons Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <h3>Wastage Attribution ({wastageList.length})</h3>
          </div>

          <div className="divide-y divide-slate-100 text-xs max-h-64 overflow-y-auto">
            {wastageList.length === 0 ? (
              <div className="py-4 text-slate-400 text-center">Zero wastage recorded!</div>
            ) : (
              wastageList.map((w: any, i: number) => (
                <div key={i} className="py-2.5 flex items-center justify-between">
                  <div className="font-semibold text-slate-800">{w.reason}</div>
                  <div className="text-right">
                    <strong className="text-red-600 font-extrabold">{w.quantity} sheets</strong>
                    <div className="text-[10px] text-slate-400">{w.percentage}% of total</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Complete Jobs Listing */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Detailed Production Jobs ({jobsList.length})
          </h2>
          <span className="text-xs text-slate-400 font-semibold">
            {reportData?.period?.startDate} to {reportData?.period?.endDate}
          </span>
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
                <th className="py-3 px-4">Grand Cost</th>
                <th className="py-3 px-4">Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {jobsList.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-400">
                    No production jobs logged in this filtered period.
                  </td>
                </tr>
              ) : (
                jobsList.map((j: any) => (
                  <tr key={j.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{j.jobNumber}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{j.productionDate}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{j.customerName}</td>
                    <td className="py-3 px-4 text-slate-600">{j.product}</td>
                    <td className="py-3 px-4 text-slate-800 truncate max-w-[140px]">{j.mediaName}</td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                        {j.paperSize} • {j.printType} • {j.printSide === 'DOUBLE' ? '2-Side' : '1-Side'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-emerald-700 font-bold">{j.goodPrints}</td>
                    <td className="py-3 px-4">
                      {j.wastage > 0 ? (
                        <span className="text-red-600 font-bold">+{j.wastage}</span>
                      ) : (
                        '0'
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{j.sheetConsumption}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{j.machineClicks}</td>
                    <td className="py-3 px-4 font-bold text-purple-900">₹{j.grandTotalCost}</td>
                    <td className="py-3 px-4 text-slate-500">{j.operatorName}</td>
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
