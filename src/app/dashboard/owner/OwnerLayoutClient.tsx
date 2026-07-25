'use client';

import React, { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logoutAction } from '@/app/actions/auth';
import { SearchProvider, useSearch } from '@/context/SearchContext';
import { ProfilKosProvider, useProfilKos } from '@/context/ProfilKosContext';

interface OwnerLayoutClientProps {
  user: {
    id: string;
    nama: string;
    email: string;
    role: string;
  };
  initialProfilKos?: any;
  pendingPayments?: any[];
  activeComplaints?: any[];
  unpaidBills?: any[];
  children: React.ReactNode;
}

function OwnerLayoutContent({
  user,
  initialProfilKos,
  children,
}: OwnerLayoutClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Consume profile from Context
  const { profil } = useProfilKos();

  // Notification states
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Relative time helper
  const getRelativeTime = (dateInput: Date | string) => {
    const date = new Date(dateInput);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    if (isNaN(diffMs) || diffMs < 0) return 'Baru saja';
    
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays === 1) return 'Kemarin';
    if (diffDays < 7) return `${diffDays} hari lalu`;
    
    return date.toISOString().split('T')[0];
  };

  // Poll for database notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Error fetching notifications API:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);

    const handleUpdate = () => {
      fetchNotifications();
    };

    window.addEventListener('notifications_updated', handleUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('notifications_updated', handleUpdate);
    };
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, dibaca: true } : n))
        );
        setUnreadCount((prev) => Math.max(prev - 1, 0));
        window.dispatchEvent(new Event('notifications_updated'));
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  // Consume search query from global search context
  const { searchQuery, setSearchQuery } = useSearch();

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    requestAnimationFrame(() => {
      setIsDarkMode(isDark);
    });
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, []);

  const handleThemeToggle = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    if (next) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  };

  const handleLogout = () => {
    if (!confirm('Apakah Anda yakin ingin keluar?')) return;
    startTransition(async () => {
      await logoutAction();
    });
  };

  const navGroups = [
    {
      title: 'Dashboard & Analitik',
      items: [
        {
          name: 'Ringkasan',
          href: '/dashboard/owner',
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
            </svg>
          ),
        },
        {
          name: 'Laporan Keuangan',
          href: '/dashboard/owner/laporan',
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          ),
        },
      ],
    },
    {
      title: 'Manajemen Operasional',
      items: [
        {
          name: 'Kelola Kamar',
          href: '/dashboard/owner/kamar',
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          ),
        },
        {
          name: 'Kelola Penyewa',
          href: '/dashboard/owner/penyewa',
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          ),
        },
      ],
    },
    {
      title: 'Transaksi & Keuangan',
      items: [
        {
          name: 'Pembayaran Sewa',
          href: '/dashboard/owner/pembayaran',
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
        {
          name: 'Catat Pengeluaran',
          href: '/dashboard/owner/pengeluaran',
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
        {
          name: 'Riwayat Transaksi',
          href: '/dashboard/owner/riwayat-bayar',
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
      ],
    },
    {
      title: 'Layanan & Komunikasi',
      items: [
        {
          name: 'Keluhan Penyewa',
          href: '/dashboard/owner/keluhan',
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ),
        },
        {
          name: 'Pemeliharaan Kos',
          href: '/dashboard/owner/maintenance',
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          ),
        },
      ],
    },
    {
      title: 'Sistem & Konfigurasi',
      items: [
        {
          name: 'Jadwal & Kalender',
          href: '/dashboard/owner/kalender',
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ),
        },
        {
          name: 'Pengaturan Kos',
          href: '/dashboard/owner/pengaturan',
          icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          ),
        },
      ],
    },
  ];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-955 text-slate-800 dark:text-slate-100 overflow-hidden">
      {/* 1. Sidebar Panel (Hidden on Mobile) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0">
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-850">
          <Link href="/dashboard/owner" className="flex items-center gap-2">
            {profil?.logoUrl ? (
              <img
                src={profil.logoUrl}
                alt="Logo Kos"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/default-logo.png';
                }}
                className="h-7 w-7 rounded-xl object-cover border border-slate-200 dark:border-slate-800 shadow-md shadow-blue-500/10 shrink-0"
              />
            ) : (
              <span className="h-7 w-7 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-500/10 shrink-0">
                K
              </span>
            )}
            <span className="font-black text-sm tracking-wide bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent truncate">
              {profil?.namaKos || 'Kos Tri J'}
            </span>
          </Link>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block px-3">
                {group.title}
              </span>
              <ul className="space-y-1">
                {group.items.map((item, iIdx) => {
                  const isActive = pathname === item.href;
                  return (
                    <li key={iIdx}>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {item.icon}
                        <span>{item.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Sidebar Profile Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-200 flex items-center justify-center font-bold text-sm">
              {user.nama.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.nama}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. Main Content Window */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {/* Page search */}
            <div className="relative w-48 sm:w-64">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg className="h-4 w-4 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Cari kamar, penyewa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl bg-slate-100 dark:bg-slate-850 pl-9 pr-4 py-2 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all focus:bg-slate-50 dark:focus:bg-slate-900 border border-transparent focus:border-slate-200 dark:focus:border-slate-750"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle Button */}
            <button
              onClick={handleThemeToggle}
              title="Toggle Tema Gelap/Terang"
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-amber-400 transition-colors flex items-center justify-center shadow-xs cursor-pointer"
            >
              {isDarkMode ? (
                // Sun Icon for Dark Mode (to switch to Light Mode)
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                // Moon Icon for Light Mode (to switch to Dark Mode)
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
               {/* Notification Bell Dropdown */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2.5 w-80 rounded-2xl border border-slate-202 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-4 z-50 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Notifikasi Terbaru ({unreadCount})</span>
                    <Link
                      href="/dashboard/owner/notifikasi"
                      onClick={() => setNotificationsOpen(false)}
                      className="text-[10px] text-blue-600 hover:underline font-bold"
                    >
                      Lihat Semua
                    </Link>
                  </div>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-center py-4 text-[10px] text-slate-400 dark:text-slate-500 italic font-semibold">Tidak ada notifikasi.</p>
                    ) : (
                      notifications.slice(0, 5).map((notif: any) => {
                        const isUnread = !notif.dibaca;
                        const bgClass = isUnread 
                          ? 'bg-blue-50 dark:bg-blue-955/20 text-blue-600 dark:text-blue-400 font-bold border-l-2 border-blue-500' 
                          : 'bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-450';
                        const icon = notif.tautan?.includes('keluhan') ? '⚠️' : '✉';
                        return (
                          <div
                            key={notif.id}
                            onClick={() => {
                              if (isUnread) handleMarkAsRead(notif.id);
                              setNotificationsOpen(false);
                              if (notif.tautan) router.push(notif.tautan);
                            }}
                            className={`flex gap-2.5 text-[11px] border-b border-slate-50 dark:border-slate-850 pb-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 p-1.5 rounded-lg transition-colors ${bgClass}`}
                          >
                            <span className="shrink-0 p-1 rounded-lg h-fit text-xs bg-slate-105 dark:bg-slate-700">
                              {icon}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-850 dark:text-white leading-normal truncate">{notif.judul}</p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{notif.deskripsi}</p>
                              <span className="text-[8px] text-slate-400 dark:text-slate-500 font-semibold block mt-0.5">
                                {getRelativeTime(notif.createdAt)}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-extrabold text-sm border-2 border-slate-100 dark:border-slate-700 shadow-md cursor-pointer select-none"
              >
                {user.nama.charAt(0)}
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2.5 w-48 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-2.5 z-50 text-xs font-semibold text-slate-600 dark:text-slate-350">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-850 mb-1">
                    <p className="font-bold text-slate-800 dark:text-white truncate">{user.nama}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{user.email}</p>
                  </div>
                  <Link
                    href="/dashboard/owner/pengaturan"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    ⚙ Pengaturan Kos
                  </Link>
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      handleLogout();
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 w-full text-left cursor-pointer"
                  >
                    🚪 Keluar / Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Layout Children Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950">
          {children}
        </main>
      </div>

      {/* Mobile Drawer Navigation (Hidden on Desktop) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-black/50 backdrop-blur-xs">
          <div className="relative flex flex-col w-72 max-w-xs bg-white dark:bg-slate-900 h-full shadow-2xl animate-in slide-in-from-left duration-250">
            {/* Close Button */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800">
              <span className="font-black text-sm text-slate-800 dark:text-white">Kos Tri J</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Drawer Menu */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-6">
              {navGroups.map((group, gIdx) => (
                <div key={gIdx} className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block px-3">
                    {group.title}
                  </span>
                  <ul className="space-y-1">
                    {group.items.map((item, iIdx) => {
                      const isActive = pathname === item.href;
                      return (
                        <li key={iIdx}>
                          <Link
                            href={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                              isActive
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            {item.icon}
                            <span>{item.name}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>

            {/* Profile Footer in Drawer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-200 flex items-center justify-center font-bold text-sm">
                    {user.nama.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.nama}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  disabled={isPending}
                  className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                  title="Keluar"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OwnerLayoutClient(props: OwnerLayoutClientProps) {
  return (
    <ProfilKosProvider initialProfil={props.initialProfilKos}>
      <SearchProvider>
        <OwnerLayoutContent {...props} />
      </SearchProvider>
    </ProfilKosProvider>
  );
}
