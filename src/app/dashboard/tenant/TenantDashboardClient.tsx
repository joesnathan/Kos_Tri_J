'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { uploadBuktiTransferAction, updateTenantProfileAction, submitComplaintAction } from '@/app/actions/tenant';
import { logoutAction } from '@/app/actions/auth';
import { ProfilKosProvider, useProfilKos } from '@/context/ProfilKosContext';
import Link from 'next/link';

interface TenantDashboardClientProps {
  user: {
    id: string;
    nama: string;
    email: string;
    role: string;
    nomorHp: string;
    kamarId: string | null;
    kamarName: string;
  };
  initialInvoice: any;
  bankAccounts: any[];
  initialComplaints: any[];
  initialProfilKos?: any;
}

export function TenantDashboardContent({
  user,
  initialInvoice,
  bankAccounts,
  initialComplaints,
  initialProfilKos,
}: TenantDashboardClientProps) {
  const { profil } = useProfilKos();
  const router = useRouter();
  const [invoice, setInvoice] = useState(initialInvoice);
  const [complaints, setComplaints] = useState(initialComplaints);

  const [isPending, startTransition] = useTransition();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [fotoResi, setFotoResi] = useState('');
  const [catatan, setCatatan] = useState('');

  // Profile Settings Form state
  const [profileName, setProfileName] = useState(user.nama);
  const [profileEmail, setProfileEmail] = useState(user.email);
  const [profilePhone, setProfilePhone] = useState(user.nomorHp);
  const [profilePassword, setProfilePassword] = useState('');

  // Complaint Form state
  const [complaintDesc, setComplaintDesc] = useState('');
  const [complaintPriority, setComplaintPriority] = useState<'Rendah' | 'Sedang' | 'Tinggi'>('Sedang');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Notification states
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

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

  // Sync theme
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

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;
    if (!fotoResi.trim()) {
      setErrorMsg('Harap masukkan URL foto bukti transfer.');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await uploadBuktiTransferAction(invoice.id, fotoResi.trim(), catatan.trim());
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(res.message || 'Bukti transfer berhasil dikirim.');
        setInvoice({
          ...invoice,
          status: 'MENUNGGU_VERIFIKASI',
          buktiTransfer: {
            fotoResi: fotoResi.trim(),
            catatan: catatan.trim(),
            alasanDitolak: null,
            tanggalUpload: new Date().toISOString(),
          },
        });
        setFotoResi('');
        setCatatan('');
      }
    });
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await updateTenantProfileAction(
        profileName.trim(),
        profileEmail.trim(),
        profilePhone.trim(),
        profilePassword.trim() !== '' ? profilePassword : undefined
      );

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(res.message || 'Profil berhasil diperbarui.');
        setProfilePassword('');
        router.refresh();
      }
    });
  };

  const handleSubmitComplaint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintDesc.trim()) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await submitComplaintAction(complaintDesc.trim(), complaintPriority);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(res.message || 'Keluhan berhasil dilaporkan.');
        const newComplaintObj = {
          id: Math.random().toString(),
          deskripsi: complaintDesc,
          prioritas: complaintPriority,
          status: 'Baru',
          createdAt: new Date(),
        };
        setComplaints((prev) => [newComplaintObj, ...prev]);
        setComplaintDesc('');
      }
    });
  };

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
    });
  };

  const [activeSection, setActiveSection] = useState('invoice-section');
  const handleScrollTo = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'LUNAS':
        return (
          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            Lunas
          </span>
        );
      case 'MENUNGGU_VERIFIKASI':
        return (
          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400 animate-pulse">
            Menunggu Verifikasi
          </span>
        );
      case 'DITOLAK':
        return (
          <span className="inline-flex items-center rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-650 dark:text-red-400">
            Ditolak Pemilik
          </span>
        );
      case 'BELUM_BAYAR':
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-zinc-100 dark:bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-650 dark:text-zinc-350">
            Belum Bayar
          </span>
        );
    }
  };

  const getComplaintStatusColor = (status: string) => {
    switch (status) {
      case 'Selesai':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'Diproses':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'Baru':
      default:
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    }
  };

  const isFormLocked = invoice?.status === 'MENUNGGU_VERIFIKASI' || invoice?.status === 'LUNAS';

  const menuItems = [
    {
      name: 'Tagihan Sewa',
      sectionId: 'invoice-section',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
    {
      name: 'Lapor Keluhan',
      sectionId: 'complaints-section',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    {
      name: 'Pengaturan Akun',
      sectionId: 'profile-section',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 overflow-hidden font-sans">
      {/* 1. Left Sidebar (Large Screens) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
        {/* Sidebar Header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-100 dark:border-slate-800">
          {profil?.logoUrl ? (
            <img
              src={profil.logoUrl}
              alt="Logo Kos"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/default-logo.png';
              }}
              className="h-8 w-8 rounded-lg object-cover border border-slate-200 dark:border-slate-800 shadow-sm shrink-0"
            />
          ) : (
            <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-blue-600 shadow-sm shadow-blue-500/20 shrink-0">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
          )}
          <div>
            <h1 className="text-sm font-bold text-slate-905 dark:text-white leading-tight truncate max-w-[130px]">
              {profil?.namaKos || 'Kos Tri J'}
            </h1>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium tracking-wide uppercase">Tenant Dashboard</p>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          <div className="space-y-1.5">
            <p className="px-3 text-[10px] font-bold tracking-wider text-slate-405 dark:text-slate-500 uppercase select-none">
              MENU UTAMA
            </p>
            <ul className="space-y-1">
              {menuItems.map((item, idx) => {
                const isActive = activeSection === item.sectionId;
                return (
                  <li key={idx}>
                    <button
                      onClick={() => handleScrollTo(item.sectionId)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer text-left ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-905 dark:hover:text-white'
                      }`}
                    >
                      {item.icon}
                      <span>{item.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        {/* Sidebar Profile Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-200 flex items-center justify-center font-bold text-sm">
              {profileName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{profileName}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">Kamar: {user.kamarName}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. Main Content Window */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-202 dark:border-slate-800 flex items-center justify-between px-6 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-505">
              Sistem Penyewa {profil?.namaKos || 'Kos Tri J'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification Bell Dropdown */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative border border-slate-202 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer flex items-center justify-center h-9 w-9"
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
                    <span className="text-xs font-bold text-slate-909 dark:text-white">Notifikasi ({unreadCount})</span>
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/notifications', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ all: true }),
                          });
                          if (res.ok) {
                            setNotifications(prev => prev.map(n => ({ ...n, dibaca: true })));
                            setUnreadCount(0);
                            window.dispatchEvent(new Event('notifications_updated'));
                          }
                        } catch (err) {}
                      }}
                      className="text-[10px] text-blue-600 hover:underline font-bold bg-transparent border-none cursor-pointer"
                    >
                      Tandai Semua Dibaca
                    </button>
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

            {/* Theme Toggle Button */}
            <button
              onClick={handleThemeToggle}
              title="Toggle Tema Gelap/Terang"
              className="p-2 rounded-xl border border-slate-202 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors flex items-center justify-center shadow-xs cursor-pointer"
            >
              {isDarkMode ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              disabled={isPending}
              className="rounded-xl border border-red-200 dark:border-red-900 px-3.5 py-1.5 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-955/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isPending ? 'Keluar...' : 'Keluar'}
            </button>
          </div>
        </header>

        {/* 3. Scrollable Main Panel */}
        <main className="flex-1 overflow-y-auto bg-slate-100/50 dark:bg-slate-950 p-6 space-y-8 scroll-smooth">
          {/* Outstanding Invoice Banner */}
          {invoice && invoice.status !== 'LUNAS' && (
            <div className="rounded-2xl border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 p-5 flex items-start gap-3.5 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="text-xl shrink-0">⚠️</div>
              <div>
                <h4 className="text-sm font-black text-red-650 dark:text-red-400">Pengingat Pembayaran Jatuh Tempo</h4>
                <p className="text-xs text-red-700/90 dark:text-red-300 leading-relaxed mt-1 font-semibold">
                  Tagihan sewa Anda sebesar <strong className="text-red-900 dark:text-white font-extrabold">{formatCurrency(invoice.nominal)}</strong> untuk bulan <strong className="text-red-900 dark:text-white font-extrabold">{invoice.bulanTagihan}</strong> saat ini belum terbayar lunas.
                  Harap segera lakukan transfer pembayaran ke salah satu rekening pemilik di bawah sebelum batas tempo sewa agar dapat diverifikasi secara otomatis.
                </p>
              </div>
            </div>
          )}

          {/* Success / Error Messages */}
          {errorMsg && (
            <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-955/20 p-4 text-xs font-bold text-red-600 dark:text-red-400">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="rounded-xl border border-emerald-250 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-955/20 p-4 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {successMsg}
            </div>
          )}

          {/* 1. Tenant Overview Banner */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-202 dark:border-slate-800 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
            <div>
              <h2 className="text-lg font-extrabold text-slate-850 dark:text-white tracking-wide">{profileName}</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-semibold">
                {profileEmail} • {profilePhone}
              </p>
            </div>
            <div className="flex gap-2 shrink-0 select-none">
              <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-955 px-3 py-1 text-xs font-black text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
                Penyewa Kos
              </span>
              <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-black text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Kamar: {user.kamarName}
              </span>
            </div>
          </section>

          {/* 2. Invoices & Billing Details */}
          <div id="invoice-section" className="grid grid-cols-1 gap-8 lg:grid-cols-3 scroll-mt-6">
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-wider uppercase">Tagihan Sewa Kamar</h2>

              {!invoice ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-xs">
                  <p className="text-slate-400 dark:text-slate-500 font-bold">Selamat! Anda tidak memiliki tagihan aktif saat ini.</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-xs">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(invoice.nominal)}</h3>
                      <p className="text-xs text-slate-400 dark:text-slate-505 mt-1 font-semibold">Bulan tagihan: {invoice.bulanTagihan}</p>
                    </div>
                    <div>{getStatusBadge(invoice.status)}</div>
                  </div>

                  {invoice.buktiTransfer && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 space-y-3">
                      <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Resi yang telah diunggah
                      </h4>
                      <div className="text-xs truncate font-bold text-slate-600 dark:text-slate-305">
                        File:{' '}
                        <a
                          href={invoice.buktiTransfer.fotoResi}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {invoice.buktiTransfer.fotoResi}
                        </a>
                      </div>
                      {invoice.buktiTransfer.catatan && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                          Catatan Anda: <span className="italic">&quot;{invoice.buktiTransfer.catatan}&quot;</span>
                        </p>
                      )}
                    </div>
                  )}

                  {!isFormLocked && (
                    <form onSubmit={handleUploadSubmit} className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <h4 className="text-sm font-black text-slate-800 dark:text-white">Konfirmasi Bukti Transfer</h4>
                      
                      <div>
                        <label htmlFor="fotoResi" className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                          URL Foto / Gambar Resi
                        </label>
                        <input
                          id="fotoResi"
                          type="text"
                          required
                          value={fotoResi}
                          onChange={(e) => setFotoResi(e.target.value)}
                          className="mt-2 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-850 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 outline-none focus:ring-2 focus:ring-blue-500/10"
                          placeholder="https://example.com/bukti-resi.png"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="catatan" className="block text-xs font-bold text-slate-700 dark:text-slate-355 uppercase tracking-wider">
                          Catatan Tambahan (Opsional)
                        </label>
                        <input
                          id="catatan"
                          type="text"
                          value={catatan}
                          onChange={(e) => setCatatan(e.target.value)}
                          className="mt-2 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-850 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 outline-none focus:ring-2 focus:ring-blue-500/10"
                          placeholder="Contoh: Transfer via Mandiri a/n Budi"
                        />
                      </div>
                      
                      <button
                        type="submit"
                        disabled={isPending}
                        className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-500 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {isPending ? 'Mengirim...' : 'Kirim Bukti Transfer'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* Bank details panel */}
            <div className="space-y-4">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-wider uppercase">Rekening Pemilik</h2>
              <div className="space-y-4">
                {bankAccounts.map((bank) => (
                  <div key={bank.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-2 shadow-xs">
                    <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{bank.namaBank}</p>
                    <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-wide select-all">{bank.nomorRekening}</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                      Atas Nama: <span className="text-slate-700 dark:text-slate-300 font-extrabold">{bank.atasNama}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Complaints & Profile Settings Area */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 pt-4">
            {/* Lapor Keluhan Form panel */}
            <section id="complaints-section" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-202 dark:border-slate-800 p-6 space-y-6 shadow-xs scroll-mt-6">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-wide">Lapor Keluhan Kamar</h2>
                <p className="text-xs text-slate-400 dark:text-slate-505 mt-1 font-medium">Beri tahu pemilik jika ada kerusakan fasilitas kamar</p>
              </div>

              <form onSubmit={handleSubmitComplaint} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-355 uppercase tracking-wider">Deskripsi Keluhan</label>
                  <textarea
                    required
                    rows={3}
                    value={complaintDesc}
                    onChange={(e) => setComplaintDesc(e.target.value)}
                    placeholder="Contoh: Keran air bocor di kamar mandi / Lampu mati..."
                    className="mt-2 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-850 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 outline-none focus:ring-2 focus:ring-blue-500/10 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-355 uppercase tracking-wider">Prioritas</label>
                  <select
                    value={complaintPriority}
                    onChange={(e) => setComplaintPriority(e.target.value as any)}
                    className="mt-2 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-3.5 py-2.5 text-xs text-slate-850 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 outline-none font-bold"
                  >
                    <option value="Rendah" className="dark:bg-slate-900">Rendah (Fasilitas non-vital)</option>
                    <option value="Sedang" className="dark:bg-slate-900">Sedang (Perlu diperbaiki secepatnya)</option>
                    <option value="Tinggi" className="dark:bg-slate-900">Tinggi (Kondisi darurat/vital)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-500 disabled:opacity-50 cursor-pointer"
                >
                  Kirim Laporan Keluhan
                </button>
              </form>

              {/* Complaints progress listings */}
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">Status & Progres Keluhan</h3>
                {complaints.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic">Belum ada laporan keluhan aktif.</p>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {complaints.map((c: any) => (
                      <div key={c.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-start gap-4 shadow-xxs">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-normal">{c.deskripsi}</p>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-1 font-semibold">Prioritas: {c.prioritas}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full border text-[9px] font-extrabold shrink-0 ${getComplaintStatusColor(c.status)}`}>
                          {c.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Profile Settings panel */}
            <section id="profile-section" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-202 dark:border-slate-800 p-6 space-y-6 shadow-xs scroll-mt-6">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-wide">Pengaturan Pengguna</h2>
                <p className="text-xs text-slate-400 dark:text-slate-505 mt-1 font-medium">Perbarui profil data diri dan password sewa Anda</p>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-355 uppercase tracking-wider">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="mt-2 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-850 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-355 uppercase tracking-wider">Email Address</label>
                    <input
                      type="email"
                      required
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      className="mt-2 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-850 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-355 uppercase tracking-wider">Nomor HP</label>
                    <input
                      type="text"
                      required
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      className="mt-2 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-850 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-355 uppercase tracking-wider">Password Baru (Opsional)</label>
                  <input
                    type="password"
                    value={profilePassword}
                    onChange={(e) => setProfilePassword(e.target.value)}
                    className="mt-2 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-850 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 outline-none"
                    placeholder="Kosongkan jika tidak ingin diubah"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-500 disabled:opacity-50 cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </form>
            </section>
          </div>
        </main>
      </div>

      {/* 4. Mobile slide-out drawer menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs transition-opacity"
          />

          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white dark:bg-slate-900 border-r border-slate-202 dark:border-slate-800 animate-in slide-in-from-left duration-250">
            {/* Close Button inside Drawer */}
            <div className="absolute right-4 top-4">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Brand Header */}
            <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-100 dark:border-slate-800">
              {profil?.logoUrl ? (
                <img
                  src={profil.logoUrl}
                  alt="Logo Kos"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/default-logo.png';
                  }}
                  className="h-8 w-8 rounded-lg object-cover border border-slate-200 dark:border-slate-800 shadow-sm shrink-0"
                />
              ) : (
                <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-blue-600 shrink-0">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
              )}
              <div>
                <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate max-w-[130px]">
                  {profil?.namaKos || 'Kos Tri J'}
                </h1>
                <p className="text-[10px] text-slate-400 dark:text-slate-505 font-medium">Tenant Dashboard</p>
              </div>
            </div>

            {/* Navigation inside Drawer */}
            <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
              <div className="space-y-1.5">
                <p className="px-3 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase select-none">
                  MENU PENYEWA
                </p>
                <ul className="space-y-1">
                  {menuItems.map((item, idx) => {
                    const isActive = activeSection === item.sectionId;
                    return (
                      <li key={idx}>
                        <button
                          onClick={() => {
                            setMobileMenuOpen(false);
                            handleScrollTo(item.sectionId);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide cursor-pointer text-left ${
                            isActive
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'text-slate-655 dark:text-slate-400 hover:bg-slate-105 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {item.icon}
                          <span>{item.name}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TenantDashboardClient(props: TenantDashboardClientProps) {
  return (
    <ProfilKosProvider initialProfil={props.initialProfilKos}>
      <TenantDashboardContent {...props} />
    </ProfilKosProvider>
  );
}
