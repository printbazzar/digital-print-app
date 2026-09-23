'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import NotificationBell from './NotificationBell';
import {
  LayoutDashboard,
  Printer,
  Gauge,
  Boxes,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
  Menu,
  X,
  User,
  Users,
  LogOut,
} from 'lucide-react';

export default function Navbar() {
  const { user, isOwner, logout } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (pathname === '/login' || !user) return null;

  // Staff (OPERATOR) strictly sees only Job Entry and Inventory
  // Owner sees all 8 management modules
  const navLinks = isOwner
    ? [
        { href: '/', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/production', label: 'Production Entry', icon: Printer },
        { href: '/daily-closing', label: 'Machine Counter', icon: Gauge },
        { href: '/inventory', label: 'Inventory', icon: Boxes },
        { href: '/reports', label: 'Reports', icon: FileSpreadsheet },
        { href: '/staff', label: 'Staff / Operators', icon: Users },
        { href: '/masters', label: 'Masters', icon: Settings },
        { href: '/audit', label: 'Audit Logs', icon: ShieldCheck },
      ]
    : [
        { href: '/production', label: 'Job Entry (Production)', icon: Printer },
        { href: '/inventory', label: 'Inventory (Stock)', icon: Boxes },
      ];

  return (
    <>
      <header className="sticky top-0 z-30 bg-slate-950 text-white border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand */}
            <div className="flex items-center space-x-6">
              <Link
                href={isOwner ? '/' : '/production'}
                className="flex items-center space-x-3 group py-1"
              >
                <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-slate-900 p-0.5 flex items-center justify-center shadow-lg shadow-yellow-400/20 group-hover:scale-105 transition transform overflow-hidden border-2 border-yellow-400 flex-shrink-0">
                  <img
                    src="/logo-icon.png"
                    alt="Print Bazzar Logo"
                    className="h-full w-full object-contain rounded-full"
                  />
                </div>
                <div>
                  <span className="font-black text-base sm:text-lg tracking-tight text-white block leading-tight flex items-center gap-1.5">
                    PRINT BAZZAR <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse"></span>
                  </span>
                  <span className="text-[11px] font-bold text-yellow-400 block leading-tight tracking-normal">
                    More than you expect
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
            <div className="flex items-center space-x-2 sm:space-x-3">
              <NotificationBell />

              {/* User Profile & Role Badge */}
              <div className="flex items-center pl-2 sm:pl-3 border-l border-slate-800 space-x-2">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs font-bold text-slate-100 leading-tight">
                    {user.name}
                  </span>
                  {isOwner ? (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-400/20 text-yellow-300 border border-yellow-400/40 uppercase flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block"></span>
                      👑 OWNER (Full Access)
                    </span>
                  ) : (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/40 uppercase flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block"></span>
                      👷 STAFF (Job & Inventory)
                    </span>
                  )}
                </div>

                {/* Log Out Button */}
                <button
                  onClick={logout}
                  title="Sign Out / Switch Account"
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-red-300 hover:text-red-100 hover:bg-red-950/60 border border-red-800/50 transition cursor-pointer active:scale-95"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-400" />
                  <span className="hidden sm:inline">Log Out</span>
                </button>
              </div>

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
              <div className="pt-3 mt-3 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-yellow-400" />
                    <div>
                      <div className="text-xs font-bold text-white">
                        {user.name}
                      </div>
                      <div className="text-[10px] font-bold text-slate-300">
                        {isOwner ? '👑 Owner (Full Access)' : '👷 Staff (Job Entry & Inventory)'}
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 bg-red-950/50 hover:bg-red-900/60 border border-red-800/60 text-red-200 text-xs font-bold rounded-lg transition"
                >
                  <LogOut className="w-4 h-4 text-red-400" />
                  <span>Sign Out / Switch Account</span>
                </button>
              </div>
            )}
          </div>
        )}
      </header>
    </>
  );
}
