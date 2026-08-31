'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import {
  Settings,
  Printer,
  DollarSign,
  Boxes,
  AlertCircle,
  CheckCircle2,
  PlusCircle,
  Edit2,
  Save,
  X,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';

export default function MastersPage() {
  const { user, isOwner, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'rates' | 'media' | 'machine' | 'wastage'>('rates');

  // Master states
  const [rates, setRates] = useState<any[]>([]);
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [wastageReasons, setWastageReasons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Rate inline state
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [rateEditVal, setRateEditVal] = useState<number | ''>('');
  const [rateGstVal, setRateGstVal] = useState<number | ''>('');

  // Add Media form
  const [newMediaName, setNewMediaName] = useState('');
  const [newMediaGsm, setNewMediaGsm] = useState<number | ''>('');
  const [newMediaSize, setNewMediaSize] = useState('13x19');
  const [newMediaBrand, setNewMediaBrand] = useState('');
  const [newMediaStock, setNewMediaStock] = useState<number | ''>(500);
  const [newMediaMinStock, setNewMediaMinStock] = useState<number | ''>(100);

  // Add Wastage Reason
  const [newReasonText, setNewReasonText] = useState('');

  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchMasters = async () => {
    setLoading(true);
    try {
      const [rRes, mRes, machRes, wrRes] = await Promise.all([
        fetch('/api/rates'),
        fetch('/api/media'),
        fetch('/api/machines'),
        fetch('/api/wastage-reasons'),
      ]);

      if (rRes.ok) {
        const d = await rRes.json();
        setRates(d.rates || []);
      }
      if (mRes.ok) {
        const d = await mRes.json();
        setMediaList(d.media || []);
      }
      if (machRes.ok) {
        const d = await machRes.json();
        setMachines(d.machines || []);
      }
      if (wrRes.ok) {
        const d = await wrRes.json();
        setWastageReasons(d.reasons || []);
      }
    } catch (err) {
      console.error('Failed to load masters:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && !isOwner) {
      router.push('/');
    } else if (user && isOwner) {
      fetchMasters();
    }
  }, [user, isOwner, authLoading]);

  const handleUpdateRate = async (id: string) => {
    if (rateEditVal === '' || Number(rateEditVal) < 0) return;
    try {
      const res = await fetch('/api/rates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          rate: Number(rateEditVal),
          gstPercent: rateGstVal !== '' ? Number(rateGstVal) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update rate');

      setStatusMsg({ type: 'success', text: 'Print rate updated successfully.' });
      setEditingRateId(null);
      fetchMasters();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const handleAddMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMediaName.trim() || !newMediaGsm || !newMediaSize) return;

    try {
      const res = await fetch('/api/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newMediaName.trim(),
          gsm: Number(newMediaGsm),
          size: newMediaSize.trim(),
          brand: newMediaBrand.trim() || 'Generic',
          currentStock: Number(newMediaStock) || 0,
          minimumStockLevel: Number(newMediaMinStock) || 100,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add media');

      setStatusMsg({ type: 'success', text: `Added ${newMediaName} to media master.` });
      setNewMediaName('');
      setNewMediaGsm('');
      setNewMediaBrand('');
      fetchMasters();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const handleAddWastageReason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReasonText.trim()) return;

    try {
      const res = await fetch('/api/wastage-reasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: newReasonText.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add reason');

      setStatusMsg({ type: 'success', text: 'New wastage reason added to master.' });
      setNewReasonText('');
      fetchMasters();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  if (authLoading || (!isOwner && user)) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-purple-600" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Master Data & Rate Settings
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
              Owner Management
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Maintain print click rate masters, media specifications, machines, and wastage categories
          </p>
        </div>

        <button
          onClick={fetchMasters}
          className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Masters</span>
        </button>
      </div>

      {/* Status banner */}
      {statusMsg && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center space-x-2 shadow-xs ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 space-x-2 text-xs font-bold">
        {[
          { key: 'rates', label: 'Print Rate Master', icon: DollarSign },
          { key: 'media', label: 'Media Master', icon: Boxes },
          { key: 'machine', label: 'Machine Master', icon: Printer },
          { key: 'wastage', label: 'Wastage Reasons', icon: AlertCircle },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center space-x-1.5 px-4 py-2.5 border-b-2 transition ${
                isActive
                  ? 'border-purple-600 text-purple-700 font-extrabold bg-purple-50/50 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Print Rate Master */}
      {activeTab === 'rates' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-6 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Print Click Rate Master (Konica Minolta C3070)
            </h2>
            <p className="text-xs text-slate-500">
              Configured click rates applied by backend cost calculation engine (all rates in INR before GST)
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Paper Size</th>
                  <th className="py-3 px-4">Print Mode</th>
                  <th className="py-3 px-4">Rate / Click (Excl. GST)</th>
                  <th className="py-3 px-4">Standard GST</th>
                  <th className="py-3 px-4">Effective Rate (Incl. GST)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {rates.map((r) => {
                  const isEditing = editingRateId === r.id;
                  const rateVal = isEditing ? Number(rateEditVal) || 0 : Number(r.rate);
                  const gstVal = isEditing ? Number(rateGstVal) || 18.0 : Number(r.gstPercent);
                  const effective = Math.round(rateVal * (1 + gstVal / 100) * 100) / 100;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{r.paperSize}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.printType === 'COLOUR'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {r.printType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.05"
                            value={rateEditVal}
                            onChange={(e) => setRateEditVal(e.target.value ? Number(e.target.value) : '')}
                            className="w-24 px-2 py-1 bg-white border border-purple-300 rounded-lg text-xs font-bold text-purple-900"
                          />
                        ) : (
                          <span className="font-extrabold text-slate-900 text-sm">
                            ₹{r.rate.toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.5"
                            value={rateGstVal}
                            onChange={(e) => setRateGstVal(e.target.value ? Number(e.target.value) : '')}
                            className="w-20 px-2 py-1 bg-white border border-purple-300 rounded-lg text-xs font-bold text-purple-900"
                          />
                        ) : (
                          <span>{r.gstPercent}%</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-700">
                        ₹{effective.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => handleUpdateRate(r.id)}
                              className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
                              title="Save Rate"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingRateId(null)}
                              className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingRateId(r.id);
                              setRateEditVal(r.rate);
                              setRateGstVal(r.gstPercent);
                            }}
                            className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-lg border border-purple-200 transition"
                          >
                            Edit Rate
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Media Master */}
      {activeTab === 'media' && (
        <div className="space-y-6">
          {/* Add New Media Form */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
              <PlusCircle className="w-4 h-4 text-emerald-600" />
              <span>Add New Media / Substrate to Master</span>
            </h3>

            <form onSubmit={handleAddMedia} className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Material Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Velvet Board"
                  value={newMediaName}
                  onChange={(e) => setNewMediaName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  GSM *
                </label>
                <input
                  type="number"
                  required
                  placeholder="300"
                  value={newMediaGsm}
                  onChange={(e) => setNewMediaGsm(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Size *
                </label>
                <input
                  type="text"
                  required
                  placeholder="13x19"
                  value={newMediaSize}
                  onChange={(e) => setNewMediaSize(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Brand
                </label>
                <input
                  type="text"
                  placeholder="Generic"
                  value={newMediaBrand}
                  onChange={(e) => setNewMediaBrand(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Initial Stock
                </label>
                <input
                  type="number"
                  placeholder="500"
                  value={newMediaStock}
                  onChange={(e) => setNewMediaStock(e.target.value ? Number(e.target.value) : 0)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-sm transition"
                >
                  + Add Media
                </button>
              </div>
            </form>
          </div>

          {/* Media Master Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 font-bold text-xs text-slate-800">
              Registered Master Media Items ({mediaList.length})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Media Name</th>
                    <th className="py-2.5 px-4">GSM</th>
                    <th className="py-2.5 px-4">Size</th>
                    <th className="py-2.5 px-4">Brand</th>
                    <th className="py-2.5 px-4">Current Stock</th>
                    <th className="py-2.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mediaList.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 font-bold text-slate-900">{m.name}</td>
                      <td className="py-2.5 px-4">{m.gsm} GSM</td>
                      <td className="py-2.5 px-4">{m.size}</td>
                      <td className="py-2.5 px-4 text-slate-500">{m.brand || 'Generic'}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-800">{m.currentStock} sheets</td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          ACTIVE
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Machine Master */}
      {activeTab === 'machine' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Digital Production Machine Master
            </h2>
            <p className="text-xs text-slate-500">
              Hardware registry for primary and future digital printing presses
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {machines.map((mach) => (
              <div
                key={mach.id}
                className="p-5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Printer className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-extrabold text-sm text-slate-900">{mach.name}</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    ACTIVE PRODUCTION
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block">Model:</span>
                    <strong className="text-slate-800">{mach.model}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Department:</span>
                    <strong className="text-slate-800">{mach.department}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Installation Starting Counter:</span>
                    <strong className="text-slate-800">{mach.initialCounter.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Current Counter:</span>
                    <strong className="text-emerald-700 font-black">{mach.currentCounter.toLocaleString()}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Wastage Reasons Master */}
      {activeTab === 'wastage' && (
        <div className="space-y-6">
          {/* Add Wastage Reason Form */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
              <PlusCircle className="w-4 h-4 text-red-600" />
              <span>Add Wastage Attribution Reason</span>
            </h3>

            <form onSubmit={handleAddWastageReason} className="flex gap-2 max-w-lg">
              <input
                type="text"
                required
                placeholder="e.g. Media Feeder Misfeed"
                value={newReasonText}
                onChange={(e) => setNewReasonText(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
              >
                + Add Reason
              </button>
            </form>
          </div>

          {/* Reasons List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-5">
            <h3 className="text-xs font-bold text-slate-800 uppercase mb-3">
              Approved Wastage Dropdown Reasons ({wastageReasons.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {wastageReasons.map((wr) => (
                <div
                  key={wr.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-between"
                >
                  <span>{wr.reason}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
