'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface NotifikasiClientProps {
  user: {
    nama: string;
    email: string;
  };
  pendingPayments: any[];
  activeComplaints: any[];
  unpaidBills: any[];
}

interface NotificationItem {
  id: string;
  text: string;
  time: string;
  rawDate: Date;
  type: 'info' | 'warning' | 'danger';
  category: 'pembayaran' | 'keluhan' | 'tagihan';
  link: string;
}

export default function NotifikasiClient({
  user,
  pendingPayments = [],
  activeComplaints = [],
  unpaidBills = [],
}: NotifikasiClientProps) {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<'semua' | 'pembayaran' | 'keluhan' | 'tagihan'>('semua');

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

  // Compile notifications from various DB models
  const compiledNotifications: NotificationItem[] = [];

  // 1. Process Pending Payments
  pendingPayments.forEach((inv) => {
    const tenantName = inv.user?.nama || 'Penyewa';
    const roomNo = inv.user?.kamar?.nomorKamar ? `Kamar ${inv.user.kamar.nomorKamar}` : 'Tanpa Kamar';
    compiledNotifications.push({
      id: `pending-${inv.id}`,
      text: `Bukti transfer baru diunggah oleh ${tenantName} (${roomNo}) untuk periode ${inv.bulanTagihan}.`,
      time: getRelativeTime(inv.updatedAt),
      rawDate: new Date(inv.updatedAt),
      type: 'info',
      category: 'pembayaran',
      link: '/dashboard/owner/pembayaran',
    });
  });

  // 2. Process Active Complaints
  activeComplaints.forEach((c) => {
    const tenantName = c.tenant?.nama || 'Penyewa';
    const roomNo = c.kamar?.nomorKamar ? `Kamar ${c.kamar.nomorKamar}` : 'Tanpa Kamar';
    compiledNotifications.push({
      id: `complaint-${c.id}`,
      text: `Keluhan baru dilaporkan oleh ${tenantName} (${roomNo}): "${c.deskripsi}" (Prioritas: ${c.prioritas}).`,
      time: getRelativeTime(c.createdAt),
      rawDate: new Date(c.createdAt),
      type: 'warning',
      category: 'keluhan',
      link: '/dashboard/owner/keluhan',
    });
  });

  // 3. Process Unpaid Bills
  unpaidBills.forEach((inv) => {
    const tenantName = inv.user?.nama || 'Penyewa';
    const roomNo = inv.user?.kamar?.nomorKamar ? `Kamar ${inv.user.kamar.nomorKamar}` : 'Tanpa Kamar';
    compiledNotifications.push({
      id: `unpaid-${inv.id}`,
      text: `Tagihan sewa ${tenantName} (${roomNo}) untuk bulan ${inv.bulanTagihan} belum dibayar.`,
      time: getRelativeTime(inv.createdAt),
      rawDate: new Date(inv.createdAt),
      type: 'danger',
      category: 'tagihan',
      link: '/dashboard/owner/pembayaran',
    });
  });

  // Sort by date (newest first)
  const sortedNotifications = compiledNotifications.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());

  // Filter based on active tab
  const filteredNotifications = sortedNotifications.filter((notif) => {
    if (activeCategory === 'semua') return true;
    return notif.category === activeCategory;
  });

  const getSeverityBadge = (type: 'info' | 'warning' | 'danger') => {
    switch (type) {
      case 'danger':
        return 'bg-red-50 dark:bg-red-950/30 text-red-650 dark:text-red-400 border-red-100 dark:border-red-900/50';
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-950/30 text-amber-655 dark:text-amber-400 border-amber-100 dark:border-amber-900/50';
      case 'info':
      default:
        return 'bg-blue-50 dark:bg-blue-955/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/50';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'pembayaran':
        return '💳 Pembayaran';
      case 'keluhan':
        return '🛠️ Keluhan';
      case 'tagihan':
        return '⚠️ Belum Bayar';
      default:
        return '🔔 Sistem';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Detail Notifikasi</h2>
          <p className="text-xs text-slate-405 dark:text-slate-500 mt-1 font-medium">
            Pantau semua aktivitas transaksi, keluhan, dan tagihan kos Anda
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit select-none">
        {(
          [
            { id: 'semua', label: 'Semua', count: sortedNotifications.length },
            { id: 'pembayaran', label: 'Verifikasi', count: pendingPayments.length },
            { id: 'keluhan', label: 'Keluhan', count: activeComplaints.length },
            { id: 'tagihan', label: 'Belum Bayar', count: unpaidBills.length },
          ] as const
        ).map((tab) => {
          const isActive = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                    : 'bg-slate-200/60 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Notifications list Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6 space-y-4">
        {filteredNotifications.length === 0 ? (
          <div className="py-12 text-center text-slate-400 dark:text-slate-500 font-semibold">
            Tidak ada notifikasi dalam kategori ini.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 space-y-3">
            {filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                className="pt-3 flex flex-col md:flex-row md:items-center justify-between gap-4 first:pt-0"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 px-2 py-0.5 rounded-full border text-[9px] font-bold shrink-0 ${getSeverityBadge(
                      notif.type
                    )}`}
                  >
                    {getCategoryLabel(notif.category)}
                  </span>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-relaxed">
                      {notif.text}
                    </p>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium block">
                      {notif.time}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => router.push(notif.link)}
                  className="rounded-xl border border-slate-202 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 px-4.5 py-2 text-[10px] font-black text-blue-650 dark:text-blue-400 shrink-0 self-end md:self-center transition-all cursor-pointer"
                >
                  Buka Halaman →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
