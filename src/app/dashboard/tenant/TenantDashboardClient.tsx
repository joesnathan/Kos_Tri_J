'use client';

import React, { useState, useTransition } from 'react';
import { uploadBuktiTransferAction } from '@/app/actions/tenant';
import { logoutAction } from '@/app/actions/auth';

interface TenantDashboardClientProps {
  user: {
    id: string;
    nama: string;
    email: string;
    role: string;
    nomorHp: string;
    kamarId: string | null;
  };
  initialInvoice: any;
  bankAccounts: any[];
}

export default function TenantDashboardClient({
  user,
  initialInvoice,
  bankAccounts,
}: TenantDashboardClientProps) {
  const [invoice, setInvoice] = useState(initialInvoice);

  const [isPending, startTransition] = useTransition();
  const [fotoResi, setFotoResi] = useState('');
  const [catatan, setCatatan] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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

    const tagihanId = invoice.id;
    const url = fotoResi;
    const notes = catatan;

    startTransition(async () => {
      const res = await uploadBuktiTransferAction(tagihanId, url, notes);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(res.message || 'Bukti transfer berhasil dikirim.');
        // Optimistically update invoice state
        setInvoice({
          ...invoice,
          status: 'MENUNGGU_VERIFIKASI',
          buktiTransfer: {
            fotoResi: url,
            catatan: notes,
            alasanDitolak: null,
            tanggalUpload: new Date().toISOString(),
          },
        });
        setFotoResi('');
        setCatatan('');
      }
    });
  };

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
    });
  };

  // Determine badge colors for invoice status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'LUNAS':
        return (
          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
            Lunas
          </span>
        );
      case 'MENUNGGU_VERIFIKASI':
        return (
          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
            Menunggu Verifikasi
          </span>
        );
      case 'DITOLAK':
        return (
          <span className="inline-flex items-center rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400 animate-pulse">
            Ditolak Pemilik
          </span>
        );
      case 'BELUM_BAYAR':
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-zinc-700/50 px-3 py-1 text-xs font-semibold text-zinc-300">
            Belum Bayar
          </span>
        );
    }
  };

  // Checking lock constraints: lock form if status is pending verification or already paid
  const isFormLocked = invoice?.status === 'MENUNGGU_VERIFIKASI' || invoice?.status === 'LUNAS';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* Top Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
            <h1 className="text-xl font-bold text-white tracking-wide">Tenant Dashboard</h1>
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
        {/* Alerts */}
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

        {/* User Info Profile Panel */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-sm">
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">{user.nama}</h2>
            <p className="text-xs text-zinc-400 mt-0.5">{user.email} • {user.nomorHp}</p>
          </div>
          <div className="flex gap-2">
            <span className="inline-flex items-center rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400">
              Role: TENANT (Penyewa)
            </span>
            <span className="inline-flex items-center rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300">
              Kamar: {user.kamarId ? `Room ID: ${user.kamarId.slice(0, 8)}...` : 'Belum Ditentukan'}
            </span>
          </div>
        </section>

        {/* Rejection Alert Banner */}
        {invoice?.status === 'DITOLAK' && invoice.buktiTransfer?.alasanDitolak && (
          <div className="rounded-2xl border border-red-900/30 bg-red-950/15 p-6 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex gap-3">
              <svg className="h-5 w-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h4 className="text-base font-bold text-white">Pembayaran Ditolak Pemilik</h4>
                <p className="mt-1 text-sm text-red-400">
                  Alasan penolakan: <span className="font-semibold text-zinc-200">"{invoice.buktiTransfer.alasanDitolak}"</span>
                </p>
                <p className="mt-2 text-xs text-zinc-400">
                  Silakan perbaiki data transfer Anda lalu unggah kembali resi baru menggunakan form di bawah.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Grid splits */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Main Invoice Section */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-lg font-bold text-white tracking-wide">Tagihan Bulan Ini</h2>

            {!invoice ? (
              <div className="rounded-2xl border border-zinc-900 bg-zinc-900/10 p-12 text-center">
                <p className="text-zinc-500">Selamat! Anda tidak memiliki tagihan aktif bulan ini.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-6 space-y-6">
                {/* Invoice summary info */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-black text-white">{formatCurrency(invoice.nominal)}</h3>
                    <p className="text-xs text-zinc-400 mt-1">Bulan tagihan: {invoice.bulanTagihan}</p>
                  </div>
                  <div>{getStatusBadge(invoice.status)}</div>
                </div>

                {/* Proof of Transfer display if uploaded */}
                {invoice.buktiTransfer && (
                  <div className="rounded-xl border border-zinc-850 bg-zinc-950 p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Resi yang diunggah sebelumnya
                    </h4>
                    <div className="text-sm truncate">
                      URL Resi:{' '}
                      <a
                        href={invoice.buktiTransfer.fotoResi}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 hover:underline"
                      >
                        {invoice.buktiTransfer.fotoResi}
                      </a>
                    </div>
                    {invoice.buktiTransfer.catatan && (
                      <p className="text-xs text-zinc-400">
                        Catatan Anda: <span className="italic">"{invoice.buktiTransfer.catatan}"</span>
                      </p>
                    )}
                    <p className="text-xs text-zinc-500">
                      Diunggah pada: {new Date(invoice.buktiTransfer.tanggalUpload).toLocaleString('id-ID')}
                    </p>
                  </div>
                )}

                {/* Upload Form */}
                {!isFormLocked && (
                  <form onSubmit={handleUploadSubmit} className="space-y-4 pt-4 border-t border-zinc-850">
                    <h4 className="text-sm font-bold text-white">Konfirmasi Pembayaran</h4>

                    <div>
                      <label htmlFor="fotoResi" className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                        URL Bukti Transfer (Screenshot Resi)
                      </label>
                      <input
                        id="fotoResi"
                        type="text"
                        required
                        value={fotoResi}
                        onChange={(e) => setFotoResi(e.target.value)}
                        className="mt-2 block w-full rounded-xl border border-zinc-850 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="https://example-storage.com/receipt.png"
                      />
                    </div>

                    <div>
                      <label htmlFor="catatan" className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                        Catatan Tambahan (Opsional)
                      </label>
                      <input
                        id="catatan"
                        type="text"
                        value={catatan}
                        onChange={(e) => setCatatan(e.target.value)}
                        className="mt-2 block w-full rounded-xl border border-zinc-850 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Contoh: Transfer via BCA atas nama Budi"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isPending}
                      className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:from-blue-500 hover:to-indigo-500 focus:outline-none disabled:opacity-50"
                    >
                      {isPending ? 'Mengirim...' : 'Kirim Bukti Pembayaran'}
                    </button>
                  </form>
                )}

                {invoice.status === 'MENUNGGU_VERIFIKASI' && (
                  <div className="rounded-xl border border-amber-900/30 bg-amber-950/10 p-4 text-sm text-amber-400 border-dashed text-center">
                    Tombol unggah dikunci karena bukti pembayaran Anda sedang dalam proses verifikasi oleh pemilik.
                  </div>
                )}

                {invoice.status === 'LUNAS' && (
                  <div className="rounded-xl border border-emerald-900/30 bg-emerald-950/10 p-4 text-sm text-emerald-400 text-center">
                    Tagihan Anda bulan ini sudah LUNAS terbayar. Terima kasih!
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar Owner Bank Accounts */}
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-white tracking-wide">Rekening Pembayaran</h2>

            {bankAccounts.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-6 text-center text-sm text-zinc-500">
                Belum ada rekening pembayaran yang didaftarkan pemilik kos.
              </div>
            ) : (
              <div className="space-y-4">
                {bankAccounts.map((bank) => (
                  <div
                    key={bank.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5 space-y-2 hover:border-zinc-700 transition-colors"
                  >
                    <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                      {bank.namaBank}
                    </p>
                    <h4 className="text-lg font-extrabold text-white tracking-wide select-all">
                      {bank.nomorRekening}
                    </h4>
                    <p className="text-xs text-zinc-400">
                      Atas Nama: <strong className="text-zinc-300">{bank.atasNama}</strong>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
