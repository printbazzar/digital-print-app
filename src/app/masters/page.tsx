'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Settings,
  DollarSign,
  Boxes,
  Printer,
  AlertCircle,
  PlusCircle,
  CheckCircle2,
  Edit2,
  Trash2,
  RefreshCw,
  Layers,
  Save,
  X,
  PackagePlus,
  Scale,
  Users,
} from 'lucide-react';
import { PaperSize, PrintType } from '@/lib/calculations';

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

  // Editing state for Rates
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [rateEditVal, setRateEditVal] = useState<number | ''>('');
  const [rateGstVal, setRateGstVal] = useState<number | ''>(18.0);

  // New Media Form state
  const [newMediaName, setNewMediaName] = useState('');
  const [newMediaGsm, setNewMediaGsm] = useState<number | ''>(300);
  const [newMediaSize, setNewMediaSize] = useState('13x19');
  const [newMediaBrand, setNewMediaBrand] = useState('');
  const [newMediaStock, setNewMediaStock] = useState<number | ''>(0);
  const [newMediaMinStock, setNewMediaMinStock] = useState<number | ''>(100);

  // Editing state for Media
  const [editingMedia, setEditingMedia] = useState<any | null>(null);
  const [editMediaName, setEditMediaName] = useState('');
  const [editMediaGsm, setEditMediaGsm] = useState<number | ''>('');
  const [editMediaSize, setEditMediaSize] = useState('');
  const [editMediaBrand, setEditMediaBrand] = useState('');
  const [editMediaMinStock, setEditMediaMinStock] = useState<number | ''>('');

  // New Wastage Reason state
  const [newReasonText, setNewReasonText] = useState('');

  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchMasters = async () => {
    setLoading(true);
    try {
      const [rRes, medRes, machRes, wrRes] = await Promise.all([
        fetch('/api/rates'),
        fetch('/api/media'),
        fetch('/api/machines'),
        fetch('/api/wastage-reasons'),
      ]);

      if (rRes.ok) {
        const d = await rRes.json();
        setRates(d.rates || []);
      }
      if (medRes.ok) {
        const d = await medRes.json();
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
      console.error('Failed to fetch masters:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && (!user || !isOwner)) {
      router.push('/login');
    } else if (user && isOwner) {
      fetchMasters();
    }
  }, [user, isOwner, authLoading]);

  // Handle Rate Update
  const handleUpdateRate = async (rateId: string) => {
    if (rateEditVal === '' || Number(rateEditVal) <= 0) return;

    try {
      const res = await fetch('/api/rates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: rateId,
          rate: Number(rateEditVal),
          gstPercent: Number(rateGstVal) || 18.0,
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

  // Handle Add Media
  const handleAddMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMediaName.trim() || !newMediaGsm || !newMediaSize.trim()) return;

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
      if (!res.ok) throw new Error(data.error || 'Failed to create media');

      setStatusMsg({ type: 'success', text: `Media '${newMediaName}' added to master successfully.` });
      setNewMediaName('');
      setNewMediaGsm(300);
      setNewMediaSize('13x19');
      setNewMediaBrand('');
      setNewMediaStock(0);
      setNewMediaMinStock(100);
      fetchMasters();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  // Handle Edit Media
  const handleSaveMediaEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMedia || !editMediaName.trim() || !editMediaGsm || !editMediaSize.trim()) return;

    try {
      const res = await fetch('/api/media', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingMedia.id,
          name: editMediaName.trim(),
          gsm: Number(editMediaGsm),
          size: editMediaSize.trim(),
          brand: editMediaBrand.trim() || 'Generic',
          minimumStockLevel: Number(editMediaMinStock) || 100,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update media');

      setStatusMsg({ type: 'success', text: `Media '${editMediaName}' updated successfully.` });
      setEditingMedia(null);
      fetchMasters();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  // Handle Add Wastage Reason
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-yellow-600" />
            <h1 className="text-xl font-black text-slate-950 tracking-tight">
              Master Data & Rate Settings
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-400 text-slate-950 border border-yellow-400">
              👑 Owner Management
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Maintain print click rate masters, media specifications, machines, and wastage categories
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            href="/staff"
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-xs rounded-xl shadow-xs transition"
          >
            <Users className="w-3.5 h-3.5" />
            <span>👥 Staff & Operators</span>
          </Link>
          <button
            onClick={fetchMasters}
            className="flex items-center space-x-1 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Masters</span>
          </button>
        </div>
      </div>

      {/* Status banner */}
      {statusMsg && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center space-x-2 shadow-xs ${
            statusMsg.type === 'success'
              ? 'bg-yellow-50 border-yellow-300 text-slate-950'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-yellow-600" />
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
                  ? 'border-yellow-400 text-slate-950 font-black bg-yellow-50/80 rounded-t-xl'
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
            <h2 className="text-sm font-black text-slate-900">
              Print Click Rate Master (Konica Minolta C3070)
            </h2>
            <p className="text-xs text-slate-500 font-medium">
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
                              ? 'bg-yellow-100 text-yellow-900 border border-yellow-300'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {r.printType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {isEditing ? (
                          <div className="flex items-center space-x-1">
                            <span>₹</span>
                            <input
                              type="number"
                              step="0.05"
                              value={rateEditVal}
                              onChange={(e) =>
                                setRateEditVal(e.target.value === '' ? '' : parseFloat(e.target.value))
                              }
                              className="w-24 px-2 py-1 bg-white border border-yellow-400 rounded-lg text-xs font-black text-slate-900 focus:outline-none"
                            />
                          </div>
                        ) : (
                          <span className="font-bold text-slate-900">₹{r.rate.toFixed(2)}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {isEditing ? (
                          <div className="flex items-center space-x-1">
                            <input
                              type="number"
                              step="0.5"
                              value={rateGstVal}
                              onChange={(e) =>
                                setRateGstVal(e.target.value === '' ? '' : parseFloat(e.target.value))
                              }
                              className="w-16 px-2 py-1 bg-white border border-yellow-400 rounded-lg text-xs font-black text-slate-900 focus:outline-none"
                            />
                            <span>%</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 font-semibold">{r.gstPercent}%</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-black text-yellow-800">₹{effective.toFixed(2)}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleUpdateRate(r.id)}
                              className="px-3 py-1 bg-yellow-400 hover:bg-yellow-500 text-slate-950 text-xs font-black rounded-lg shadow-sm transition flex items-center space-x-1"
                            >
                              <Save className="w-3 h-3" />
                              <span>Save</span>
                            </button>
                            <button
                              onClick={() => setEditingRateId(null)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingRateId(r.id);
                              setRateEditVal(r.rate);
                              setRateGstVal(r.gstPercent);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-yellow-400 text-slate-900 text-xs font-bold rounded-lg transition"
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
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
              <PackagePlus className="w-4 h-4 text-yellow-600" />
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
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-yellow-400 font-semibold"
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
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-yellow-400 font-semibold"
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
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-yellow-400 font-semibold"
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
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-yellow-400 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Initial Stock
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={newMediaStock}
                  onChange={(e) => setNewMediaStock(e.target.value ? Number(e.target.value) : 0)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-yellow-400 font-semibold"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 bg-yellow-400 hover:bg-yellow-500 text-slate-950 text-xs font-black rounded-xl shadow-sm transition flex items-center justify-center space-x-1"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add Media</span>
                </button>
              </div>
            </form>
          </div>

          {/* Media Master Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 font-black text-xs text-slate-900">
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
                    <th className="py-2.5 px-4">Min Alert</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {mediaList.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 font-bold text-slate-900">{m.name}</td>
                      <td className="py-2.5 px-4">{m.gsm} GSM</td>
                      <td className="py-2.5 px-4">{m.size}</td>
                      <td className="py-2.5 px-4 text-slate-500">{m.brand || 'Generic'}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-800">{m.currentStock} sheets</td>
                      <td className="py-2.5 px-4 text-slate-400">{m.minimumStockLevel} sheets</td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setEditingMedia(m);
                            setEditMediaName(m.name);
                            setEditMediaGsm(m.gsm);
                            setEditMediaSize(m.size);
                            setEditMediaBrand(m.brand || 'Generic');
                            setEditMediaMinStock(m.minimumStockLevel);
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-yellow-400 text-slate-900 text-xs font-bold rounded-lg transition inline-flex items-center space-x-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Edit Media Modal */}
      {editingMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-yellow-400 text-slate-950 flex items-center justify-center font-bold">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Edit Master Media</h3>
                  <p className="text-[11px] text-yellow-400 font-medium">Modify attributes & specifications</p>
                </div>
              </div>
              <button
                onClick={() => setEditingMedia(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMediaEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Media / Paper Name *
                </label>
                <input
                  type="text"
                  required
                  value={editMediaName}
                  onChange={(e) => setEditMediaName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    GSM *
                  </label>
                  <input
                    type="number"
                    required
                    min="40"
                    max="600"
                    value={editMediaGsm}
                    onChange={(e) => setEditMediaGsm(e.target.value === '' ? '' : parseInt(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Size *
                  </label>
                  <input
                    type="text"
                    required
                    value={editMediaSize}
                    onChange={(e) => setEditMediaSize(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Brand / Mill Manufacturer
                </label>
                <input
                  type="text"
                  value={editMediaBrand}
                  onChange={(e) => setEditMediaBrand(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Minimum Safety Stock Level (Sheets)
                </label>
                <input
                  type="number"
                  min="1"
                  value={editMediaMinStock}
                  onChange={(e) => setEditMediaMinStock(e.target.value === '' ? '' : parseInt(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              <div className="pt-3 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingMedia(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-yellow-400/20 transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: Machine Master */}
      {activeTab === 'machine' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div>
            <h2 className="text-sm font-black text-slate-900">
              Digital Production Machine Master
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Hardware registry for primary and future digital printing presses
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {machines.map((mach) => (
              <div
                key={mach.id}
                className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Printer className="w-5 h-5 text-yellow-600" />
                    <h3 className="font-black text-sm text-slate-900">{mach.name}</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-slate-950 border border-yellow-300">
                    ONLINE & ACTIVE
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block">Model Name:</span>
                    <strong className="text-slate-800">{mach.model}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Department:</span>
                    <strong className="text-slate-800">{mach.department}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Baseline Initial Counter:</span>
                    <strong className="text-slate-800 font-mono">{mach.initialCounter.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Current Cumulative Counter:</span>
                    <strong className="text-yellow-800 font-mono font-black">{mach.currentCounter.toLocaleString()}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Wastage Reasons */}
      {activeTab === 'wastage' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div>
            <h2 className="text-sm font-black text-slate-900">
              Wastage Reason Classification Master
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Standardized production loss categories required when operator records non-zero wastage
            </p>
          </div>

          <form onSubmit={handleAddWastageReason} className="flex gap-2">
            <input
              type="text"
              required
              placeholder="e.g. Chemical / Toner Fuser mark defect"
              value={newReasonText}
              onChange={(e) => setNewReasonText(e.target.value)}
              className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-yellow-400 font-semibold"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-slate-950 text-xs font-black rounded-xl shadow-xs transition flex items-center space-x-1"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Reason</span>
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {wastageReasons.map((wr, idx) => (
              <div
                key={wr.id || idx}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 font-black text-[10px] flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="font-bold text-slate-800">{wr.reason}</span>
                </div>
                <span className="text-[10px] font-bold text-yellow-700">Active</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
