'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Printer,
  Gauge,
  Boxes,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  FileSpreadsheet,
  ArrowUpRight,
  PlusCircle,
  Search,
  Filter,
  DollarSign,
  AlertCircle,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';

export default function DashboardPage() {
  const { user, token, loading: authLoading, isOwner } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('today');
  const [searchTerm, setSearchTerm] = useState('');

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

  const fetchDashboardData = async (filterKey: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard?filter=${filterKey}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchDashboardData(filter);
    }
  }, [user, authLoading, filter, token]);

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
      fetchDashboardData(filter);
    } catch (err: any) {
      alert('Delete failed: ' + err.message);
    } finally {
      setDeletingJob(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  const s = data?.summary || {};
  const mc = data?.machineCounter || {};
  const lowStock = data?.lowStockMedia || [];
  const recentJobs = data?.recentJobs || [];
  const trends = data?.trends || [];

  const filteredRecentJobs = recentJobs.filter((j: any) =>
    searchTerm
      ? j.jobNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        j.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        j.product.toLowerCase().includes(searchTerm.toLowerCase())
      : true
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
      {/* Header Banner & Date Filter */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white border border-yellow-400 p-1 flex items-center justify-center shadow-xs flex-shrink-0">
            <img src="/logo-badge.png" alt="Print Bazzar" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black text-slate-950 tracking-tight">
                Production Dashboard
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-yellow-400 text-slate-950 border border-yellow-400">
                Konica Minolta C3070 Press
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Real-time shop-floor printing metrics, stock status, and shift reconciliation
            </p>
          </div>
        </div>

        {/* Date Filter Tabs */}
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
          {[
            { label: 'Today', key: 'today' },
            { label: 'Yesterday', key: 'yesterday' },
            { label: 'This Week', key: 'this_week' },
            { label: 'This Month', key: 'this_month' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg transition ${
                filter === tab.key
                  ? 'bg-yellow-400 text-slate-950 shadow-2xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Machine Meter Shift Card */}
      <div className="bg-slate-950 text-white rounded-2xl p-5 shadow-lg border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-yellow-400/20 text-yellow-400 rounded-2xl">
            <Gauge className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Press Meter Reading
              </span>
              {mc.isClosed ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-yellow-400 text-slate-950">
                  Shift Closed
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-yellow-400/20 text-yellow-300 border border-yellow-400/30">
                  Live Shift Active
                </span>
              )}
            </div>
            <div className="text-xl font-black text-white mt-1 flex items-center space-x-3">
              <span>Opening: {mc.openingCounter?.toLocaleString() || 1067426}</span>
              <span className="text-slate-600">|</span>
              <span className="text-yellow-400">
                Logged Clicks: {mc.totalJobClicksToday?.toLocaleString() || 0}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <Link
            href="/production"
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5]" />
            <span>➕ New Job Entry</span>
          </Link>
          <Link
            href="/daily-closing"
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/10 transition"
          >
            <Clock className="w-4 h-4 text-yellow-400" />
            <span>Daily Closing</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Clicks */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              Total Clicks
            </span>
            <div className="p-2 bg-yellow-400/20 text-slate-950 rounded-xl">
              <Printer className="w-4 h-4 text-yellow-700" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {s.totalMachineClicks?.toLocaleString() || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            Duplex (2x) + Simplex (1x)
          </div>
        </div>

        {/* Paper Sheets Consumed */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              Sheets Consumed
            </span>
            <div className="p-2 bg-slate-100 text-slate-800 rounded-xl">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {s.totalSheetConsumption?.toLocaleString() || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            Good ({s.totalGoodPrints || 0}) + Waste ({s.totalWastage || 0})
          </div>
        </div>

        {/* Wastage Rate */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              Wastage Ratio
            </span>
            <div className="p-2 bg-red-50 text-red-600 rounded-xl">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-red-600">
            {s.wastagePercent || '0.0'}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            {s.totalWastage || 0} sheets rejected
          </div>
        </div>

        {/* Financial Value (OWNER ONLY) */}
        {isOwner ? (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">
                Production Value
              </span>
              <div className="p-2 bg-yellow-400 text-slate-950 rounded-xl font-bold">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-950">
              ₹{s.grandTotalCost?.toLocaleString() || '0.00'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">
              Base + 18% GST included
            </div>
          </div>
        ) : (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">
                Good Production Output
              </span>
              <div className="p-2 bg-yellow-400/20 text-yellow-800 rounded-xl">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">
              {s.totalGoodPrints?.toLocaleString() || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">
              Physical Good Sheets Produced
            </div>
          </div>
        )}
      </div>

      {/* Production Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Machine Clicks Trend */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Machine Production Trend (14 Days)
              </h3>
              <p className="text-xs text-slate-500">Daily clicks generated by Konica C3070</p>
            </div>
            <div className="p-1.5 bg-yellow-400/15 text-slate-950 rounded-lg text-xs font-bold">
              Clicks
            </div>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(value: any) => [`${value} Clicks`, 'Production']}
                />
                <Bar dataKey="clicks" fill="#FACC15" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Wastage Trend */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Wastage Ratio Trend (14 Days)
              </h3>
              <p className="text-xs text-slate-500">Percentage of wasted sheets per shift</p>
            </div>
            <div className="p-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-bold">
              Wastage %
            </div>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(value: any) => [`${value}%`, 'Wastage Rate']}
                />
                <Line
                  type="monotone"
                  dataKey="wastagePct"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#ef4444' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Production Jobs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900">
              Recent Production Entries ({filteredRecentJobs.length})
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Logged jobs for {filter.replace('_', ' ')}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search job#, customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
              />
            </div>
            <Link
              href="/reports"
              className="text-xs font-bold text-slate-900 bg-yellow-400 hover:bg-yellow-500 px-3 py-1.5 rounded-xl shadow-xs transition"
            >
              View Full Report
            </Link>
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
                <th className="py-3 px-4">Operator</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredRecentJobs.length === 0 ? (
                <tr>
                  <td colSpan={isOwner ? 9 : 8} className="py-8 text-center text-slate-400">
                    No production jobs recorded for this period.
                  </td>
                </tr>
              ) : (
                filteredRecentJobs.map((j: any) => (
                  <tr key={j.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-black text-slate-900">
                      {j.jobNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">
                        {j.customerName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {j.product} (Qty: {j.orderedQuantity})
                      </div>
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
                      <div className="text-[10px] text-slate-400 font-medium">
                        {j.sheetConsumption} sheets used
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-black text-slate-900">
                        {j.goodPrints} good
                      </div>
                      {j.wastage > 0 && (
                        <div className="text-[10px] text-red-600 font-bold">
                          +{j.wastage} wasted ({j.wastageReasonName || 'N/A'})
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
                    <td className="py-3 px-4 text-slate-600 font-semibold">
                      {j.operatorName}
                    </td>
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
