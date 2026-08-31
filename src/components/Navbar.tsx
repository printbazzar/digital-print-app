'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import NotificationBell from './NotificationBell';
import ChangePasswordModal from './ChangePasswordModal';
import {
  LayoutDashboard,
  Printer,
  Gauge,
  Boxes,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  User,
  KeyRound,
} from 'lucide-react';

export default function Navbar() {
  const { user, logout, isOwner } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  if (pathname === '/login') return null;

  const navLinks = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/production', label: 'Production Entry', icon: Printer },
    { href: '/daily-closing', label: 'Machine Counter', icon: Gauge },
    { href: '/inventory', label: 'Inventory', icon: Boxes },
    { href: '/reports', label: 'Reports', icon: FileSpreadsheet },
    ...(isOwner
      ? [
          { href: '/masters', label: 'Masters', icon: Settings },
          { href: '/audit', label: 'Audit Logs', icon: ShieldCheck },
        ]
      : []),
  ];

  return (
    <>
      <header className="sticky top-0 z-30 bg-slate-950 text-white border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand & Active Press */}
            <div className="flex items-center space-x-6">
              <Link href="/" className="flex items-center space-x-3 group">
                <div className="h-9 w-9 rounded-lg bg-yellow-400 flex items-center justify-center text-slate-950 font-black text-lg shadow-md shadow-yellow-400/20 group-hover:scale-105 transition transform">
                  PB
                </div>
                <div>
                  <span className="font-extrabold text-base tracking-tight text-white block leading-tight flex items-center gap-1.5">
                    PRINT BAZZAR <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse"></span>
                  </span>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded border border-yellow-400/30 inline-block">
                    Digital Production • C3070
                  </span>
                </div>
              </Link>

              {/* Desktop Navigation Links */}
              <nav className="hidden md:flex items-center space-x-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive =
                    pathname === link.href ||
                    (link.href !== '/' && pathname.startsWith(link.href));
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                        isActive
                          ? 'bg-yellow-400/15 text-yellow-400 font-bold border border-yellow-400/40 shadow-xs'
                          : 'text-slate-300 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-yellow-400' : 'text-slate-400'}`} />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Right Header Actions */}
            <div className="flex items-center space-x-3">
              <NotificationBell />

              {user && (
                <div className="hidden sm:flex items-center pl-3 border-l border-slate-800 space-x-2.5">
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-bold text-slate-100 leading-tight">
                      {user.name}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                        user.role === 'OWNER'
                          ? 'bg-amber-400/20 text-yellow-300 border border-yellow-400/40'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {user.role}
                    </span>
                  </div>

                  {/* Change Password Button */}
                  <button
                    onClick={() => setChangePasswordOpen(true)}
                    className="p-1.5 text-slate-400 hover:text-yellow-400 hover:bg-slate-900 rounded-lg transition"
                    title="Change Password"
                  >
                    <KeyRound className="w-4 h-4" />
                  </button>

                  <button
                    onClick={logout}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded-lg transition"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-900"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-4 space-y-1 shadow-xl">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive =
                pathname === link.href ||
                (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                    isActive
                      ? 'bg-yellow-400/15 text-yellow-400 border border-yellow-400/40'
                      : 'text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4 text-yellow-400" />
                  <span>{link.label}</span>
                </Link>
              );
            })}

            {user && (
              <div className="pt-3 mt-3 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-yellow-400" />
                    <div>
                      <div className="text-xs font-bold text-white">
                        {user.name}
                      </div>
                      <div className="text-[10px] text-yellow-400 font-medium">
                        {user.role}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setChangePasswordOpen(true);
                    }}
                    className="flex-1 flex items-center justify-center space-x-1.5 text-xs text-yellow-400 font-bold px-3 py-2 rounded-lg bg-yellow-400/10 border border-yellow-400/30"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Change Password</span>
                  </button>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                    }}
                    className="flex items-center space-x-1 text-xs text-red-400 font-semibold px-3 py-2 rounded-lg bg-red-950/40 border border-red-800/50"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
    </>
  );
}
