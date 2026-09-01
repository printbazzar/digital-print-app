'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { ShieldCheck, History, RefreshCw, Search, Clock, User } from 'lucide-react';

export default function AuditLogsPage() {
  const { user, isOwner, loading: authLoading } = useAuth();
  const router = useRouter();

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit');
      if (res.ok) {
        const d = await res.json();
        setLogs(d.logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
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
      fetchLogs();
    }
  }, [user, isOwner, authLoading]);

  const filteredLogs = logs.filter((l) =>
    searchTerm
      ? l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.entity.toLowerCase().includes(searchTerm.toLowerCase())
      : true
  );

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
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-white border border-yellow-400 p-0.5 flex items-center justify-center shadow-xs flex-shrink-0">
            <img src="/logo-badge.png" alt="Print Bazzar" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black text-slate-950 tracking-tight">
                Audit Logs &amp; Security Trail
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-yellow-400 text-slate-950 border border-yellow-400">
                Immutable Ledger
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Complete audit trail for day closures, rate edits, production jobs, and inventory overrides
            </p>
          </div>
        </div>

        <button
          onClick={fetchLogs}
          className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
            <History className="w-4 h-4 text-slate-500" />
            <span>Audit Entries ({filteredLogs.length})</span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search action, user, entity..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-500 w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Entity ID</th>
                <th className="py-3 px-4">Details / Values</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No audit records found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-800 border border-slate-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">{log.userName || log.userId}</td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{log.entity}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{log.entityId}</td>
                    <td className="py-3 px-4 max-w-xs truncate text-[11px] font-mono text-slate-500">
                      {log.newValue ? JSON.stringify(log.newValue) : log.reason || '-'}
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
