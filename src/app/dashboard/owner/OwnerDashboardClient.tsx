'use client';

import React, { useState, useTransition } from 'react';
import { approveInvoiceAction, rejectInvoiceAction } from '@/app/actions/owner';
import { logoutAction } from '@/app/actions/auth';

interface OwnerDashboardClientProps {
  user: {
    id: string;
    nama: string;
    email: string;
    role: string;
  };
  initialInvoices: any[];
  initialRevenue: number;
  initialMonthlyRevenue: any[];
}

export default function OwnerDashboardClient({
  user,
  initialInvoices,
  initialRevenue,
  initialMonthlyRevenue,
}: OwnerDashboardClientProps) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [totalRevenue, setTotalRevenue] = useState(initialRevenue);
  const [monthlyRevenue, setMonthlyRevenue] = useState(initialMonthlyRevenue);

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Rejection modal state
  const [activeRejectId, setActiveRejectId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  const handleApprove = (tagihanId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await approveInvoiceAction(tagihanId);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(res.message || 'Pembayaran disetujui.');
        // Optimistically update lists locally
        setInvoices(invoices.filter((inv) => inv.id !== tagihanId));
        // Recalculate basic totals
        const approvedInv = invoices.find((inv) => inv.id === tagihanId);
        if (approvedInv) {
          setTotalRevenue((prev) => prev + approvedInv.nominal);
          // Update monthly grouping
          const month = approvedInv.bulanTagihan;
          setMonthlyRevenue((prev) => {
            const exists = prev.find((m) => m.bulanTagihan === month);
            if (exists) {
              return prev.map((m) =>
                m.bulanTagihan === month
                  ? { ...m, total: m.total + approvedInv.nominal, count: m.count + 1 }
                  : m
              );
            } else {
              return [...prev, { bulanTagihan: month, total: approvedInv.nominal, count: 1 }].sort(
                (a, b) => a.bulanTagihan.localeCompare(b.bulanTagihan)
              );
            }
          });
        }
      }
    });
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRejectId || !rejectionReason.trim()) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    const tagihanId = activeRejectId;
    const reason = rejectionReason;

    startTransition(async () => {
      const res = await rejectInvoiceAction(tagihanId, reason);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(res.message || 'Pembayaran ditolak.');
        setInvoices(invoices.filter((inv) => inv.id !== tagihanId));
        setActiveRejectId(null);
        setRejectionReason('');
      }
    });
  };

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* Top Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-indigo-500 animate-pulse" />
            <h1 className="text-xl font-bold text-white tracking-wide">Owner Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-400 hidden sm:inline">
              Halo, <strong className="text-zinc-200">{user.nama}</strong>
            </span>
            <button
              onClick={handleLogout}
              className="rounded-lg bg-zinc-800 hover:bg-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-200 transition-colors"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Status Alerts */}
        {errorMsg && (
          <div className="rounded-xl border border-red-900/30 bg-red-950/20 p-4 text-sm text-red-400">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="rounded-xl border border-emerald-900/30 bg-emerald-950/20 p-4 text-sm text-emerald-400">
            {successMsg}
          </div>
        )}

        {/* Top Summary Cards */}
        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 shadow-lg backdrop-blur-sm">
            <p className="text-sm font-medium text-zinc-400">Total Pendapatan Kos</p>
            <h3 className="mt-2 text-3xl font-extrabold text-white tracking-tight">
              {formatCurrency(totalRevenue)}
            </h3>
            <p className="mt-1 text-xs text-indigo-400">Terakumulasi dari tagihan LUNAS</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 shadow-lg backdrop-blur-sm">
            <p className="text-sm font-medium text-zinc-400">Menunggu Verifikasi</p>
            <h3 className="mt-2 text-3xl font-extrabold text-amber-500 tracking-tight">
              {invoices.length} <span className="text-sm font-normal text-zinc-400">Tagihan</span>
            </h3>
            <p className="mt-1 text-xs text-zinc-400">Perlu pemeriksaan bukti transfer</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 shadow-lg backdrop-blur-sm sm:col-span-2 lg:col-span-1">
            <p className="text-sm font-medium text-zinc-400">Akun Pengelola</p>
            <h3 className="mt-2 text-xl font-bold text-zinc-200 truncate">{user.email}</h3>
            <span className="mt-2 inline-flex items-center rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-400">
              Role: OWNER
            </span>
          </div>
        </section>

        {/* Content Tabs / Split view */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Main Actions: Pending Verifications */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white tracking-wide">Pemeriksaan Pembayaran</h2>
              <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-400">
                {invoices.length} Baru
              </span>
            </div>

            {invoices.length === 0 ? (
              <div className="rounded-2xl border border-zinc-900 bg-zinc-900/10 p-12 text-center">
                <p className="text-zinc-500">Tidak ada bukti transfer yang perlu diverifikasi saat ini.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {invoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-6 hover:border-zinc-700 transition-all flex flex-col md:flex-row justify-between gap-6"
                  >
                    <div className="space-y-3">
                      <div>
                        <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-400">
                          {inv.bulanTagihan}
                        </span>
                        <h4 className="mt-1 text-base font-bold text-white">{inv.user.nama}</h4>
                        <p className="text-xs text-zinc-400">{inv.user.email} • {inv.user.nomorHp}</p>
                      </div>

                      <div className="text-sm font-semibold text-zinc-300">
                        Nominal: <span className="text-indigo-400">{formatCurrency(inv.nominal)}</span>
                      </div>

                      {inv.buktiTransfer?.catatan && (
                        <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800/50">
                          <p className="text-xs text-zinc-400">
                            Catatan tenant: <span className="text-zinc-300 italic">"{inv.buktiTransfer.catatan}"</span>
                          </p>
                        </div>
                      )}

                      <div className="text-xs text-zinc-500">
                        Diunggah pada: {new Date(inv.buktiTransfer.tanggalUpload).toLocaleString('id-ID')}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row md:flex-col justify-end items-stretch md:items-end gap-3 min-w-[200px]">
                      {/* Receipt Link Button */}
                      <a
                        href={inv.buktiTransfer.fotoResi}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-950 py-2.5 px-4 text-xs font-semibold text-center text-zinc-300 transition-colors"
                      >
                        Lihat Gambar Resi
                      </a>

                      <div className="grid grid-cols-2 gap-2 w-full">
                        <button
                          onClick={() => handleApprove(inv.id)}
                          disabled={isPending}
                          className="rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-semibold text-white transition-colors disabled:opacity-50"
                        >
                          Setuju
                        </button>
                        <button
                          onClick={() => setActiveRejectId(inv.id)}
                          disabled={isPending}
                          className="rounded-xl bg-red-960 hover:bg-red-800 border border-red-900/30 py-2.5 text-xs font-semibold text-red-300 transition-colors disabled:opacity-50"
                        >
                          Tolak
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar: Monthly Revenue Aggregation */}
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-white tracking-wide">Laporan Bulanan</h2>

            {monthlyRevenue.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-6 text-center text-sm text-zinc-500">
                Belum ada data pendapatan bulanan.
              </div>
            ) : (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden divide-y divide-zinc-800">
                {monthlyRevenue.map((m, idx) => (
                  <div key={idx} className="p-4 flex items-center justify-between hover:bg-zinc-900/10 transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-white">{m.bulanTagihan}</p>
                      <p className="text-xs text-zinc-500">{m.count} transaksi lunas</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-indigo-400">{formatCurrency(m.total)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Custom Rejection Dialog Modal Backdrop */}
      {activeRejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl animate-in fade-in-50 zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white">Tolak Bukti Transfer</h3>
            <p className="mt-1 text-sm text-zinc-400">
              Harap berikan alasan penolakan agar penyewa dapat melihat kesalahan dan mengunggah kembali.
            </p>

            <form onSubmit={handleRejectSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="reason" className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Alasan Penolakan
                </label>
                <textarea
                  id="reason"
                  rows={4}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="mt-2 block w-full rounded-xl border border-zinc-850 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  placeholder="Contoh: Nominal transfer kurang dari tagihan, atau gambar resi buram."
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setActiveRejectId(null);
                    setRejectionReason('');
                  }}
                  className="rounded-xl border border-zinc-800 hover:border-zinc-700 bg-transparent py-2.5 px-4 text-xs font-semibold text-zinc-300 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-red-600 hover:bg-red-500 py-2.5 px-4 text-xs font-semibold text-white transition-colors disabled:opacity-50"
                >
                  Submit Tolak
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
