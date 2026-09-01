'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import {
  Users,
  UserPlus,
  KeyRound,
  ShieldCheck,
  Printer,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Check,
  Share2,
  Sparkles,
  RefreshCw,
  Search,
  X,
  Lock,
  UserCheck,
  UserX,
} from 'lucide-react';

export default function StaffManagementPage() {
  const { user, token, isOwner, loading: authLoading } = useAuth();
  const router = useRouter();

  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalUser, setEditModalUser] = useState<any | null>(null);
  const [resetPassUser, setResetPassUser] = useState<any | null>(null);
  const [credentialsModal, setCredentialsModal] = useState<{ name: string; email: string; pass: string; role: string } | null>(null);

  // Form State: Add Staff
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'OPERATOR' | 'OWNER'>('OPERATOR');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(true);

  // Form State: Edit Staff
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'OPERATOR' | 'OWNER'>('OPERATOR');
  const [editActive, setEditActive] = useState(true);

  // Form State: Reset Password
  const [resetPassValue, setResetPassValue] = useState('');
  const [showResetPass, setShowResetPass] = useState(true);

  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const getAuthHeaders = () => {
    const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('pb_token') : null);
    return {
      'Content-Type': 'application/json',
      ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
    };
  };

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users', { headers: getAuthHeaders() });
      if (res.ok) {
        const d = await res.json();
        setStaffList(d.users || []);
      }
    } catch (err) {
      console.error('Failed to load staff:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      if (!isOwner) {
        router.push('/');
      } else {
        fetchStaff();
      }
    }
  }, [user, authLoading, isOwner]);

  // Generate random password helper
  const generatePassword = (nameStr: string) => {
    const cleanName = nameStr.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || 'staff';
    const randNum = Math.floor(100 + Math.random() * 900);
    return `${cleanName}@${randNum}`;
  };

  // Auto-fill email and password as user types name
  const handleNameChange = (val: string) => {
    setNewName(val);
    if (!newEmail || newEmail.includes('@printbazzar.com')) {
      const clean = val.trim().toLowerCase().replace(/\s+/g, '');
      if (clean) {
        setNewEmail(`${clean}@printbazzar.com`);
      }
    }
    if (!newPassword) {
      setNewPassword(generatePassword(val));
    }
  };

  // Handle Add Staff Submit
  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      setStatusMsg({ type: 'error', text: 'Name, Email, and Password are required.' });
      return;
    }

    setActionLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim().toLowerCase(),
          password: newPassword.trim(),
          role: newRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create staff');

      // Show credentials card
      setCredentialsModal({
        name: newName.trim(),
        email: newEmail.trim().toLowerCase(),
        pass: newPassword.trim(),
        role: newRole,
      });

      setAddModalOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      fetchStaff();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to create staff member' });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Edit Staff Submit
  const handleEditStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalUser || !editName.trim() || !editEmail.trim()) return;

    setActionLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: editModalUser.id,
          name: editName.trim(),
          email: editEmail.trim().toLowerCase(),
          role: editRole,
          isActive: editActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update staff');

      setStatusMsg({ type: 'success', text: `Staff '${editName}' updated successfully.` });
      setEditModalUser(null);
      fetchStaff();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update staff' });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Reset Password Submit
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassUser || !resetPassValue.trim() || resetPassValue.length < 4) {
      setStatusMsg({ type: 'error', text: 'Password must be at least 4 characters.' });
      return;
    }

    setActionLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: resetPassUser.id,
          password: resetPassValue.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');

      // Show credentials modal so owner can copy the new password
      setCredentialsModal({
        name: resetPassUser.name,
        email: resetPassUser.email,
        pass: resetPassValue.trim(),
        role: resetPassUser.role,
      });

      setResetPassUser(null);
      setResetPassValue('');
      fetchStaff();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to reset password' });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete / Deactivate Staff
  const handleDeleteStaff = async (u: any) => {
    if (!confirm(`Are you sure you want to delete / deactivate staff member '${u.name}'?`)) return;

    try {
      const res = await fetch(`/api/users?id=${u.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete staff');

      setStatusMsg({ type: 'success', text: data.message || 'Staff updated successfully.' });
      fetchStaff();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  // Copy Credentials Text
  const copyCredentialsText = () => {
    if (!credentialsModal) return;
    const text = `🏢 *PRINT BAZZAR - STAFF LOGIN CREDENTIALS*\n\n👤 *Name:* ${credentialsModal.name}\n📧 *Login ID / Email:* ${credentialsModal.email}\n🔑 *Password:* ${credentialsModal.pass}\n🎖️ *Role:* ${credentialsModal.role}\n🌐 *Login Portal:* https://digital-print-app.vercel.app/login\n\n_Please log in and begin entering production jobs._`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const filteredStaff = staffList.filter((s) =>
    searchTerm
      ? s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.role.toLowerCase().includes(searchTerm.toLowerCase())
      : true
  );

  if (authLoading || !isOwner) {
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
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white border border-yellow-400 p-1 flex items-center justify-center shadow-xs flex-shrink-0">
            <img src="/logo-badge.png" alt="Print Bazzar" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black text-slate-950 tracking-tight">
                Staff &amp; Operator Management
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-400 text-slate-950 border border-yellow-400">
                👑 Owner Console
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Create new operators, generate login credentials, manage permissions, and reset passwords
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setNewName('');
              setNewEmail('');
              setNewRole('OPERATOR');
              setNewPassword(generatePassword('operator'));
              setAddModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition"
          >
            <UserPlus className="w-4 h-4 stroke-[2.5]" />
            <span>➕ Add New Staff</span>
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

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Staff Registered
            </span>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              {staffList.length} Members
            </div>
            <span className="text-[11px] text-slate-500 font-medium">Owners and machine operators</span>
          </div>
          <div className="p-3 bg-yellow-400/20 text-slate-950 rounded-2xl font-bold">
            <Users className="w-5 h-5 text-yellow-700" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Active Operators
            </span>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              {staffList.filter((s) => s.role === 'OPERATOR' && s.isActive).length} Operators
            </div>
            <span className="text-[11px] text-slate-500 font-medium">Authorised for Konica C3070</span>
          </div>
          <div className="p-3 bg-slate-100 text-slate-800 rounded-2xl font-bold">
            <Printer className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Security &amp; Price Privacy
            </span>
            <div className="text-base font-black text-slate-950 mt-1 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-yellow-600" />
              <span>RBAC Active</span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">Financial ₹ hidden from Operators</span>
          </div>
          <div className="p-3 bg-yellow-400 text-slate-950 rounded-2xl font-bold">
            <Lock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Staff Master Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-slate-900">
              Staff &amp; Operator Accounts ({filteredStaff.length})
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Click &quot;🔑 Reset Password&quot; to generate new login credentials, or &quot;✏️ Edit&quot; to modify profile details
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search staff name or email..."
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
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Login ID / Email</th>
                <th className="py-3 px-4">Role Access</th>
                <th className="py-3 px-4">Jobs Produced</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No staff members found matching search.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((s) => {
                  const initials = s.name
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  const isMainOwner = s.email === 'owner@printbazzar.com';

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-950 text-yellow-400 font-black text-xs flex items-center justify-center border border-slate-800 shadow-2xs">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                              <span>{s.name}</span>
                              {s.role === 'OWNER' && <span title="Owner Privilege">👑</span>}
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium">ID: {s.id.slice(0, 8)}...</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {s.email}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                            s.role === 'OWNER'
                              ? 'bg-yellow-400 text-slate-950 border border-yellow-400'
                              : 'bg-slate-100 text-slate-800 border border-slate-200'
                          }`}
                        >
                          {s.role === 'OWNER' ? '👑 OWNER (Full Access)' : '🖨️ OPERATOR'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-black text-slate-900">
                        {s.jobsCount || 0} jobs
                      </td>

                      <td className="py-3.5 px-4">
                        {s.isActive ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-yellow-100 text-slate-950 border border-yellow-300 rounded-full inline-flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3 text-yellow-600" />
                            <span>ACTIVE</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 rounded-full inline-flex items-center space-x-1">
                            <UserX className="w-3 h-3" />
                            <span>INACTIVE</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* 1. Reset Password Button */}
                          <button
                            onClick={() => {
                              setResetPassUser(s);
                              setResetPassValue(generatePassword(s.name));
                            }}
                            className="px-2 py-1.5 bg-yellow-50 hover:bg-yellow-400 text-slate-950 rounded-lg font-bold text-xs transition flex items-center space-x-1 border border-yellow-300"
                            title="Reset Staff Password"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Reset Pass</span>
                          </button>

                          {/* 2. Edit Details */}
                          <button
                            onClick={() => {
                              setEditModalUser(s);
                              setEditName(s.name);
                              setEditEmail(s.email);
                              setEditRole(s.role);
                              setEditActive(s.isActive);
                            }}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                            title="Edit Profile"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* 3. Delete / Deactivate (Non-Owner) */}
                          {!isMainOwner && (
                            <button
                              onClick={() => handleDeleteStaff(s)}
                              className="p-1.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-lg transition"
                              title="Delete / Deactivate"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

      {/* MODAL 1: ADD NEW STAFF */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-yellow-400 text-slate-950 flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Add New Staff Member</h3>
                  <p className="text-[11px] text-yellow-400 font-medium">Create operator login with auto-password</p>
                </div>
              </div>
              <button
                onClick={() => setAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStaffSubmit} className="p-6 space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Staff Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Ramesh Kumar / Operator 2"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              {/* Email / Username */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Login Email / Username *
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. ramesh@printbazzar.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Role Permission *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewRole('OPERATOR')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition ${
                      newRole === 'OPERATOR'
                        ? 'bg-yellow-400 text-slate-950 border-yellow-400 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Operator (Price Hidden)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewRole('OWNER')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition ${
                      newRole === 'OWNER'
                        ? 'bg-slate-950 text-white border-slate-950 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-yellow-400" />
                    <span>Owner (Full Access)</span>
                  </button>
                </div>
              </div>

              {/* Password Generator */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-800">
                    Generated Password *
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewPassword(generatePassword(newName))}
                    className="text-[10px] font-bold text-yellow-700 hover:text-slate-950 flex items-center space-x-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>🎲 Generate New</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter or generate password..."
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-700"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-3 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-yellow-400/20 transition disabled:opacity-50 flex items-center justify-center space-x-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{actionLoading ? 'Creating...' : 'Create Staff Member'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATED CREDENTIALS CARD MODAL */}
      {credentialsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-yellow-400 px-6 py-4 flex items-center justify-between text-slate-950">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5" />
                <h3 className="text-sm font-black">Staff Login Credentials Ready!</h3>
              </div>
              <button
                onClick={() => setCredentialsModal(null)}
                className="text-slate-800 hover:text-black p-1 rounded-lg hover:bg-yellow-500 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600 font-medium">
                The account has been created in the database. Share these credentials with the staff member:
              </p>

              <div className="p-4 bg-slate-950 text-white rounded-xl border border-slate-800 space-y-2.5 font-mono text-xs shadow-inner">
                <div className="flex justify-between border-b border-white/10 pb-1.5">
                  <span className="text-slate-400 font-sans">Staff Name:</span>
                  <span className="font-bold text-yellow-400 font-sans">{credentialsModal.name}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-1.5">
                  <span className="text-slate-400 font-sans">Login ID / Email:</span>
                  <span className="font-bold text-white">{credentialsModal.email}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-1.5">
                  <span className="text-slate-400 font-sans">Password:</span>
                  <span className="font-extrabold text-yellow-400 bg-white/10 px-2 py-0.5 rounded">
                    {credentialsModal.pass}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Role Permission:</span>
                  <span className="font-bold text-white font-sans">{credentialsModal.role}</span>
                </div>
              </div>

              <div className="pt-2 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={copyCredentialsText}
                  className="flex-1 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-1.5"
                >
                  {copied ? <Check className="w-4 h-4 text-slate-950" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied to Clipboard! ✅' : '📋 Copy Login Details'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCredentialsModal(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: RESET PASSWORD MODAL */}
      {resetPassUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-yellow-400 text-slate-950 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Reset Staff Password</h3>
                  <p className="text-[11px] text-yellow-400 font-medium">For {resetPassUser.name}</p>
                </div>
              </div>
              <button
                onClick={() => setResetPassUser(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div className="font-bold text-slate-900">{resetPassUser.name}</div>
                <div className="text-slate-500 font-mono">{resetPassUser.email}</div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-800">
                    New Password *
                  </label>
                  <button
                    type="button"
                    onClick={() => setResetPassValue(generatePassword(resetPassUser.name))}
                    className="text-[10px] font-bold text-yellow-700 hover:text-slate-950 flex items-center space-x-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>🎲 Auto-Generate</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showResetPass ? 'text' : 'password'}
                    required
                    value={resetPassValue}
                    onChange={(e) => setResetPassValue(e.target.value)}
                    placeholder="Enter new password..."
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPass(!showResetPass)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-700"
                  >
                    {showResetPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-3 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setResetPassUser(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: EDIT STAFF PROFILE */}
      {editModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-yellow-400 text-slate-950 flex items-center justify-center font-bold">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Edit Staff Details</h3>
                  <p className="text-[11px] text-yellow-400 font-medium">Update profile, role, and active status</p>
                </div>
              </div>
              <button
                onClick={() => setEditModalUser(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditStaffSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Staff Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Login Email / Username *
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Role Permission *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditRole('OPERATOR')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                      editRole === 'OPERATOR'
                        ? 'bg-yellow-400 text-slate-950 border-yellow-400'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Operator
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditRole('OWNER')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                      editRole === 'OWNER'
                        ? 'bg-slate-950 text-white border-slate-950'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Owner
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-800">Account Active Status</span>
                <button
                  type="button"
                  onClick={() => setEditActive(!editActive)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    editActive
                      ? 'bg-yellow-400 text-slate-950'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {editActive ? 'Active (Enabled)' : 'Inactive (Suspended)'}
                </button>
              </div>

              <div className="pt-3 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setEditModalUser(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition disabled:opacity-50"
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
