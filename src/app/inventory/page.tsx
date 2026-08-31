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
  const [selectedMedia, setSelectedMedia] = useState<any | null>(null);

  // Form states
  const [restockQty, setRestockQty] = useState<number | ''>('');
  const [restockReason, setRestockReason] = useState('');
  const [adjustTargetStock, setAdjustTargetStock] = useState<number | ''>('');
  const [adjustReason, setAdjustReason] = useState('');

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
          reason: restockReason.trim() || undefined,
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
      setAdjustReason('');
      fetchInventoryData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredMedia = mediaList.filter((m) =>
    searchTerm
      ? m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.gsm.toString().includes(searchTerm) ||
        m.size.toLowerCase().includes(searchTerm.toLowerCase())
      : true
  );

  const lowStockCount = mediaList.filter((m) => m.currentStock <= m.minimumStockLevel).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Boxes className="w-5 h-5 text-yellow-600" />
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Media & Paper Inventory
            </h1>
            {lowStockCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200 flex items-center space-x-1">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                <span>{lowStockCount} Low Stock</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time physical sheet stock balances, automatic production deductions, and movement ledger
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchInventoryData}
            className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Notification status */}
      {statusMsg && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center space-x-2 shadow-xs ${
            statusMsg.type === 'success'
              ? 'bg-yellow-50 border-yellow-300 text-emerald-900'
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

      {/* Media Inventory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Active Media Stocks ({filteredMedia.length})
            </h2>
            <p className="text-xs text-slate-500">
              Track physical sheets for all paper, board, and sticker substrates
            </p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter by material, GSM, size..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Media Description</th>
                <th className="py-3 px-4">GSM</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Brand</th>
                <th className="py-3 px-4">Current Stock</th>
                <th className="py-3 px-4">Min. Threshold</th>
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
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {m.name}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {m.gsm} GSM
                      </td>
                      <td className="py-3 px-4">{m.size}</td>
                      <td className="py-3 px-4 text-slate-500">{m.brand || 'Generic'}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-black text-sm ${
                            isLow ? 'text-red-600' : 'text-yellow-800'
                          }`}
                        >
                          {m.currentStock.toLocaleString()} {m.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {m.minimumStockLevel.toLocaleString()} sheets
                      </td>
                      <td className="py-3 px-4">
                        {isLow ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-700 flex items-center space-x-1 w-max">
                            <AlertTriangle className="w-3 h-3" />
                            <span>LOW STOCK</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-yellow-100 text-slate-950 flex items-center space-x-1 w-max">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>ADEQUATE</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => {
                            setSelectedMedia(m);
                            setRestockQty('');
                            setRestockReason('');
                            setRestockModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-yellow-50 hover:bg-yellow-100 text-yellow-800 text-xs font-bold rounded-lg border border-yellow-300 transition"
                        >
                          + Restock
                        </button>
                        {isOwner && (
                          <button
                            onClick={() => {
                              setSelectedMedia(m);
                              setAdjustTargetStock(m.currentStock);
                              setAdjustReason('');
                              setAdjustModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-lg border border-purple-200 transition"
                          >
                            Adjust
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Movements Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center space-x-2">
          <History className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-bold text-slate-900">
            Stock Movement Ledger ({movements.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Media Item</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Delta</th>
                <th className="py-3 px-4">Opening</th>
                <th className="py-3 px-4">Closing</th>
                <th className="py-3 px-4">Reference / Reason</th>
                <th className="py-3 px-4">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No stock movements recorded yet.
                  </td>
                </tr>
              ) : (
                movements.slice(0, 30).map((mov) => (
                  <tr key={mov.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {new Date(mov.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{mov.mediaName}</td>
                    <td className="py-3 px-4">
                      {mov.movementType === 'STOCK_IN' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-slate-950 flex items-center space-x-1 w-max">
                          <ArrowUpRight className="w-3 h-3 text-yellow-600" />
                          <span>STOCK IN</span>
                        </span>
                      )}
                      {mov.movementType === 'STOCK_OUT' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 flex items-center space-x-1 w-max">
                          <ArrowDownRight className="w-3 h-3 text-blue-600" />
                          <span>PRODUCTION</span>
                        </span>
                      )}
                      {mov.movementType === 'STOCK_ADJUSTMENT' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 flex items-center space-x-1 w-max">
                          <SlidersHorizontal className="w-3 h-3 text-purple-600" />
                          <span>ADJUSTMENT</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold">
                      <span
                        className={
                          mov.quantity > 0
                            ? 'text-yellow-800'
                            : mov.quantity < 0
                            ? 'text-red-600'
                            : 'text-slate-600'
                        }
                      >
                        {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity}
                      </span>
                    </td>
                    <td className="py-3 px-4">{mov.openingStock}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{mov.closingStock}</td>
                    <td className="py-3 px-4 max-w-[220px] truncate text-slate-500">
                      {mov.reason || mov.referenceId || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{mov.userName}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restock Modal */}
      {restockModalOpen && selectedMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <PlusCircle className="w-5 h-5 text-yellow-600" />
                <h3 className="text-sm font-bold text-slate-900">Restock Media Sheets</h3>
              </div>
              <button
                onClick={() => setRestockModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div className="font-bold text-slate-800">{selectedMedia.gsm} GSM {selectedMedia.name}</div>
              <div className="text-slate-500">Size: {selectedMedia.size} | Brand: {selectedMedia.brand || 'Generic'}</div>
              <div className="text-yellow-800 font-bold mt-1">Current Stock: {selectedMedia.currentStock} sheets</div>
            </div>

            <form onSubmit={handleRestockSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sheets to Add *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value ? Number(e.target.value) : '')}
                  placeholder="e.g. 500"
                  className="w-full px-3 py-2 text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Purchase Reference / Note
                </label>
                <input
                  type="text"
                  value={restockReason}
                  onChange={(e) => setRestockReason(e.target.value)}
                  placeholder="e.g. Purchase Invoice #1024"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRestockModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Confirm Restock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal (Owner Only) */}
      {adjustModalOpen && selectedMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900">Owner Stock Adjustment</h3>
              </div>
              <button
                onClick={() => setAdjustModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-200 text-xs">
              <div className="font-bold text-purple-900">{selectedMedia.gsm} GSM {selectedMedia.name}</div>
              <div className="text-slate-500">Size: {selectedMedia.size} | Current: {selectedMedia.currentStock} sheets</div>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Corrected Physical Stock Balance *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={adjustTargetStock}
                  onChange={(e) => setAdjustTargetStock(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mandatory Audit Reason *
                </label>
                <textarea
                  required
                  rows={2}
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Explain reason for manual inventory adjustment..."
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-md disabled:opacity-50"
                >
                  {actionLoading ? 'Adjusting...' : 'Confirm Stock Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
