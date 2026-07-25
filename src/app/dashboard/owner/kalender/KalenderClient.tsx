'use client';

import React, { useState, useEffect, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createJadwalAction, deleteJadwalAction } from '@/app/actions/owner';

interface KalenderClientProps {
  user: {
    nama: string;
    email: string;
  };
  initialInvoices?: any[];
  initialComplaints?: any[];
  initialTenants?: any[];
}

interface CalendarEvent {
  id: string;
  label: string;
  type: 'pembayaran' | 'maintenance' | 'kontrak' | 'lainnya';
  link: string;
  isCustom?: boolean;
}

export default function KalenderClient({
  user,
  initialInvoices = [],
  initialComplaints = [],
  initialTenants = [],
}: KalenderClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Initialize with current date
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  // Custom events state
  const [customEvents, setCustomEvents] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form state
  const [eventJudul, setEventJudul] = useState('');
  const [eventTanggal, setEventTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [eventTipe, setEventTipe] = useState<'pembayaran' | 'maintenance' | 'kontrak' | 'lainnya'>('lainnya');
  const [eventDeskripsi, setEventDeskripsi] = useState('');

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const weekdays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  const fetchCustomEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/kalender');
      const data = await res.json();
      if (data.success) {
        setCustomEvents(data.jadwalEvents || []);
      }
    } catch (err) {
      console.error('Error fetching kalender API:', err);
    }
  }, []);

  useEffect(() => {
    fetchCustomEvents();
  }, [fetchCustomEvents]);

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

  const handleAddEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventJudul.trim() || !eventTanggal) return;

    setErrorMsg(null);
    startTransition(async () => {
      const res = await createJadwalAction(
        eventJudul.trim(),
        eventTanggal,
        eventTipe,
        eventDeskripsi.trim()
      );

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setToastMsg('Jadwal berhasil ditambahkan!');
        setTimeout(() => setToastMsg(null), 3000);
        setIsAddModalOpen(false);
        setEventJudul('');
        setEventDeskripsi('');

        // Refresh and broadcast realtime update event
        await fetchCustomEvents();
        window.dispatchEvent(new Event('kalender_updated'));
      }
    });
  };

  const handleDeleteCustomEvent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Apakah Anda yakin ingin menghapus jadwal ini?')) return;

    startTransition(async () => {
      const res = await deleteJadwalAction(id);
      if (res.success) {
        setToastMsg('Jadwal berhasil dihapus!');
        setTimeout(() => setToastMsg(null), 3000);
        await fetchCustomEvents();
        window.dispatchEvent(new Event('kalender_updated'));
      }
    });
  };

  // Calculate dynamic days grid
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

  const gridCells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) gridCells.push(null);
  for (let d = 1; d <= totalDays; d++) gridCells.push(d);
  while (gridCells.length % 7 !== 0) gridCells.push(null);

  const getEventsForDay = (day: number): CalendarEvent[] => {
    const dayEvents: CalendarEvent[] = [];

    // 1. Custom Jadwal Events
    customEvents.forEach((j) => {
      const jDate = new Date(j.tanggal);
      if (
        jDate.getFullYear() === currentYear &&
        jDate.getMonth() === currentMonth &&
        jDate.getDate() === day
      ) {
        dayEvents.push({
          id: j.id,
          label: j.judul,
          type: j.tipe || 'lainnya',
          link: '#',
          isCustom: true,
        });
      }
    });

    // 2. Invoices (Tagihan)
    initialInvoices.forEach((inv) => {
      const invDate = new Date(inv.createdAt);
      if (
        invDate.getFullYear() === currentYear &&
        invDate.getMonth() === currentMonth &&
        invDate.getDate() === day
      ) {
        const tenantName = inv.user?.nama || 'Penyewa';
        const roomNo = inv.user?.kamar?.nomorKamar ? `R${inv.user.kamar.nomorKamar}` : '';
        dayEvents.push({
          id: `inv-${inv.id}`,
          label: `Tagihan ${tenantName} ${roomNo}`.trim(),
          type: 'pembayaran',
          link: '/dashboard/owner/pembayaran',
        });
      }
    });

    // 3. Complaints (Keluhan)
    initialComplaints.forEach((c) => {
      const compDate = new Date(c.createdAt);
      if (
        compDate.getFullYear() === currentYear &&
        compDate.getMonth() === currentMonth &&
        compDate.getDate() === day
      ) {
        const roomNo = c.kamar?.nomorKamar ? `R${c.kamar.nomorKamar}` : '';
        dayEvents.push({
          id: `comp-${c.id}`,
          label: `Keluhan ${roomNo}: ${c.deskripsi}`,
          type: 'maintenance',
          link: '/dashboard/owner/keluhan',
        });
      }
    });

    // 4. Tenant Registration / Renewals
    initialTenants.forEach((t) => {
      const tDate = new Date(t.createdAt);
      if (
        tDate.getFullYear() === currentYear &&
        tDate.getMonth() === currentMonth &&
        tDate.getDate() === day
      ) {
        const roomNo = t.kamar?.nomorKamar ? `R${t.kamar.nomorKamar}` : '';
        dayEvents.push({
          id: `tenant-${t.id}`,
          label: `Tenant Baru ${t.nama} ${roomNo}`.trim(),
          type: 'kontrak',
          link: '/dashboard/owner/penyewa',
        });
      }
    });

    return dayEvents;
  };

  const getEventClass = (type: string) => {
    switch (type) {
      case 'pembayaran':
        return 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-l-2 border-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/60 cursor-pointer';
      case 'maintenance':
        return 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-l-2 border-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/60 cursor-pointer';
      case 'kontrak':
        return 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-l-2 border-purple-500 hover:bg-purple-100 dark:hover:bg-purple-900/60 cursor-pointer';
      default:
        return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-l-2 border-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 cursor-pointer';
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-900 text-white px-4.5 py-3 rounded-2xl shadow-xl text-xs font-bold animate-in fade-in slide-in-from-bottom-5 duration-200">
          {toastMsg}
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Jadwal & Kalender</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
            Kelola jadwal kegiatan, pembayaran, kontrak, dan pemeliharaan kos (Terintegrasi Realtime dengan Dashboard)
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-500 active:scale-[0.98] transition-all cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Tambah Jadwal
        </button>
      </div>

      {/* Calendar Card container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-6 space-y-6">
        {/* Month Navigator Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
          <div className="flex items-center gap-2">
            <select
              value={currentMonth}
              onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-700 dark:text-white outline-none focus:border-blue-500 cursor-pointer shadow-sm"
            >
              {monthNames.map((name, idx) => (
                <option key={idx} value={idx}>{name}</option>
              ))}
            </select>

            <select
              value={currentYear}
              onChange={(e) => setCurrentYear(parseInt(e.target.value))}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-700 dark:text-white outline-none focus:border-blue-500 cursor-pointer shadow-sm"
            >
              {Array.from({ length: 11 }, (_, i) => today.getFullYear() - 5 + i).map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMonth}
              className="p-1 w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-650 bg-white dark:bg-slate-900 transition-colors cursor-pointer font-bold shadow-sm"
            >
              ‹
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1 w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-650 bg-white dark:bg-slate-900 transition-colors cursor-pointer font-bold shadow-sm"
            >
              ›
            </button>
          </div>
        </div>

        {/* Weekdays Header Grid */}
        <div className="grid grid-cols-7 gap-px text-center text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none border-b border-slate-100 dark:border-slate-800 pb-2">
          {weekdays.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-px bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800">
          {gridCells.map((day, idx) => {
            const cellEvents = day ? getEventsForDay(day) : [];
            const isToday =
              day === today.getDate() &&
              currentMonth === today.getMonth() &&
              currentYear === today.getFullYear();

            return (
              <div
                key={idx}
                className={`min-h-[105px] bg-white dark:bg-slate-900 p-1.5 sm:p-2 flex flex-col justify-between transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/40 border-r border-b border-slate-100 dark:border-slate-800/50 ${
                  isToday ? 'ring-2 ring-blue-500 ring-inset z-10 bg-blue-50/10' : ''
                }`}
              >
                {day ? (
                  <span
                    className={`text-[10px] font-bold ${
                      isToday
                        ? 'text-blue-600 dark:text-blue-400 font-extrabold'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {day}
                  </span>
                ) : (
                  <span />
                )}

                {/* Event Tags inside Day Cell */}
                <div className="space-y-1.5 mt-2 flex-1 overflow-y-auto max-h-[80px]">
                  {cellEvents.map((evt) => (
                    <div
                      key={evt.id}
                      onClick={() => evt.link !== '#' && router.push(evt.link)}
                      className={`text-[8px] font-bold px-1.5 py-0.5 rounded truncate select-none leading-normal transition-all flex items-center justify-between gap-1 ${getEventClass(
                        evt.type
                      )}`}
                      title={evt.label}
                    >
                      <span className="truncate">{evt.label}</span>
                      {evt.isCustom && (
                        <button
                          onClick={(e) => handleDeleteCustomEvent(evt.id, e)}
                          className="text-red-500 hover:text-red-700 font-black ml-1 cursor-pointer"
                          title="Hapus jadwal ini"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-6 border-t border-slate-100 dark:border-slate-800 pt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            Pembayaran
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            Maintenance / Keluhan
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
            Kontrak / Penyewa Baru
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Jadwal Umum / Agenda
          </span>
        </div>
      </div>

      {/* Modal Tambah Jadwal Baru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tambah Jadwal / Agenda Baru</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 rounded-xl text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAddEventSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Judul Kegiatan / Agenda *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Servis AC Kamar R03 / Kerja Bakti"
                  value={eventJudul}
                  onChange={(e) => setEventJudul(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal *
                  </label>
                  <input
                    type="date"
                    required
                    value={eventTanggal}
                    onChange={(e) => setEventTanggal(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kategori *
                  </label>
                  <select
                    value={eventTipe}
                    onChange={(e) => setEventTipe(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="pembayaran">Pembayaran</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="kontrak">Kontrak</option>
                    <option value="lainnya">Agenda Lainnya</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Deskripsi Catatan (Opsional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Catatan tambahan..."
                  value={eventDeskripsi}
                  onChange={(e) => setEventDeskripsi(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-500 disabled:opacity-50"
                >
                  {isPending ? 'Menyimpan...' : 'Simpan Jadwal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
