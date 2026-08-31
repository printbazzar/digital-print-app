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
  const { user, loading: authLoading, isOwner } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('today');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchDashboardData = async (filterKey: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard?filter=${filterKey}`);
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
  }, [user, authLoading, filter]);

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
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black text-slate-950 tracking-tight">
              Production Dashboard
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-400 text-slate-950 border border-yellow-400">
              Konica Minolta C3070
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
              {isOwner ? '👑 Owner Portal' : '👷 Operator Portal'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Real-time digital printing clicks, physical sheet consumption, and machine counter tracking
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Action Button */}
          <Link
            href="/production"
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-xs shadow-md shadow-yellow-400/25 transition transform active:scale-95"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5]" />
            <span>New Production Entry</span>
          </Link>

          {/* Date Filter Pills */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            {[
              { key: 'today', label: 'Today' },
              { key: 'yesterday', label: 'Yesterday' },
              { key: 'this_week', label: 'This Week' },
              { key: 'this_month', label: 'This Month' },
            ].map((p) => (
              <button
                key={p.key}
                onClick={() => setFilter(p.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  filter === p.key
                    ? 'bg-slate-950 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Machine Counter Status Banner */}
      <div className="bg-slate-950 rounded-2xl p-5 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-yellow-400 text-slate-950 rounded-xl shadow-md">
              <Gauge className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Press Meter Status
                </span>
                {mc.isClosed ? (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 rounded-full flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>DAY CLOSED</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-full flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>SHIFT ACTIVE</span>
                  </span>
                )}
              </div>
              <h2 className="text-lg font-black text-white mt-0.5">
                Konica Minolta C3070
              </h2>
            </div>
          </div>

          {/* Meter Readings Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
            <div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">
                Opening Counter
              </div>
              <div className="text-sm font-extrabold text-white">
                {mc.openingCounter ? mc.openingCounter.toLocaleString() : '1,067,426'}
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">
                Job Clicks Recorded
              </div>
              <div className="text-sm font-extrabold text-yellow-400">
                {mc.totalJobClicksToday?.toLocaleString() || 0} clicks
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">
                Closing Counter
              </div>
              <div className="text-sm font-extrabold text-white">
                {mc.closingCounter ? mc.closingCounter.toLocaleString() : 'Pending Entry'}
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">
                Meter Match Status
              </div>
              {mc.isClosed ? (
                <div
                  className={`text-xs font-bold ${
                    mc.isMatched ? 'text-yellow-400' : 'text-amber-400'
                  }`}
                >
                  {mc.isMatched ? 'MATCHED' : `MISMATCH (${mc.difference})`}
                </div>
              ) : (
                <Link
                  href="/daily-closing"
                  className="text-xs font-bold text-yellow-400 hover:text-yellow-300 underline flex items-center space-x-1"
                >
                  <span>Reconcile Now</span>
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Alert Strip (if any) */}
      {lowStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start space-x-3 text-amber-900 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-xs font-bold text-amber-900">
              Low Stock Alert ({lowStock.length} items below minimum threshold)
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {lowStock.map((m: any) => (
                <span
                  key={m.id}
                  className="text-[11px] font-semibold bg-white px-2.5 py-1 rounded-lg border border-amber-300 text-amber-800 shadow-2xs"
                >
                  {m.gsm} GSM {m.name} ({m.size}):{' '}
                  <strong className="text-red-600">{m.currentStock} sheets left</strong> (Min: {m.minimumStockLevel})
                </span>
              ))}
            </div>
          </div>
          <Link
            href="/inventory"
            className="text-xs font-bold text-amber-800 hover:text-amber-900 underline flex-shrink-0"
          >
            Restock
          </Link>
        </div>
      )}

      {/* Key KPI Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Machine Clicks */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              Total Machine Clicks
            </span>
            <div className="p-2 bg-yellow-400/15 text-slate-950 rounded-xl font-bold">
              <Printer className="w-4 h-4 text-yellow-600" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {s.totalMachineClicks?.toLocaleString() || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center space-x-2 font-medium">
            <span className="font-bold text-yellow-700">
              {s.totalColourClicks || 0} Colour
            </span>
            <span>•</span>
            <span className="font-bold text-slate-700">
              {s.totalBWClicks || 0} B&W
            </span>
          </div>
        </div>

        {/* Physical Sheets Used */}
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
          <div className="text-[11px] text-slate-500 mt-1 flex items-center space-x-2 font-medium">
            <span>{s.totalSingleSide || 0} 1-Side</span>
            <span>•</span>
            <span>{s.totalDoubleSide || 0} 2-Side</span>
          </div>
        </div>

        {/* Wastage Count & Percentage */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              Wastage & Reprints
            </span>
            <div className="p-2 bg-red-50 text-red-600 rounded-xl">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 flex items-baseline space-x-2">
            <span>{s.totalWastage || 0}</span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                (s.wastagePercentage || 0) > 5
                  ? 'bg-red-100 text-red-700'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {s.wastagePercentage || 0}%
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            Good Prints: <strong className="text-slate-800">{s.totalGoodPrints || 0}</strong> | Reprints: {s.totalReprint || 0}
          </div>
        </div>

        {/* 4th Card: Production Value (OWNER ONLY) vs Good Output (OPERATOR) */}
        {isOwner ? (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-yellow-800">
                Production Value
              </span>
              <div className="p-2 bg-yellow-400 text-slate-950 rounded-xl font-bold">
                <DollarSign className="w-4 h-4 stroke-[2.5]" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">
              ₹{s.grandTotalCost?.toLocaleString() || '0.00'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">
              ₹{s.totalCost?.toLocaleString() || 0} + 18% GST
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
                <th className="py-3 px-4">Customer & Product</th>
                <th className="py-3 px-4">Print Specs</th>
                <th className="py-3 px-4">Media Used</th>
                <th className="py-3 px-4">Good / Wst</th>
                <th className="py-3 px-4">Clicks</th>
                {isOwner && <th className="py-3 px-4">Cost (INR)</th>}
                <th className="py-3 px-4">Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredRecentJobs.length === 0 ? (
                <tr>
                  <td colSpan={isOwner ? 8 : 7} className="py-8 text-center text-slate-400">
                    No production jobs recorded for this period.
                  </td>
                </tr>
              ) : (
                filteredRecentJobs.map((j: any) => (
                  <tr key={j.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {j.jobNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">
                        {j.customerName}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {j.product} (Qty: {j.orderedQuantity})
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            j.printType === 'COLOUR'
                              ? 'bg-yellow-100 text-yellow-900 border border-yellow-300'
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
                      <div className="text-slate-800 font-semibold truncate max-w-[150px]">
                        {j.mediaName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {j.sheetConsumption} sheets used
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">
                        {j.goodPrints} good
                      </div>
                      {j.wastage > 0 && (
                        <div className="text-[10px] text-red-600 font-semibold">
                          +{j.wastage} wasted ({j.wastageReasonName || 'N/A'})
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {j.machineClicks} clicks
                    </td>
                    {isOwner && (
                      <td className="py-3 px-4 font-bold text-purple-900">
                        ₹{j.grandTotalCost}
                      </td>
                    )}
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {j.operatorName}
                    </td>
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
