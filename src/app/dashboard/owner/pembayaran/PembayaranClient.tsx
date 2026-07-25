'use client';

import React, { useState, useTransition } from 'react';
import { approveInvoiceAction, rejectInvoiceAction, createInvoiceAction } from '@/app/actions/owner';

interface PembayaranClientProps {
  user: {
    id: string;
    nama: string;
    email: string;
  };
  allInvoices: any[];
  tenants: any[];
}

export default function PembayaranClient({ user, allInvoices, tenants }: PembayaranClientProps) {
  const [invoices, setInvoices] = useState(allInvoices);
  const [activeTab, setActiveTab] = useState<'Menunggu' | 'Terverifikasi' | 'Terlambat'>('Menunggu');

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal reason state for rejection
  const [activeRejectId, setActiveRejectId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);

  // Manual invoice generation states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [invoiceUserId, setInvoiceUserId] = useState('');
  const [invoiceNominal, setInvoiceNominal] = useState(1500000);
  const [invoiceMonth, setInvoiceMonth] = useState('Juli 2025');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  // Calculations for summary cards
  const totalTagihanAmount = invoices.reduce((acc, inv) => acc + inv.nominal, 0);
  const lunasCount = invoices.filter((inv) => inv.status === 'LUNAS').length;
  const menungguCount = invoices.filter((inv) => inv.status === 'MENUNGGU_VERIFIKASI').length;
  const terlambatCount = invoices.filter((inv) => inv.status === 'BELUM_BAYAR' || inv.status === 'DITOLAK').length;

  // Invoice Number helper
  const getInvoiceNumber = (inv: any, idx: number) => {
    const defaultInvoices = ['INV-001', 'INV-002', 'INV-003', 'INV-004', 'INV-005', 'INV-006'];
    return defaultInvoices[idx % 6] || `INV-0${idx + 1}`;
  };

  // Payment Method helper
  const getPaymentMethod = (inv: any, idx: number) => {
    if (inv.status === 'BELUM_BAYAR') return '-';
    const methods = ['QRIS', 'Transfer', 'QRIS', 'Cash', 'VA'];
    return methods[idx % 5] || 'Transfer';
  };

  // Action Handlers
  const handleApprove = (tagihanId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await approveInvoiceAction(tagihanId);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(res.message || 'Invoice berhasil disetujui.');
        setInvoices((prev) =>
          prev.map((inv) => (inv.id === tagihanId ? { ...inv, status: 'LUNAS' } : inv))
        );
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
        setInvoices((prev) =>
          prev.map((inv) => (inv.id === tagihanId ? { ...inv, status: 'DITOLAK' } : inv))
        );
        setActiveRejectId(null);
        setRejectionReason('');
      }
    });
  };

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceUserId || invoiceNominal <= 0 || !invoiceMonth.trim()) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await createInvoiceAction(invoiceUserId, invoiceNominal, invoiceMonth.trim());
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(res.message || 'Invoice baru berhasil dibuat.');
        const targetTenant = tenants.find((t) => t.id === invoiceUserId);
        const newInvoiceObj = {
          id: Math.random().toString(),
          nominal: invoiceNominal,
          bulanTagihan: invoiceMonth,
          status: 'BELUM_BAYAR',
          user: targetTenant
            ? {
                id: targetTenant.id,
                nama: targetTenant.nama,
                email: targetTenant.email,
                nomorHp: targetTenant.nomorHp,
                kamar: targetTenant.kamar,
              }
            : null,
          createdAt: new Date(),
        };
        setInvoices((prev) => [newInvoiceObj, ...prev]);
        setIsCreateModalOpen(false);
        setInvoiceUserId('');
        setInvoiceNominal(1500000);
        setInvoiceMonth('Juli 2025');
      }
    });
  };

  // Filtered invoices for display
  const displayedInvoices = invoices.filter((inv) => {
    if (activeTab === 'Menunggu') return inv.status === 'MENUNGGU_VERIFIKASI';
    if (activeTab === 'Terverifikasi') return inv.status === 'LUNAS';
    if (activeTab === 'Terlambat') return inv.status === 'BELUM_BAYAR' || inv.status === 'DITOLAK';
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Pembayaran</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">Kelola pembayaran sewa penyewa</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-500 active:scale-[0.98] transition-all cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Buat Invoice
        </button>
      </div>

      {/* Alert Boxes */}
      {errorMsg && (
        <div className="rounded-xl border border-red-205 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-4 text-xs font-semibold text-red-600 dark:text-red-400">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 p-4 text-xs font-semibold text-emerald-600 dark:text-emerald-455">
          {successMsg}
        </div>
      )}

      {/* Summary Cards Grid */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Total Tagihan */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-550 uppercase">Total Tagihan</span>
          <h4 className="text-xl font-black text-slate-900 dark:text-white mt-2">
            {totalTagihanAmount > 1000000
              ? `Rp ${(totalTagihanAmount / 1000000).toFixed(1)}jt`
              : formatCurrency(totalTagihanAmount)}
          </h4>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium">Bulan ini</p>
        </div>

        {/* Lunas */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-550 uppercase">Lunas Invoice</span>
          <h4 className="text-xl font-bold text-slate-900 dark:text-white mt-2">{lunasCount}</h4>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-bold">Terverifikasi</p>
        </div>

        {/* Menunggu */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-550 uppercase">Menunggu</span>
          <h4 className="text-xl font-bold text-slate-900 dark:text-white mt-2">{menungguCount}</h4>
          <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-bold">Perlu verifikasi</p>
        </div>

        {/* Terlambat */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-550 uppercase">Terlambat</span>
          <h4 className="text-xl font-bold text-slate-900 dark:text-white mt-2">{terlambatCount}</h4>
          <p className="text-[10px] text-red-600 dark:text-red-400 mt-1 font-bold">Butuh tindakan</p>
        </div>
      </section>

      {/* Tabs Filter */}
      <div className="flex items-center gap-1.5 select-none bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
        {(['Menunggu', 'Terverifikasi', 'Terlambat'] as const).map((tab) => {
          const isActive = activeTab === tab;
          const badgeCount =
            tab === 'Menunggu' ? menungguCount : tab === 'Terlambat' ? terlambatCount : lunasCount;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>{tab}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                    : 'bg-slate-200/60 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                }`}
              >
                {badgeCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Invoice Table Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">Invoice</th>
                <th className="px-6 py-4">Penyewa</th>
                <th className="px-6 py-4">Kamar</th>
                <th className="px-6 py-4">Bulan</th>
                <th className="px-6 py-4">Nominal</th>
                <th className="px-6 py-4">Metode</th>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
              {displayedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400 dark:text-slate-550 font-medium">
                    Tidak ada antrean invoice dalam kategori ini.
                  </td>
                </tr>
              ) : (
                displayedInvoices.map((inv, idx) => {
                  const invoiceNo = inv.nomorInvoice || `INV/${new Date(inv.createdAt).getFullYear()}/${String(inv.createdAt).substring(5, 7) || '07'}/${String(idx + 1).padStart(4, '0')}`;
                  const method = inv.metodePembayaran || (inv.status === 'BELUM_BAYAR' ? '-' : 'Transfer Bank');
                  const date = inv.buktiTransfer?.tanggalUpload
                    ? new Date(inv.buktiTransfer.tanggalUpload).toISOString().split('T')[0]
                    : new Date(inv.createdAt).toISOString().split('T')[0];

                  const roomLabel = inv.user?.kamar?.nomorKamar
                    ? inv.user.kamar.nomorKamar.replace('Kamar ', 'R')
                    : '-';

                  return (
                    <tr
                      key={inv.id || idx}
                      className="hover:bg-slate-50/30 dark:hover:bg-slate-850/20 border-slate-100 dark:border-slate-800 transition-colors"
                    >
                      {/* Invoice Link */}
                      <td className="px-6 py-4.5 font-bold text-blue-600 dark:text-blue-400">
                        <a href={`/api/invoice/download/${inv.id}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {invoiceNo}
                        </a>
                      </td>

                      {/* Tenant name */}
                      <td className="px-6 py-4.5 font-bold text-slate-800 dark:text-white">
                        {inv.user?.nama || 'Penyewa'}
                      </td>

                      {/* Room */}
                      <td className="px-6 py-4.5 font-bold text-slate-700 dark:text-slate-300">{roomLabel}</td>

                      {/* Month */}
                      <td className="px-6 py-4.5 text-slate-500 dark:text-slate-400 font-medium">{inv.bulanTagihan}</td>

                      {/* Nominal */}
                      <td className="px-6 py-4.5 font-bold text-slate-800 dark:text-white">{formatCurrency(inv.nominal)}</td>

                      {/* Method */}
                      <td className="px-6 py-4.5 text-slate-500 dark:text-slate-400 font-medium">{method}</td>

                      {/* Date */}
                      <td className="px-6 py-4.5 text-slate-500 dark:text-slate-400 font-medium">{date}</td>

                      {/* Status */}
                      <td className="px-6 py-4.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            inv.status === 'LUNAS'
                              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40'
                              : inv.status === 'MENUNGGU_VERIFIKASI'
                              ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40'
                              : 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/40'
                          }`}
                        >
                          {inv.status === 'MENUNGGU_VERIFIKASI'
                            ? 'Menunggu Verifikasi'
                            : inv.status === 'LUNAS'
                            ? 'Lunas'
                            : 'Belum Bayar'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4.5">
                        <div className="flex items-center justify-center gap-2">
                          {inv.status !== 'LUNAS' && (
                            <>
                              {inv.status === 'MENUNGGU_VERIFIKASI' ? (
                                <>
                                  <button
                                    onClick={() => handleApprove(inv.id)}
                                    disabled={isPending}
                                    title="Setujui Pembayaran"
                                    className="p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors disabled:opacity-50 cursor-pointer"
                                  >
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  </button>

                                  <button
                                    onClick={() => setActiveRejectId(inv.id)}
                                    disabled={isPending}
                                    title="Tolak Bukti"
                                    className="p-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-50 cursor-pointer"
                                  >
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>

                                  {inv.buktiTransfer?.fotoResi && (
                                    <button
                                      onClick={() => setSelectedReceiptUrl(inv.buktiTransfer.fotoResi)}
                                      title="Lihat Resi"
                                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    >
                                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                      </svg>
                                    </button>
                                  )}
                                </>
                              ) : (
                                <button
                                  onClick={() => handleApprove(inv.id)}
                                  disabled={isPending}
                                  title="Tandai Lunas Manual (Tunai / Direct)"
                                  className="px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white text-[10px] font-bold flex items-center gap-1 transition-all disabled:opacity-50 cursor-pointer"
                                >
                                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                  Tandai Lunas
                                </button>
                              )}
                            </>
                          )}

                          {/* Print Invoice PDF button */}
                          <a
                            href={`/api/invoice/download/${inv.id}?print=1`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Cetak Invoice PDF"
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                          </a>

                          {/* Download Invoice PDF button */}
                          <a
                            href={`/api/invoice/download/${inv.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Unduh Invoice PDF"
                            className="p-1.5 rounded-lg border border-blue-200 dark:border-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </a>
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

      {/* Image zoom popup */}
      {selectedReceiptUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="relative max-w-2xl w-full bg-white dark:bg-slate-900 rounded-2xl p-4 flex flex-col items-center border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setSelectedReceiptUrl(null)}
              className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center font-bold hover:bg-slate-800 dark:hover:bg-slate-750 cursor-pointer"
            >
              ✕
            </button>
            <img
              src={selectedReceiptUrl}
              alt="Bukti Transfer Resi"
              className="max-h-[70vh] rounded-xl object-contain w-full mt-2"
            />
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {activeRejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Tolak Bukti Transfer</h3>
              <button
                onClick={() => setActiveRejectId(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 cursor-pointer"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="reason"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider"
                >
                  Alasan Penolakan
                </label>
                <textarea
                  id="reason"
                  rows={4}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-3.5 py-2.5 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-905 focus:ring-2 focus:ring-blue-500/10 font-medium"
                  placeholder="Contoh: Bukti transfer tidak terbaca / nominal kurang."
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setActiveRejectId(null)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-red-500 disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? 'Menolak...' : 'Tolak Pembayaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Invoice Creation Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Buat Invoice Baru</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                  Pilih Penyewa / Tenant
                </label>
                <select
                  required
                  value={invoiceUserId}
                  onChange={(e) => setInvoiceUserId(e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-3.5 py-2.5 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 font-bold"
                >
                  <option value="" className="dark:bg-slate-900">-- Pilih Penyewa --</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id} className="dark:bg-slate-900">
                      {t.nama} {t.kamar ? `(${t.kamar.nomorKamar})` : '(Tanpa Kamar)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                  Nominal Tagihan (Rp)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={invoiceNominal}
                  onChange={(e) => setInvoiceNominal(parseInt(e.target.value) || 0)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                  Bulan Tagihan / Periode
                </label>
                <input
                  type="text"
                  required
                  value={invoiceMonth}
                  onChange={(e) => setInvoiceMonth(e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900"
                  placeholder="Contoh: Juli 2025"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-500 disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? 'Membuat...' : 'Buat Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
