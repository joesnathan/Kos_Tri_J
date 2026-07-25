'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSearch } from '@/context/SearchContext';

interface DashboardClientProps {
  user: {
    nama: string;
    email: string;
  };
  stats: {
    totalRooms: number;
    occupiedRooms: number;
    vacantRooms: number;
    maintenanceRooms: number;
    totalRevenue: number;
    activeTenants: number;
    pendingInvoicesCount: number;
    unpaidInvoicesCount: number;
    totalExpenses: number;
  };
  monthlyRevenue: Array<{
    bulanTagihan: string;
    total: number;
    count: number;
  }>;
  roomsList: any[];
  recentActivities: any[];
  paymentsDue: any[];
  bankAccounts: any[];
  complaintsList: any[];
}

export default function DashboardClient({
  user,
  stats,
  roomsList = [],
  recentActivities = [],
  paymentsDue = [],
  bankAccounts = [],
  complaintsList = [],
}: DashboardClientProps) {
  const router = useRouter();
  
  // Consume search query from layout context
  const { searchQuery } = useSearch();

  // Dynamic Real-time Calendar Schedule State & Synchronizer
  const today = React.useMemo(() => new Date(), []);
  const [currentMonth, setCurrentMonth] = React.useState(today.getMonth());
  const [currentYear, setCurrentYear] = React.useState(today.getFullYear());
  const [jadwalEvents, setJadwalEvents] = React.useState<any[]>([]);

  const monthNames = React.useMemo(
    () => [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ],
    []
  );

  const fetchKalenderData = React.useCallback(async () => {
    try {
      const res = await fetch('/api/kalender');
      const data = await res.json();
      if (data.success) {
        setJadwalEvents(data.jadwalEvents || []);
      }
    } catch (err) {
      console.error('Error fetching kalender data:', err);
    }
  }, []);

  React.useEffect(() => {
    fetchKalenderData();
    const interval = setInterval(fetchKalenderData, 5000);
    const handleUpdate = () => fetchKalenderData();
    window.addEventListener('kalender_updated', handleUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('kalender_updated', handleUpdate);
    };
  }, [fetchKalenderData]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Bind real database total expenses metric
  const calculatedExpense = stats.totalExpenses;
  const profit = Math.max(stats.totalRevenue - calculatedExpense, 0);

  // Status Room grid helpers
  const getRoomColorClasses = (status: string) => {
    switch (status) {
      case 'Terisi':
        return 'border-emerald-200 dark:border-emerald-950/40 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100/50';
      case 'Kosong':
        return 'border-blue-200 dark:border-blue-950/40 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100/50';
      case 'Perbaikan':
      default:
        return 'border-amber-200 dark:border-amber-950/40 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100/50';
    }
  };

  const getRoomStatusLabel = (status: string, users: any[]) => {
    if (status === 'Terisi' && users && users.length > 0) {
      return users[0].nama.split(' ')[0]; // Show first name
    }
    if (status === 'Perbaikan') {
      return 'maintenance';
    }
    return 'vacant';
  };

  // Filter rooms based on query (by room number or occupant name)
  const filteredRooms = roomsList.filter((room) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchesRoomNum = room.nomorKamar.toLowerCase().includes(q);
    const matchesTenantName = room.users && room.users.some((u: any) => u.nama.toLowerCase().includes(q));
    return matchesRoomNum || matchesTenantName;
  });

  const handleEventClick = (type: 'tempo' | 'pemeliharaan' | 'kontrak') => {
    if (type === 'tempo') {
      router.push('/dashboard/owner/pembayaran');
    } else if (type === 'pemeliharaan') {
      router.push('/dashboard/owner/maintenance');
    } else if (type === 'kontrak') {
      router.push('/dashboard/owner/kontrak');
    } else {
      router.push('/dashboard/owner/kalender');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* 1. Main Stats Grid */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {/* Total Kamar */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold tracking-wider uppercase">Total Kamar</span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded">
                ↗ 0%
              </span>
            </div>
            <h4 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{stats.totalRooms}</h4>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium">Kamar terdaftar</p>
        </div>

        {/* Terisi */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold tracking-wider uppercase">Terisi</span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded">
                ↗ +1
              </span>
            </div>
            <h4 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{stats.occupiedRooms}</h4>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium">{stats.occupiedRooms}/{stats.totalRooms} Kamar</p>
        </div>

        {/* Kosong */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold tracking-wider uppercase">Kosong</span>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded">
                Tersedia
              </span>
            </div>
            <h4 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{stats.vacantRooms}</h4>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium">Kamar kosong</p>
        </div>

        {/* Pendapatan */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold tracking-wider uppercase">Pendapatan</span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded">
                ↗ +8%
              </span>
            </div>
            <h4 className="text-xl font-extrabold text-slate-900 dark:text-white mt-2.5 truncate">
              {stats.totalRevenue > 1000000 
                ? `Rp ${(stats.totalRevenue / 1000000).toFixed(1)}jt` 
                : formatCurrency(stats.totalRevenue)}
            </h4>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium">Bulan ini</p>
        </div>

        {/* Pengeluaran */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold tracking-wider uppercase">Pengeluaran</span>
              <span className="text-[10px] font-bold text-red-600 dark:text-red-400 flex items-center bg-red-50 dark:bg-red-950/30 px-1.5 py-0.5 rounded">
                ↘ +3%
              </span>
            </div>
            <h4 className="text-xl font-extrabold text-slate-900 dark:text-white mt-2.5 truncate">
              {calculatedExpense > 1000000
                ? `Rp ${(calculatedExpense / 1000000).toFixed(1)}jt`
                : formatCurrency(calculatedExpense)}
            </h4>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium">Bulan ini</p>
        </div>

        {/* Profit */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold tracking-wider uppercase">Profit</span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded">
                ↗ +11%
              </span>
            </div>
            <h4 className="text-xl font-extrabold text-slate-900 dark:text-white mt-2.5 truncate">
              {profit > 1000000
                ? `Rp ${(profit / 1000000).toFixed(1)}jt`
                : formatCurrency(profit)}
            </h4>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium">Bulan ini</p>
        </div>
      </section>

      {/* 2. Secondary Metrics Grid */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metode Pembayaran Bank */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {bankAccounts && bankAccounts.length > 0
                ? `${bankAccounts[0].namaBank} ${bankAccounts[0].nomorRekening}`
                : 'BCA 8000123456'}
            </h4>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold truncate">
              a/n {bankAccounts && bankAccounts.length > 0 ? bankAccounts[0].atasNama : 'Budi Pemilik Kos'}
            </p>
            <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-900/40 inline-block mt-1">Metode Pembayaran</span>
          </div>
        </div>

        {/* Penyewa Aktif */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 rounded-xl">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div>
            <h4 className="text-xl font-bold text-slate-900 dark:text-white">{stats.activeTenants}</h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Penyewa Aktif</p>
          </div>
        </div>

        {/* Belum Bayar */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-xl">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xl font-bold text-slate-900 dark:text-white">{stats.unpaidInvoicesCount}</h4>
              {stats.pendingInvoicesCount > 0 && (
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-1.5 py-0.5 rounded">
                  {stats.pendingInvoicesCount} Verifikasi
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Belum Bayar (Bulan ini)</p>
          </div>
        </div>

        {/* Keluhan Aktif */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h4 className="text-xl font-bold text-slate-900 dark:text-white">
              {complaintsList ? complaintsList.filter((c: any) => c.status !== 'Selesai').length : 0}
            </h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Keluhan Aktif</p>
          </div>
        </div>
      </section>

      {/* 3. Charts & Status Grid Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Embedded Calendar Card & Room Status Grid */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Realtime Embedded Calendar Card */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Ringkasan Jadwal Kalender</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Sinkronisasi realtime dari Modul Kalender & Transaksi</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold"
                >
                  ◀
                </button>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-2.5 py-1 rounded-lg">
                  {monthNames[currentMonth]} {currentYear}
                </span>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold"
                >
                  ▶
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="space-y-3">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1 bg-slate-100/65 dark:bg-slate-950/50 rounded-xl p-1">
                {(() => {
                  const cells = [];
                  const firstDayOffset = new Date(currentYear, currentMonth, 1).getDay();
                  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

                  for (let i = 0; i < firstDayOffset; i++) {
                    cells.push(<div key={`empty-${i}`} className="aspect-square bg-white/40 dark:bg-slate-900/40 rounded-lg" />);
                  }

                  const activeEvents: Record<number, Array<{ label: string; bg: string; text: string; type: string }>> = {};

                  // 1. Custom Jadwal events from DB
                  jadwalEvents.forEach((j: any) => {
                    const d = new Date(j.tanggal);
                    if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
                      const dayNum = d.getDate();
                      if (!activeEvents[dayNum]) activeEvents[dayNum] = [];
                      const isPembayaran = j.tipe === 'pembayaran';
                      const isMaintenance = j.tipe === 'maintenance';
                      activeEvents[dayNum].push({
                        label: j.judul,
                        bg: isPembayaran
                          ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/40'
                          : isMaintenance
                          ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40'
                          : 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900/40',
                        text: isPembayaran
                          ? 'text-blue-600 dark:text-blue-400'
                          : isMaintenance
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-purple-600 dark:text-purple-400',
                        type: j.tipe,
                      });
                    }
                  });

                  // 2. Dynamic payment due dates from DB
                  paymentsDue.forEach((due: any) => {
                    const dueDate = new Date(due.createdAt);
                    if (dueDate.getFullYear() === currentYear && dueDate.getMonth() === currentMonth) {
                      const dueDay = dueDate.getDate();
                      if (!activeEvents[dueDay]) activeEvents[dueDay] = [];
                      activeEvents[dueDay].push({
                        label: `Tempo ${due.user ? due.user.nama.split(' ')[0] : 'Penyewa'}`,
                        bg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/40',
                        text: 'text-blue-600 dark:text-blue-400',
                        type: 'tempo',
                      });
                    }
                  });

                  // 3. Dynamic maintenance dates
                  complaintsList.filter((c: any) => c.status !== 'Selesai').forEach((comp: any) => {
                    const compDate = new Date(comp.createdAt);
                    if (compDate.getFullYear() === currentYear && compDate.getMonth() === currentMonth) {
                      const compDay = compDate.getDate();
                      if (!activeEvents[compDay]) activeEvents[compDay] = [];
                      activeEvents[compDay].push({
                        label: comp.deskripsi ? comp.deskripsi.substring(0, 10) : 'Keluhan',
                        bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40',
                        text: 'text-amber-600 dark:text-amber-400',
                        type: 'pemeliharaan',
                      });
                    }
                  });

                  for (let d = 1; d <= daysInMonth; d++) {
                    const isToday =
                      d === today.getDate() &&
                      currentMonth === today.getMonth() &&
                      currentYear === today.getFullYear();
                    const dayEvents = activeEvents[d] || [];
                    cells.push(
                      <div
                        key={`day-${d}`}
                        onClick={() => router.push('/dashboard/owner/kalender')}
                        className={`aspect-square bg-white dark:bg-slate-900 rounded-lg p-1 flex flex-col justify-between border cursor-pointer hover:shadow-md transition-all ${
                          isToday ? 'border-blue-500 shadow-sm ring-1 ring-blue-500/20 bg-blue-50/20' : 'border-slate-200/50 dark:border-slate-800'
                        }`}
                      >
                        <span className={`text-[8px] font-bold ${isToday ? 'text-blue-600 dark:text-blue-400 font-black' : 'text-slate-500 dark:text-slate-400'}`}>
                          {d}
                        </span>
                        {dayEvents.length > 0 && (
                          <div className={`text-[6px] font-extrabold px-1 py-0.5 rounded border truncate leading-none ${dayEvents[0].bg} ${dayEvents[0].text}`}>
                            {dayEvents[0].label}
                          </div>
                        )}
                      </div>
                    );
                  }

                  while (cells.length % 7 !== 0) {
                    cells.push(<div key={`empty-end-${cells.length}`} className="aspect-square bg-white/40 dark:bg-slate-900/40 rounded-lg" />);
                  }

                  return cells;
                })()}
              </div>

              {/* Legend & Navigation Link */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Tempo</span>
                  <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Servis</span>
                  <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-purple-500" /> Kontrak/Lain</span>
                </div>
                <Link href="/dashboard/owner/kalender" className="text-blue-600 dark:text-blue-400 hover:underline">Kelola Kalender →</Link>
              </div>
            </div>
          </div>

          {/* Status Kamar Grid Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Status Kamar</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {filteredRooms.length === 0 ? (
                <div className="col-span-full py-4 text-center text-xs text-slate-400 dark:text-slate-500">
                  Tidak ada kamar yang cocok dengan pencarian.
                </div>
              ) : (
                filteredRooms.map((room, idx) => (
                  <Link
                    key={room.id || idx}
                    href="/dashboard/owner/kamar"
                    className={`border rounded-xl p-3 text-center flex flex-col justify-between min-h-[75px] transition-all hover:shadow-md cursor-pointer ${getRoomColorClasses(
                      room.status
                    )}`}
                  >
                    <span className="text-xs font-extrabold uppercase tracking-wide">
                      {room.nomorKamar.replace('Kamar ', 'R')}
                    </span>
                    <span className="text-[10px] font-semibold truncate capitalize mt-1.5">
                      {getRoomStatusLabel(room.status, room.users)}
                    </span>
                  </Link>
                ))
              )}
            </div>
            {/* Legend */}
            <div className="flex items-center gap-6 mt-6 border-t border-slate-100 dark:border-slate-800 pt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Terisi
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                Kosong
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                Maintenance
              </span>
            </div>
          </div>

        </div>

        {/* Right Column: Donut Chart, Recent Activities, Payments Due */}
        <div className="space-y-6">
          {/* Metode Bayar (Donut Chart representation) */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Metode Bayar</h3>
            <div className="flex items-center justify-around">
              {/* Donut SVG Ring */}
              <div className="relative h-28 w-28 flex items-center justify-center">
                <svg className="h-full w-full transform -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3" className="stroke-slate-100 dark:stroke-slate-850" />
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#2563eb" strokeWidth="3" strokeDasharray="42 58" strokeDashoffset="0" />
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray="31 69" strokeDashoffset="-42" />
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray="18 82" strokeDashoffset="-73" />
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#8b5cf6" strokeWidth="3" strokeDasharray="9 91" strokeDashoffset="-91" />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500">Total</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">100%</span>
                </div>
              </div>

              {/* Chart Legend list */}
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-450 space-y-2">
                <div className="flex items-center justify-between w-28">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-600" />
                    QRIS
                  </span>
                  <span className="font-bold text-slate-800 dark:text-white">42%</span>
                </div>
                <div className="flex items-center justify-between w-28">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Transfer
                  </span>
                  <span className="font-bold text-slate-800 dark:text-white">31%</span>
                </div>
                <div className="flex items-center justify-between w-28">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Cash
                  </span>
                  <span className="font-bold text-slate-800 dark:text-white">18%</span>
                </div>
                <div className="flex items-center justify-between w-28">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-purple-500" />
                    VA
                  </span>
                  <span className="font-bold text-slate-800 dark:text-white">9%</span>
                </div>
              </div>
            </div>
          </div>
          {/* Aktivitas Terbaru */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Aktivitas Terbaru</h3>
            {recentActivities.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-505 font-medium">
                Belum ada aktivitas baru tercatat.
              </div>
            ) : (
              <ul className="space-y-4">
                {recentActivities.map((act) => {
                  let bgClass = 'bg-blue-50 dark:bg-blue-955/20 text-blue-600 dark:text-blue-400';
                  let icon = '⚙';
                  
                  if (act.tipe.includes('Berhasil') || act.tipe.includes('Check-in')) {
                    bgClass = 'bg-emerald-55 text-emerald-600 dark:text-emerald-400';
                    icon = '✓';
                  } else if (act.tipe.includes('Ditolak') || act.tipe.includes('Check-out')) {
                    bgClass = 'bg-red-55 text-red-600 dark:text-red-400';
                    icon = '✕';
                  } else if (act.tipe.includes('Keluhan') || act.tipe.includes('Komplain')) {
                    bgClass = 'bg-amber-55 text-amber-600 dark:text-amber-400';
                    icon = '⚠️';
                  } else if (act.tipe.includes('Rekening') || act.tipe.includes('Pengeluaran') || act.tipe.includes('Baru')) {
                    bgClass = 'bg-purple-55 text-purple-600 dark:text-purple-400';
                    icon = '💵';
                  }

                  // Calculate relative time
                  const getRelativeTimeString = (dateInput: string) => {
                    const date = new Date(dateInput);
                    const diffMs = new Date().getTime() - date.getTime();
                    if (isNaN(diffMs) || diffMs < 0) return 'Baru saja';
                    const diffMins = Math.floor(diffMs / 60000);
                    const diffHours = Math.floor(diffMins / 60);
                    if (diffMins < 1) return 'Baru saja';
                    if (diffMins < 60) return `${diffMins} menit lalu`;
                    if (diffHours < 24) return `${diffHours} jam lalu`;
                    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                  };

                  return (
                    <li key={act.id} className="flex gap-3 text-xs">
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 font-bold ${bgClass}`}>
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-800 dark:text-white font-bold leading-normal">
                          {act.tipe} <span className="font-semibold text-slate-500 dark:text-slate-450">{act.deskripsi}</span>
                        </p>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block mt-0.5">
                          {getRelativeTimeString(act.createdAt)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Jatuh Tempo Pembayaran */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Jatuh Tempo Pembayaran</h3>
            {paymentsDue.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500 font-medium">
                Semua tagihan terbayar lunas.
              </div>
            ) : (
              <ul className="space-y-4">
                {paymentsDue.map((due, idx) => {
                  const isLate = idx === 1; // Mark second item as Late for illustration
                  return (
                    <li key={due.id || idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                          {due.user.nama.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white">{due.user.nama}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                            {due.bulanTagihan} • {formatCurrency(due.nominal)}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isLate 
                            ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/40' 
                            : 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40'
                        }`}
                      >
                        {isLate ? 'Terlambat' : 'Belum'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
