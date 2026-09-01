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
  Save,
  Check,
  ListOrdered,
  ShoppingCart,
} from 'lucide-react';

const COMMON_SIZES = ['13x19', '12x18', 'A4', 'A3', '12x24', '13x40'];
const COMMON_GSMS = [80, 100, 130, 170, 220, 250, 300, 350];
const COMMON_BRANDS = ['ITC Cyber XL', 'Century Star', 'JK Paper', 'Nippon', 'Generic'];

export default function InventoryPage() {
  const { user, token, isOwner, loading: authLoading } = useAuth();
  const router = useRouter();

  const [mediaList, setMediaList] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [bulkAuditModalOpen, setBulkAuditModalOpen] = useState(false);
  const [addMediaModalOpen, setAddMediaModalOpen] = useState(false);
  const [editMediaModalOpen, setEditMediaModalOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<any | null>(null);

  // Bulk audit state: Map of mediaId -> number
  const [bulkStocks, setBulkStocks] = useState<{ [key: string]: number }>({});
  const [bulkReason, setBulkReason] = useState('Bulk Physical Stock Count Audit');

  // Form states
  // 1. Restock
  const [restockQty, setRestockQty] = useState<number | ''>('');
  const [restockReason, setRestockReason] = useState('');

  // 2. Adjust Stock
  const [adjustTargetStock, setAdjustTargetStock] = useState<number | ''>('');
  const [adjustReason, setAdjustReason] = useState('Physical audit count reconciliation / initial stock setup');

  // 3. Add Media
  const [newMediaName, setNewMediaName] = useState('');
  const [newMediaGsm, setNewMediaGsm] = useState<number | ''>(300);
  const [newMediaSize, setNewMediaSize] = useState('13x19');
  const [newMediaBrand, setNewMediaBrand] = useState('Generic');
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

  // Helper to build auth headers
  const getAuthHeaders = () => {
    const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('pb_token') : null);
    return {
      'Content-Type': 'application/json',
      ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
    };
  };

  const fetchInventoryData = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const [medRes, movRes] = await Promise.all([
        fetch('/api/media', { headers }),
        fetch('/api/inventory/movements', { headers }),
      ]);

      if (medRes.ok) {
        const d = await medRes.json();
        const list = d.media || [];
        setMediaList(list);

        // Prepopulate bulk stock counts
        const stockMap: { [key: string]: number } = {};
        list.forEach((m: any) => {
          stockMap[m.id] = m.currentStock;
        });
        setBulkStocks(stockMap);
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
  }, [user, authLoading, token]);

  // Handle Restock Submit
  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedia || restockQty === '' || Number(restockQty) <= 0) {
      setStatusMsg({ type: 'error', text: 'Please enter a valid positive restock quantity.' });
      return;
    }

    setActionLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/inventory/restock', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          mediaId: selectedMedia.id,
          quantity: Number(restockQty),
          reason: restockReason.trim() || 'Restock purchase',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to restock');

      setStatusMsg({ type: 'success', text: `Added +${restockQty} sheets to '${selectedMedia.name}'. New Stock: ${selectedMedia.currentStock + Number(restockQty)} sheets.` });
      setRestockModalOpen(false);
      setRestockQty('');
      setRestockReason('');
      fetchInventoryData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error occurred while restocking' });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Single Stock Adjustment Submit
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedia || adjustTargetStock === '' || Number(adjustTargetStock) < 0) {
      setStatusMsg({ type: 'error', text: 'Please enter a valid non-negative physical stock count.' });
      return;
    }

    setActionLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          mediaId: selectedMedia.id,
          newStock: Number(adjustTargetStock),
          reason: adjustReason.trim() || 'Physical stock audit adjustment',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to adjust stock');

      setStatusMsg({ type: 'success', text: data.message });
      setAdjustModalOpen(false);
      setAdjustTargetStock('');
      fetchInventoryData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error occurred during stock adjustment' });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Bulk Stock Audit Submit
  const handleBulkAuditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setStatusMsg(null);

    let updatedCount = 0;
    const errors: string[] = [];

    try {
      for (const m of mediaList) {
        const targetVal = bulkStocks[m.id];
        if (targetVal !== undefined && targetVal !== m.currentStock) {
          const res = await fetch('/api/inventory/adjust', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              mediaId: m.id,
              newStock: Number(targetVal),
              reason: bulkReason.trim() || 'Bulk Initial Stock Count Audit',
            }),
          });

          if (res.ok) {
            updatedCount++;
          } else {
            const d = await res.json();
            errors.push(`${m.name}: ${d.error || 'Failed'}`);
          }
        }
      }

      if (errors.length > 0) {
        setStatusMsg({
          type: 'error',
          text: `Updated ${updatedCount} items with ${errors.length} errors: ${errors.join(', ')}`,
        });
      } else if (updatedCount > 0) {
        setStatusMsg({
          type: 'success',
          text: `Successfully adjusted and saved ${updatedCount} media stock counts into database!`,
        });
      } else {
        setStatusMsg({
          type: 'success',
          text: 'No changes detected. All stock counts are already up-to-date.',
        });
      }

      setBulkAuditModalOpen(false);
      fetchInventoryData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error occurred during bulk stock audit' });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Add New Media Submit
  const handleAddMediaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMediaName.trim() || !newMediaGsm || !newMediaSize.trim()) {
      setStatusMsg({ type: 'error', text: 'Media Name, GSM, and Size are required.' });
      return;
    }

    setActionLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/media', {
        method: 'POST',
        headers: getAuthHeaders(),
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

      setStatusMsg({ type: 'success', text: `New Media '${newMediaName}' (${newMediaGsm} GSM, ${newMediaSize}) added to inventory successfully!` });
      setAddMediaModalOpen(false);
      setNewMediaName('');
      setNewMediaGsm(300);
      setNewMediaSize('13x19');
      setNewMediaBrand('Generic');
      setNewMediaStock(0);
      setNewMediaMinStock(100);
      fetchInventoryData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error creating media' });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Edit Media Submit
  const handleEditMediaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedia || !editName.trim() || !editGsm || !editSize.trim()) {
      setStatusMsg({ type: 'error', text: 'Name, GSM, and Size are required.' });
      return;
    }

    setActionLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/media', {
        method: 'PATCH',
        headers: getAuthHeaders(),
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

      setStatusMsg({ type: 'success', text: `Media '${editName}' (${editGsm} GSM, ${editSize}) updated successfully!` });
      setEditMediaModalOpen(false);
      fetchInventoryData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error updating media' });
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

  // Open Restock Modal with Pre-fill
  const openRestockModal = (m: any) => {
    setSelectedMedia(m);
    setRestockQty('');
    setRestockReason('');
    setRestockModalOpen(true);
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
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white border border-yellow-400 p-1 flex items-center justify-center shadow-xs flex-shrink-0">
            <img src="/logo-badge.png" alt="Print Bazzar" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black text-slate-950 tracking-tight">
                Media &amp; Paper Inventory
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-400 text-slate-950 border border-yellow-400">
                Konica C3070 Press Stocks
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Real-time physical sheet inventory, stock adjustment, purchase restock, and movement audit ledger
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Add New Media (Paper Type) */}
          <button
            onClick={() => setAddMediaModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-950 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition"
            title="Create a new paper type or sticker item in the catalog"
          >
            <PackagePlus className="w-4 h-4 text-yellow-400" />
            <span>➕ Add New Media</span>
          </button>

          {/* Restock Purchase */}
          <button
            onClick={() => {
              if (mediaList.length > 0) {
                openRestockModal(mediaList[0]);
              }
            }}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-xs rounded-xl shadow-sm transition"
            title="Record newly purchased paper sheets received into stock"
          >
            <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
            <span>📦 Purchase Restock</span>
          </button>

          {/* Bulk Audit Tool */}
          <button
            onClick={() => {
              const stockMap: { [key: string]: number } = {};
              mediaList.forEach((m: any) => {
                stockMap[m.id] = m.currentStock;
              });
              setBulkStocks(stockMap);
              setBulkAuditModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 shadow-2xs transition"
            title="Adjust all paper stocks at once in a fast entry table"
          >
            <ListOrdered className="w-4 h-4 text-yellow-600" />
            <span>Fast Bulk Audit</span>
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
              Click &quot;✏️ Edit&quot; to change paper name, GSM &amp; size | &quot;Adjust&quot; to set real physical stock | &quot;Restock&quot; to add purchased sheets
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
                        <div className="flex items-center space-x-1.5">
                          <span>{m.name}</span>
                          <button
                            onClick={() => openEditModal(m)}
                            className="text-slate-400 hover:text-slate-950 transition p-1 hover:bg-slate-200 rounded"
                            title="Edit Name, GSM, Size, Brand"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
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
                          {/* 1. Quick Adjust Button */}
                          <button
                            onClick={() => openAdjustModal(m)}
                            className="px-2.5 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-xs rounded-lg shadow-2xs transition flex items-center space-x-1"
                            title="Adjust Real Stock Count"
                          >
                            <Scale className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Adjust</span>
                          </button>

                          {/* 2. Quick Purchase Restock Button */}
                          <button
                            onClick={() => openRestockModal(m)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg transition flex items-center space-x-1"
                            title="Add Purchased Stock Quantity"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>Purchase</span>
                          </button>

                          {/* 3. Edit Media Details */}
                          <button
                            onClick={() => openEditModal(m)}
                            className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 rounded-lg transition flex items-center space-x-1 font-semibold text-xs"
                            title="Edit Media Attributes (Name, GSM, Size, Brand)"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
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

      {/* MODAL 1: SINGLE STOCK ADJUSTMENT MODAL */}
      {adjustModalOpen && selectedMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-yellow-400 text-slate-950 flex items-center justify-center font-bold">
                  <Scale className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Stock Count Adjustment</h3>
                  <p className="text-[11px] text-yellow-400 font-medium">Set real physical inventory count</p>
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
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="font-black text-slate-900 text-sm">
                  {selectedMedia.gsm} GSM {selectedMedia.name} ({selectedMedia.size})
                </div>
                <div className="text-slate-500">Brand: {selectedMedia.brand || 'Generic'}</div>
                <div className="text-xs font-bold text-slate-800 pt-1.5 flex items-center justify-between border-t border-slate-200">
                  <span>Current Database Stock:</span>
                  <span className="text-yellow-800 font-black text-sm">{selectedMedia.currentStock.toLocaleString()} sheets</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Actual Physical Stock Count (Sheets) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={adjustTargetStock}
                  onChange={(e) => setAdjustTargetStock(e.target.value === '' ? '' : parseInt(e.target.value))}
                  placeholder="e.g. 0 or 250 or 500"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
                {adjustTargetStock !== '' && (
                  <div className="text-[11px] font-bold mt-1.5 p-2 rounded-lg bg-slate-100 flex items-center justify-between">
                    <span className="text-slate-600">Inventory Adjustment:</span>
                    <span
                      className={
                        Number(adjustTargetStock) - selectedMedia.currentStock > 0
                          ? 'text-yellow-700 font-black'
                          : Number(adjustTargetStock) - selectedMedia.currentStock < 0
                          ? 'text-red-600 font-black'
                          : 'text-slate-500 font-semibold'
                      }
                    >
                      {Number(adjustTargetStock) - selectedMedia.currentStock > 0 ? '+' : ''}
                      {Number(adjustTargetStock) - selectedMedia.currentStock} sheets
                    </span>
                  </div>
                )}
              </div>

              {/* Preset Reasons */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Reason for Adjustment *
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    'Initial real physical count load',
                    'Physical stock audit count correction',
                    'Damage / spoilage sheet write-off',
                    'Found extra unrecorded stock',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAdjustReason(preset)}
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-yellow-100 text-[10px] font-semibold text-slate-700 hover:text-slate-950 transition border border-slate-200"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Enter specific adjustment explanation..."
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
                  className="flex-1 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-yellow-400/20 transition disabled:opacity-50 flex items-center justify-center space-x-1.5"
                >
                  <Save className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{actionLoading ? 'Saving...' : 'Save Stock Adjustment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: BULK STOCK AUDIT MODAL */}
      {bulkAuditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-800 flex-shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-yellow-400 text-slate-950 flex items-center justify-center font-bold">
                  <ListOrdered className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Fast Bulk Stock Audit & Load</h3>
                  <p className="text-[11px] text-yellow-400 font-medium">Quickly update physical stock for all media items at once</p>
                </div>
              </div>
              <button
                onClick={() => setBulkAuditModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBulkAuditSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="flex items-center justify-between bg-yellow-50 p-3 rounded-xl border border-yellow-300 text-xs text-slate-950 font-semibold">
                <span>💡 Type the exact physical sheet count in the &quot;New Physical Stock&quot; column for each paper.</span>
                <span className="text-[11px] font-extrabold text-yellow-800">{mediaList.length} Items Listed</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Audit Reason / Batch Reference
                </label>
                <input
                  type="text"
                  required
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  placeholder="e.g. Initial Stock Loading / September 2026 Physical Count"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Media Item</th>
                      <th className="py-2.5 px-3">Size / GSM</th>
                      <th className="py-2.5 px-3">Current Stock</th>
                      <th className="py-2.5 px-3 w-40">New Physical Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {mediaList.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/80">
                        <td className="py-2 px-3 font-bold text-slate-900">
                          {m.name}
                          <span className="text-[10px] text-slate-400 font-normal block">{m.brand || 'Generic'}</span>
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-700">
                          {m.gsm} GSM • {m.size}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-700">
                          {m.currentStock.toLocaleString()}
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="0"
                            value={bulkStocks[m.id] !== undefined ? bulkStocks[m.id] : m.currentStock}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                              setBulkStocks((prev) => ({ ...prev, [m.id]: val }));
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setBulkAuditModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-yellow-400/20 transition disabled:opacity-50 flex items-center space-x-1.5"
                >
                  <Save className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{actionLoading ? 'Saving All...' : 'Save All Stock Adjustments'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: PURCHASE RESTOCK MODAL */}
      {restockModalOpen && selectedMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-yellow-400 text-slate-950 flex items-center justify-center font-bold">
                  <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Record Paper Purchase</h3>
                  <p className="text-[11px] text-yellow-400 font-medium">Add received sheets/reams into stock</p>
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
                      {m.gsm} GSM {m.name} ({m.size}) — Current Stock: {m.currentStock}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Quantity Purchased &amp; Received (Sheets) *
                </label>

                {/* Quick Add Quantity Chips */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    { label: '+250 (1/2 Ream)', val: 250 },
                    { label: '+500 (1 Ream)', val: 500 },
                    { label: '+1,000 (2 Reams)', val: 1000 },
                    { label: '+2,500 (5 Reams/Box)', val: 2500 },
                    { label: '+5,000 (Bulk)', val: 5000 },
                  ].map((chip) => (
                    <button
                      key={chip.val}
                      type="button"
                      onClick={() => setRestockQty(chip.val)}
                      className="px-2 py-1 rounded-lg bg-yellow-50 hover:bg-yellow-200 text-[10px] font-extrabold text-slate-900 border border-yellow-300 transition"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                <input
                  type="number"
                  min="1"
                  required
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value === '' ? '' : parseInt(e.target.value))}
                  placeholder="e.g. 500 or 1000"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
                {restockQty !== '' && (
                  <div className="text-[11px] font-bold text-yellow-800 mt-1.5 p-2 bg-yellow-50 rounded-lg border border-yellow-200 flex items-center justify-between">
                    <span>New Stock after purchase:</span>
                    <span className="font-black text-sm text-slate-950">
                      {selectedMedia.currentStock + Number(restockQty)} sheets
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Supplier / Purchase Invoice Note
                </label>
                <input
                  type="text"
                  value={restockReason}
                  onChange={(e) => setRestockReason(e.target.value)}
                  placeholder="e.g. Invoice #PB-9812 / Century Mill direct purchase"
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
                  className="flex-1 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-yellow-400/20 transition disabled:opacity-50 flex items-center justify-center space-x-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{actionLoading ? 'Adding...' : 'Confirm Purchase & Add Stock'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: ADD NEW MEDIA MODAL */}
      {addMediaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-yellow-400 text-slate-950 flex items-center justify-center font-bold">
                  <PackagePlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Add New Media Paper</h3>
                  <p className="text-[11px] text-yellow-400 font-medium">Create a new paper or sticker in catalog</p>
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
                  placeholder="e.g. Art Board / Velvet Matte Sticker / Metallic Gold"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* GSM */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    GSM (Weight) *
                  </label>
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {COMMON_GSMS.slice(0, 4).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setNewMediaGsm(g)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
                          newMediaGsm === g
                            ? 'bg-yellow-400 text-slate-950 border-yellow-400'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    required
                    min="40"
                    max="600"
                    value={newMediaGsm}
                    onChange={(e) => setNewMediaGsm(e.target.value === '' ? '' : parseInt(e.target.value))}
                    placeholder="300"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>

                {/* Size */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Size *
                  </label>
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {COMMON_SIZES.slice(0, 3).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setNewMediaSize(s)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
                          newMediaSize === s
                            ? 'bg-yellow-400 text-slate-950 border-yellow-400'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    required
                    value={newMediaSize}
                    onChange={(e) => setNewMediaSize(e.target.value)}
                    placeholder="13x19 or A4"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Brand / Mill
                </label>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {COMMON_BRANDS.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setNewMediaBrand(b)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                        newMediaBrand === b
                          ? 'bg-yellow-400 text-slate-950 border-yellow-400'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={newMediaBrand}
                  onChange={(e) => setNewMediaBrand(e.target.value)}
                  placeholder="e.g. ITC Cyber XL / Century / Generic"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
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
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
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
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
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
                  {actionLoading ? 'Creating...' : 'Create & Add Paper'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: EDIT MEDIA MODAL */}
      {editMediaModalOpen && selectedMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-yellow-400 text-slate-950 flex items-center justify-center font-bold">
                  <Edit2 className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Edit Paper Details</h3>
                  <p className="text-[11px] text-yellow-400 font-medium">Update Name, GSM, Size, and Brand</p>
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
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {COMMON_GSMS.slice(0, 4).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setEditGsm(g)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
                          editGsm === g
                            ? 'bg-yellow-400 text-slate-950 border-yellow-400'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    required
                    min="40"
                    max="600"
                    value={editGsm}
                    onChange={(e) => setEditGsm(e.target.value === '' ? '' : parseInt(e.target.value))}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Size *
                  </label>
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {COMMON_SIZES.slice(0, 3).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setEditSize(s)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
                          editSize === s
                            ? 'bg-yellow-400 text-slate-950 border-yellow-400'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    required
                    value={editSize}
                    onChange={(e) => setEditSize(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Brand / Mill Manufacturer
                </label>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {COMMON_BRANDS.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setEditBrand(b)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                        editBrand === b
                          ? 'bg-yellow-400 text-slate-950 border-yellow-400'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={editBrand}
                  onChange={(e) => setEditBrand(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Minimum Safety Stock Level (Sheets)
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
                  className="flex-1 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-yellow-400/20 transition disabled:opacity-50 flex items-center justify-center space-x-1.5"
                >
                  <Save className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{actionLoading ? 'Saving...' : 'Save Paper Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
