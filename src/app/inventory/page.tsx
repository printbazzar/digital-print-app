'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import {
  Boxes,
  PlusCircle,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
  History,
  Layers,
  ShieldCheck,
  Edit2,
  PackagePlus,
  Scale,
  X,
} from 'lucide-react';

export default function InventoryPage() {
  const { user, isOwner, loading: authLoading } = useAuth();
  const router = useRouter();

  const [mediaList, setMediaList] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [addMediaModalOpen, setAddMediaModalOpen] = useState(false);
  const [editMediaModalOpen, setEditMediaModalOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<any | null>(null);

  // Form states
  // 1. Restock
  const [restockQty, setRestockQty] = useState<number | ''>('');
  const [restockReason, setRestockReason] = useState('');

  // 2. Adjust Stock
  const [adjustTargetStock, setAdjustTargetStock] = useState<number | ''>('');
  const [adjustReason, setAdjustReason] = useState('Physical audit reconciliation / stock correction');

  // 3. Add Media
  const [newMediaName, setNewMediaName] = useState('');
  const [newMediaGsm, setNewMediaGsm] = useState<number | ''>(300);
  const [newMediaSize, setNewMediaSize] = useState('13x19');
  const [newMediaBrand, setNewMediaBrand] = useState('');
  const [newMediaStock, setNewMediaStock] = useState<number | ''>(0);
  const [newMediaMinStock, setNewMediaMinStock] = useState<number | ''>(100);

  // 4. Edit Media
  const [editName, setEditName] = useState('');
  const [editGsm, setEditGsm] = useState<number | ''>('');
  const [editSize, setEditSize] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editMinStock, setEditMinStock] = useState<number | ''>('');

  const [actionLoading, setActionLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchInventoryData = async () => {
    setLoading(true);
    try {
      const [medRes, movRes] = await Promise.all([
        fetch('/api/media'),
        fetch('/api/inventory/movements'),
      ]);

      if (medRes.ok) {
        const d = await medRes.json();
        setMediaList(d.media || []);
      }
      if (movRes.ok) {
        const m = await movRes.json();
        setMovements(m.movements || []);
      }
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchInventoryData();
    }
  }, [user, authLoading]);

  // Handle Restock Submit
  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedia || !restockQty || Number(restockQty) <= 0) return;

    setActionLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/inventory/restock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaId: selectedMedia.id,
          quantity: Number(restockQty),
          reason: restockReason.trim() || 'Restock purchase',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to restock');

      setStatusMsg({ type: 'success', text: data.message });
      setRestockModalOpen(false);
      setRestockQty('');
      setRestockReason('');
      fetchInventoryData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Stock Adjustment Submit
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedia || adjustTargetStock === '' || Number(adjustTargetStock) < 0) return;

    if (!adjustReason.trim()) {
      setStatusMsg({ type: 'error', text: 'Adjustment reason is required.' });
      return;
    }

    setActionLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaId: selectedMedia.id,
          newStock: Number(adjustTargetStock),
          reason: adjustReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to adjust stock');

      setStatusMsg({ type: 'success', text: data.message });
      setAdjustModalOpen(false);
      setAdjustTargetStock('');
      setAdjustReason('Physical audit reconciliation / stock correction');
      fetchInventoryData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Add New Media Submit
  const handleAddMediaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMediaName.trim() || !newMediaGsm || !newMediaSize.trim()) return;

    setActionLoading(true);
    setStatusMsg(null);
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

      setStatusMsg({ type: 'success', text: `Media '${newMediaName}' added successfully!` });
      setAddMediaModalOpen(false);
      setNewMediaName('');
      setNewMediaGsm(300);
      setNewMediaSize('13x19');
      setNewMediaBrand('');
      setNewMediaStock(0);
      setNewMediaMinStock(100);
      fetchInventoryData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Edit Media Submit
  const handleEditMediaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedia || !editName.trim() || !editGsm || !editSize.trim()) return;

    setActionLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/media', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedMedia.id,
          name: editName.trim(),
          gsm: Number(editGsm),
          size: editSize.trim(),
          brand: editBrand.trim() || 'Generic',
          minimumStockLevel: Number(editMinStock) || 100,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update media');

      setStatusMsg({ type: 'success', text: `Media '${editName}' updated successfully!` });
      setEditMediaModalOpen(false);
      fetchInventoryData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Open Edit Modal with Pre-fill
  const openEditModal = (m: any) => {
    setSelectedMedia(m);
    setEditName(m.name);
    setEditGsm(m.gsm);
    setEditSize(m.size);
    setEditBrand(m.brand || 'Generic');
    setEditMinStock(m.minimumStockLevel);
    setEditMediaModalOpen(true);
  };

  // Open Adjust Modal with Pre-fill
  const openAdjustModal = (m: any) => {
    setSelectedMedia(m);
    setAdjustTargetStock(m.currentStock);
    setAdjustReason('Physical audit reconciliation / stock correction');
    setAdjustModalOpen(true);
  };

  const filteredMedia = mediaList.filter((m) =>
    searchTerm
      ? m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.gsm.toString().includes(searchTerm) ||
        m.size.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.brand?.toLowerCase().includes(searchTerm.toLowerCase())
      : true
  );

  const lowStockCount = mediaList.filter((m) => m.currentStock <= m.minimumStockLevel).length;
  const totalPhysicalSheets = mediaList.reduce((acc, m) => acc + m.currentStock, 0);

  if (authLoading) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Boxes className="w-5 h-5 text-yellow-600" />
            <h1 className="text-xl font-black text-slate-950 tracking-tight">
              Media & Paper Inventory
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-400 text-slate-950 border border-yellow-400">
              Konica C3070 Press Stocks
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Real-time physical sheet inventory, stock adjustment, purchase restock, and movement audit ledger
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {isOwner && (
            <button
              onClick={() => setAddMediaModalOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              <PackagePlus className="w-4 h-4 text-yellow-400" />
              <span>Add New Media</span>
            </button>
          )}

          <button
            onClick={() => {
              if (mediaList.length > 0) {
                setSelectedMedia(mediaList[0]);
                setRestockQty('');
                setRestockReason('');
                setRestockModalOpen(true);
              }
            }}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-xs rounded-xl shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5]" />
            <span>Restock Purchase</span>
          </button>
        </div>
      </div>

      {/* Status Notifications */}
      {statusMsg && (
        <div
          className={`p-4 rounded-2xl border flex items-start space-x-3 text-xs shadow-xs animate-fade-in ${
            statusMsg.type === 'success'
              ? 'bg-yellow-50 border-yellow-300 text-slate-950'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          )}
          <div className="font-bold flex-1">{statusMsg.text}</div>
          <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Active Media
            </span>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              {mediaList.length} Types
            </div>
            <span className="text-[11px] text-slate-500 font-medium">Art Board, Maplitho, Stickers, etc.</span>
          </div>
          <div className="p-3 bg-slate-100 text-slate-800 rounded-2xl font-bold">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Sheets In Stock
            </span>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              {totalPhysicalSheets.toLocaleString()} Sheets
            </div>
            <span className="text-[11px] text-slate-500 font-medium">Available for digital print jobs</span>
          </div>
          <div className="p-3 bg-yellow-400/20 text-slate-950 rounded-2xl font-bold">
            <Boxes className="w-5 h-5 text-yellow-700" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Low Stock Alerts
            </span>
            <div className="text-2xl font-black text-red-600 mt-0.5">
              {lowStockCount} Items
            </div>
            <span className="text-[11px] text-slate-500 font-medium">Below minimum safety threshold</span>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-2xl font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Media Catalog Grid & Adjustment Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-slate-900">
              Media Master Catalog ({filteredMedia.length})
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Adjust stock counts, edit parameters, or record restock purchases
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search media, GSM, brand..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 font-semibold"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Media Name</th>
                <th className="py-3 px-4">Weight (GSM)</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Brand</th>
                <th className="py-3 px-4">Current Stock</th>
                <th className="py-3 px-4">Min Alert</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredMedia.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No media items found matching search.
                  </td>
                </tr>
              ) : (
                filteredMedia.map((m) => {
                  const isLow = m.currentStock <= m.minimumStockLevel;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {m.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          {m.gsm} GSM
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {m.size}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {m.brand || 'Generic'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`font-black text-sm ${
                            isLow ? 'text-red-600' : 'text-slate-900'
                          }`}
                        >
                          {m.currentStock.toLocaleString()} sheets
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-semibold">
                        {m.minimumStockLevel} sheets
                      </td>
                      <td className="py-3.5 px-4">
                        {isLow ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 rounded-full inline-flex items-center space-x-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>LOW STOCK</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-yellow-100 text-slate-950 border border-yellow-300 rounded-full inline-flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3 text-yellow-600" />
                            <span>OPTIMAL</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Quick Adjust Button */}
                          <button
                            onClick={() => openAdjustModal(m)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-yellow-400 hover:text-slate-950 text-slate-700 font-bold text-xs rounded-lg transition flex items-center space-x-1"
                            title="Adjust Physical Stock Count"
                          >
                            <Scale className="w-3.5 h-3.5" />
                            <span>Adjust</span>
                          </button>

                          {/* Quick Restock Button */}
                          <button
                            onClick={() => {
                              setSelectedMedia(m);
                              setRestockQty('');
                              setRestockReason('');
                              setRestockModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 bg-yellow-400/20 hover:bg-yellow-400 text-slate-950 font-bold text-xs rounded-lg transition flex items-center space-x-1"
                            title="Add Restock Quantity"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>Restock</span>
                          </button>

                          {/* Edit Media Details (Owner) */}
                          {isOwner && (
                            <button
                              onClick={() => openEditModal(m)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-lg transition"
                              title="Edit Media Attributes"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Movement Audit Ledger */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <History className="w-4 h-4 text-yellow-600" />
              <h2 className="text-sm font-black text-slate-900">
                Stock Movements Audit Ledger ({movements.length})
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Permanent immutable trace of every production consumption, manual stock adjustment, and restock
            </p>
          </div>
        </div>

        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 sticky top-0">
              <tr>
                <th className="py-2.5 px-4 bg-slate-50">Timestamp</th>
                <th className="py-2.5 px-4 bg-slate-50">Media</th>
                <th className="py-2.5 px-4 bg-slate-50">Movement Type</th>
                <th className="py-2.5 px-4 bg-slate-50">Opening</th>
                <th className="py-2.5 px-4 bg-slate-50">Quantity Delta</th>
                <th className="py-2.5 px-4 bg-slate-50">Closing</th>
                <th className="py-2.5 px-4 bg-slate-50">Reason / Reference</th>
                <th className="py-2.5 px-4 bg-slate-50">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-400">
                    No stock movements recorded yet.
                  </td>
                </tr>
              ) : (
                movements.map((mov) => {
                  const isPositive = mov.quantity > 0;
                  const isNegative = mov.quantity < 0;
                  return (
                    <tr key={mov.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">
                        {new Date(mov.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">
                        {mov.mediaName}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md ${
                            mov.movementType === 'STOCK_IN'
                              ? 'bg-yellow-100 text-slate-950 border border-yellow-300'
                              : mov.movementType === 'STOCK_ADJUSTMENT'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {mov.movementType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-500">
                        {mov.openingStock}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`font-black ${
                            isPositive
                              ? 'text-yellow-700'
                              : isNegative
                              ? 'text-red-600'
                              : 'text-slate-500'
                          }`}
                        >
                          {isPositive ? `+${mov.quantity}` : mov.quantity}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-black text-slate-900">
                        {mov.closingStock}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {mov.reason || mov.referenceId || 'N/A'}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">
                        {mov.userName || 'System'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: STOCK ADJUSTMENT MODAL */}
      {adjustModalOpen && selectedMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-yellow-400 text-slate-950 flex items-center justify-center font-bold">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Stock Count Adjustment</h3>
                  <p className="text-[11px] text-yellow-400 font-medium">Correct physical inventory quantity</p>
                </div>
              </div>
              <button
                onClick={() => setAdjustModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="font-bold text-slate-900">
                  {selectedMedia.gsm} GSM {selectedMedia.name} ({selectedMedia.size})
                </div>
                <div className="text-slate-500">Brand: {selectedMedia.brand || 'Generic'}</div>
                <div className="text-xs font-extrabold text-slate-800 pt-1">
                  Current Database Stock:{' '}
                  <span className="text-yellow-800 font-black">{selectedMedia.currentStock} sheets</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  New Physical Stock Count (Sheets) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={adjustTargetStock}
                  onChange={(e) => setAdjustTargetStock(e.target.value === '' ? '' : parseInt(e.target.value))}
                  placeholder="e.g. 0 or 500"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
                {adjustTargetStock !== '' && (
                  <div className="text-[11px] font-bold mt-1.5">
                    {Number(adjustTargetStock) - selectedMedia.currentStock !== 0 ? (
                      <span
                        className={
                          Number(adjustTargetStock) > selectedMedia.currentStock
                            ? 'text-yellow-700'
                            : 'text-red-600'
                        }
                      >
                        Stock will change by {Number(adjustTargetStock) - selectedMedia.currentStock > 0 ? '+' : ''}
                        {Number(adjustTargetStock) - selectedMedia.currentStock} sheets
                      </span>
                    ) : (
                      <span className="text-slate-500">No change to stock count</span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Adjustment Reason / Audit Note *
                </label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Physical inventory count correction"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              <div className="pt-3 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-yellow-400/20 transition disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Stock Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RESTOCK MODAL */}
      {restockModalOpen && selectedMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-yellow-400 text-slate-950 flex items-center justify-center font-bold">
                  <PlusCircle className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Restock Paper Purchase</h3>
                  <p className="text-[11px] text-yellow-400 font-medium">Add received reams / sheets into inventory</p>
                </div>
              </div>
              <button
                onClick={() => setRestockModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRestockSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Select Media Item *
                </label>
                <select
                  value={selectedMedia.id}
                  onChange={(e) => {
                    const found = mediaList.find((m) => m.id === e.target.value);
                    if (found) setSelectedMedia(found);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  {mediaList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.gsm} GSM {m.name} ({m.size}) — Stock: {m.currentStock}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Quantity Received (Sheets) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value === '' ? '' : parseInt(e.target.value))}
                  placeholder="e.g. 500 or 1000"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
                {restockQty !== '' && (
                  <div className="text-[11px] font-bold text-yellow-800 mt-1">
                    New Stock will be: {selectedMedia.currentStock + Number(restockQty)} sheets
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Purchase Reference / Supplier Note
                </label>
                <input
                  type="text"
                  value={restockReason}
                  onChange={(e) => setRestockReason(e.target.value)}
                  placeholder="e.g. Invoice #PB-9812 / Century Mill purchase"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              <div className="pt-3 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setRestockModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-yellow-400/20 transition disabled:opacity-50"
                >
                  {actionLoading ? 'Adding...' : 'Confirm Restock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD NEW MEDIA MODAL */}
      {addMediaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-yellow-400 text-slate-950 flex items-center justify-center font-bold">
                  <PackagePlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Add New Media Stock</h3>
                  <p className="text-[11px] text-yellow-400 font-medium">Create a new paper type or sticker</p>
                </div>
              </div>
              <button
                onClick={() => setAddMediaModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMediaSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Media / Paper Name *
                </label>
                <input
                  type="text"
                  required
                  value={newMediaName}
                  onChange={(e) => setNewMediaName(e.target.value)}
                  placeholder="e.g. Art Board / Velvet Matte Sticker"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    GSM (Weight) *
                  </label>
                  <input
                    type="number"
                    required
                    min="40"
                    max="600"
                    value={newMediaGsm}
                    onChange={(e) => setNewMediaGsm(e.target.value === '' ? '' : parseInt(e.target.value))}
                    placeholder="300"
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
                    value={newMediaSize}
                    onChange={(e) => setNewMediaSize(e.target.value)}
                    placeholder="13x19 or A4"
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
                  value={newMediaBrand}
                  onChange={(e) => setNewMediaBrand(e.target.value)}
                  placeholder="e.g. ITC Cyber XL / Century / Generic"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Initial Stock (Sheets)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newMediaStock}
                    onChange={(e) => setNewMediaStock(e.target.value === '' ? '' : parseInt(e.target.value))}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Min Alert Level
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newMediaMinStock}
                    onChange={(e) => setNewMediaMinStock(e.target.value === '' ? '' : parseInt(e.target.value))}
                    placeholder="100"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setAddMediaModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-yellow-400/20 transition disabled:opacity-50"
                >
                  {actionLoading ? 'Creating...' : 'Add Media'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: EDIT MEDIA MODAL */}
      {editMediaModalOpen && selectedMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-yellow-400 text-slate-950 flex items-center justify-center font-bold">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Edit Media Details</h3>
                  <p className="text-[11px] text-yellow-400 font-medium">Update name, GSM, size, brand</p>
                </div>
              </div>
              <button
                onClick={() => setEditMediaModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditMediaSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Media / Paper Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    GSM (Weight) *
                  </label>
                  <input
                    type="number"
                    required
                    min="40"
                    max="600"
                    value={editGsm}
                    onChange={(e) => setEditGsm(e.target.value === '' ? '' : parseInt(e.target.value))}
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
                    value={editSize}
                    onChange={(e) => setEditSize(e.target.value)}
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
                  value={editBrand}
                  onChange={(e) => setEditBrand(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Minimum Alert Level (Sheets)
                </label>
                <input
                  type="number"
                  min="1"
                  value={editMinStock}
                  onChange={(e) => setEditMinStock(e.target.value === '' ? '' : parseInt(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              <div className="pt-3 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setEditMediaModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-yellow-400/20 transition disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
