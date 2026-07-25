'use client';

import React, { useState, useTransition } from 'react';
import {
  createKontrakAction,
  extendKontrakAction,
  deleteKontrakAction,
} from '@/app/actions/owner';

interface KontrakClientProps {
  user: {
    nama: string;
    email: string;
  };
  initialTenants: any[];
  vacantRooms: any[];
  initialContracts: any[];
}

export default function KontrakClient({
  user,
  initialTenants,
  vacantRooms,
  initialContracts = [],
}: KontrakClientProps) {
  const [contracts, setContracts] = useState(initialContracts);
  const [activeTab, setActiveTab] = useState<'semua' | 'aktif' | 'hampir_habis' | 'riwayat'>('semua');
  const [searchQuery, setSearchQuery] = useState('');

  const [isPending, startTransition] = useTransition();
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal Create Contract state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [selectedKamarId, setSelectedKamarId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [durationMonths, setDurationMonths] = useState(12);
  const [fileUrlInput, setFileUrlInput] = useState('');
  const [catatanInput, setCatatanInput] = useState('');

  // Modal Preview Contract state
  const [previewContract, setPreviewContract] = useState<any | null>(null);

  // Modal Extend Contract state
  const [extendingContract, setExtendingContract] = useState<any | null>(null);
  const [extendMonthsInput, setExtendMonthsInput] = useState(6);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const formatDate = (dateInput: Date | string | null | undefined) => {
    if (!dateInput) return '-';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleCreateContractSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantId || !startDate || durationMonths <= 0) {
      setErrorMsg('Penyewa, tanggal mulai, dan durasi wajib diisi.');
      return;
    }

    setErrorMsg(null);
    startTransition(async () => {
      const res = await createKontrakAction(
        selectedTenantId,
        selectedKamarId,
        startDate,
        durationMonths,
        fileUrlInput.trim(),
        catatanInput.trim()
      );

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        triggerToast('Kontrak baru berhasil diterbitkan!');
        setIsCreateModalOpen(false);
        setSelectedTenantId('');
        setSelectedKamarId('');
        setFileUrlInput('');
        setCatatanInput('');

        // Optimistically add to UI list
        const tenant = initialTenants.find((t) => t.id === selectedTenantId);
        const start = new Date(startDate);
        const end = new Date(start);
        end.setMonth(end.getMonth() + Number(durationMonths));

        const newObj = {
          id: res.id || Math.random().toString(),
          nomorKontrak: `KTR/${new Date().getFullYear()}/00${contracts.length + 1}`,
          tenantId: selectedTenantId,
          tenant: tenant ? { nama: tenant.nama, email: tenant.email, nomorHp: tenant.nomorHp } : null,
          kamar: tenant?.kamar ? { nomorKamar: tenant.kamar.nomorKamar } : null,
          tanggalMulai: start,
          tanggalSelesai: end,
          durasiBulan: durationMonths,
          status: 'Aktif',
          fileUrl: fileUrlInput || null,
          catatan: catatanInput || null,
          createdAt: new Date(),
        };

        setContracts((prev) => [newObj, ...prev]);
      }
    });
  };

  const handleExtendSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendingContract || extendMonthsInput <= 0) return;

    setErrorMsg(null);
    startTransition(async () => {
      const res = await extendKontrakAction(extendingContract.id, extendMonthsInput);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        triggerToast(res.message || 'Kontrak berhasil diperpanjang!');
        setContracts((prev) =>
          prev.map((c) => {
            if (c.id === extendingContract.id) {
              const oldEnd = new Date(c.tanggalSelesai);
              oldEnd.setMonth(oldEnd.getMonth() + Number(extendMonthsInput));
              return {
                ...c,
                tanggalSelesai: oldEnd,
                durasiBulan: c.durasiBulan + Number(extendMonthsInput),
                status: 'Aktif',
              };
            }
            return c;
          })
        );
        setExtendingContract(null);
      }
    });
  };

  const handleDeleteContract = (id: string, nomor: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus dokumen kontrak ${nomor}?`)) return;

    startTransition(async () => {
      const res = await deleteKontrakAction(id);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        triggerToast(`Kontrak ${nomor} berhasil dihapus.`);
        setContracts((prev) => prev.filter((c) => c.id !== id));
      }
    });
  };

  const handleSendWhatsApp = (c: any) => {
    const phone = c.tenant?.nomorHp || '081234567890';
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.substring(1) : cleanPhone;
    const msg = `Halo Sdr/i ${c.tenant?.nama || 'Penyewa'}, berikut kami sampaikan rincian Dokumen Kontrak Sewa Anda di Kos Tri J (No. Kontrak: ${c.nomorKontrak}). Masa berlaku: ${formatDate(c.tanggalMulai)} s/d ${formatDate(c.tanggalSelesai)}. Terima kasih.`;
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handlePrintContractDocument = (c: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>SURAT PERJANJIAN KONTRAK SEWA - ${c.nomorKontrak}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: 'Times New Roman', Times, serif; color: #000; padding: 20px; line-height: 1.6; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px; }
    .header h2 { margin: 0; font-size: 18px; text-transform: uppercase; text-decoration: underline; }
    .header p { margin: 4px 0 0 0; font-size: 12px; }
    .content { font-size: 13px; text-align: justify; }
    .section-title { font-weight: bold; margin-top: 16px; margin-bottom: 6px; }
    .table-details { width: 100%; border-collapse: collapse; margin: 12px 0; }
    .table-details td { padding: 6px 0; font-size: 13px; }
    .footer-signatures { margin-top: 50px; display: flex; justify-content: space-between; }
    .signature-box { text-align: center; width: 200px; }
    .signature-space { height: 70px; }
  </style>
</head>
<body>
  <div class="header">
    <h2>SURAT PERJANJIAN KONTRAK SEWA HUNIAN KOS</h2>
    <p>Nomor Dokumen Resmi: <strong>${c.nomorKontrak}</strong></p>
  </div>

  <div class="content">
    <p>Pada hari ini, dibuat Surat Perjanjian Kontrak Sewa Hunian Kos Tri J antara pihak-pihak sebagai berikut:</p>

    <table class="table-details">
      <tr>
        <td style="width: 140px;"><strong>PIHAK PERTAMA</strong></td>
        <td style="width: 10px;">:</td>
        <td>Pengelola / Pemilik Kos Tri J</td>
      </tr>
      <tr>
        <td><strong>PIHAK KEDUA</strong></td>
        <td>:</td>
        <td><strong>${c.tenant?.nama || 'Penyewa'}</strong> (Email: ${c.tenant?.email || '-'}, HP: ${c.tenant?.nomorHp || '-'})</td>
      </tr>
      <tr>
        <td><strong>OBJEK SEWA</strong></td>
        <td>:</td>
        <td>Kamar Hunian Nomor <strong>${c.kamar?.nomorKamar || 'Kamar'}</strong> Kos Tri J</td>
      </tr>
      <tr>
        <td><strong>MASA KONTRAK</strong></td>
        <td>:</td>
        <td>${c.durasiBulan} Bulan (${formatDate(c.tanggalMulai)} s/d ${formatDate(c.tanggalSelesai)})</td>
      </tr>
    </table>

    <div class="section-title">PASAL 1: KETENTUAN HAK DAN KEWAJIBAN</div>
    <p>Pihak Kedua sepakat untuk menyewa fasilitas kamar kos dari Pihak Pertama sesuai jangka waktu di atas dan wajib membayar uang sewa bulanan tepat waktu sebelum tanggal jatuh tempo.</p>

    <div class="section-title">PASAL 2: TATA TERTIB HUNIAN</div>
    <p>Pihak Kedua wajib menjaga kebersihan, ketertiban, keutuhan fasilitas fasilitas kamar kos, serta mematuhi seluruh norma kesopanan dan tata tertib yang berlaku di Kos Tri J.</p>
  </div>

  <div class="footer-signatures">
    <div class="signature-box">
      <p>Pihak Kedua (Penyewa)</p>
      <div class="signature-space"></div>
      <p><strong>(${c.tenant?.nama || 'Penyewa'})</strong></p>
    </div>
    <div class="signature-box">
      <p>Pihak Pertama (Pemilik Kos)</p>
      <div class="signature-space"></div>
      <p><strong>(Pengelola Kos Tri J)</strong></p>
    </div>
  </div>

  <script>
    window.onload = () => window.print();
  </script>
</body>
</html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const filteredContracts = contracts.filter((c) => {
    if (activeTab === 'aktif') if (c.status !== 'Aktif') return false;
    if (activeTab === 'hampir_habis') if (c.status !== 'Hampir Habis') return false;
    if (activeTab === 'riwayat') if (c.status !== 'Selesai' && c.status !== 'Dibatalkan') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.nomorKontrak.toLowerCase().includes(q) ||
        (c.tenant?.nama && c.tenant.nama.toLowerCase().includes(q)) ||
        (c.kamar?.nomorKamar && c.kamar.nomorKamar.toLowerCase().includes(q))
      );
    }
    return true;
  });

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
          <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Dokumen Kontrak Sewa</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
            Kelola dokumen, pembuatan otomatis, perpanjangan, cetak, dan riwayat kontrak penyewa
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-500 active:scale-[0.98] transition-all cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Buat / Generate Kontrak
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 rounded-2xl text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit select-none">
          {(['semua', 'aktif', 'hampir_habis', 'riwayat'] as const).map((tab) => {
            const isActive = activeTab === tab;
            const labels = {
              semua: 'Semua Kontrak',
              aktif: 'Aktif',
              hampir_habis: 'Hampir Habis',
              riwayat: 'Riwayat Kontrak',
            };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Cari no. kontrak, penyewa, kamar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 shadow-sm"
          />
        </div>
      </div>

      {/* Grid Contract Cards */}
      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredContracts.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 font-medium text-xs">
            Belum ada dokumen kontrak yang sesuai.
          </div>
        ) : (
          filteredContracts.map((c) => {
            const isExpiringSoon = c.status === 'Hampir Habis';

            return (
              <div
                key={c.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-all space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                      {c.nomorKontrak}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                        isExpiringSoon
                          ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40'
                          : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2">
                    {c.tenant?.nama || 'Penyewa'}
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                    Kamar: <strong>{c.kamar?.nomorKamar || 'Kamar -'}</strong>
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Mulai</p>
                      <p className="font-semibold text-slate-700 dark:text-slate-300">{formatDate(c.tanggalMulai)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Berakhir</p>
                      <p className="font-semibold text-slate-700 dark:text-slate-300">{formatDate(c.tanggalSelesai)}</p>
                    </div>
                  </div>
                </div>

                {/* 100% Working Functional Buttons */}
                <div className="space-y-2 pt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPreviewContract(c)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] hover:bg-slate-100 text-center cursor-pointer"
                    >
                      👁️ Preview
                    </button>
                    <button
                      onClick={() => handlePrintContractDocument(c)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] hover:bg-slate-100 text-center cursor-pointer"
                    >
                      🖨️ Cetak
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleSendWhatsApp(c)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] text-center cursor-pointer shadow-xs"
                    >
                      💬 WhatsApp
                    </button>
                    <button
                      onClick={() => setExtendingContract(c)}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] text-center cursor-pointer shadow-xs"
                    >
                      🔄 Perpanjang
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {c.fileUrl ? (
                      <a
                        href={c.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                      >
                        📥 Unduh Berkas Doc/PDF
                      </a>
                    ) : (
                      <button
                        onClick={() => handlePrintContractDocument(c)}
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        📥 Unduh PDF Kontrak
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteContract(c.id, c.nomorKontrak)}
                      className="text-[11px] font-bold text-red-500 hover:text-red-700 cursor-pointer"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* MODAL: Buat / Generate Kontrak */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Generate Dokumen Kontrak Sewa</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateContractSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Pilih Penyewa *</label>
                <select
                  required
                  value={selectedTenantId}
                  onChange={(e) => {
                    setSelectedTenantId(e.target.value);
                    const t = initialTenants.find((item) => item.id === e.target.value);
                    if (t && t.kamarId) setSelectedKamarId(t.kamarId);
                  }}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">-- Pilih Penyewa --</option>
                  {initialTenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nama} ({t.kamar?.nomorKamar ? `Kamar ${t.kamar.nomorKamar}` : 'Tanpa Kamar'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tanggal Mulai *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Durasi Kontrak *</label>
                  <select
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value={1}>1 Bulan</option>
                    <option value={3}>3 Bulan</option>
                    <option value={6}>6 Bulan</option>
                    <option value={12}>12 Bulan (1 Tahun)</option>
                    <option value={24}>24 Bulan (2 Tahun)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tautan Berkas Kontrak Doc/PDF (Opsional)</label>
                <input
                  type="text"
                  placeholder="https://... / URL Dokumen"
                  value={fileUrlInput}
                  onChange={(e) => setFileUrlInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Catatan Tambahan (Opsional)</label>
                <textarea
                  rows={2}
                  placeholder="Catatan pasal / deposit..."
                  value={catatanInput}
                  onChange={(e) => setCatatanInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-500 disabled:opacity-50"
                >
                  {isPending ? 'Generating...' : 'Generate Kontrak'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Perpanjang Kontrak */}
      {extendingContract && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Perpanjang Masa Kontrak</h3>
              <button onClick={() => setExtendingContract(null)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleExtendSubmit} className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Perpanjang durasi sewa untuk <strong>{extendingContract.tenant?.nama}</strong> (Kamar {extendingContract.kamar?.nomorKamar || '-'}).
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tambah Durasi (Bulan) *</label>
                <select
                  value={extendMonthsInput}
                  onChange={(e) => setExtendMonthsInput(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value={1}>1 Bulan</option>
                  <option value={3}>3 Bulan</option>
                  <option value={6}>6 Bulan</option>
                  <option value={12}>12 Bulan (1 Tahun)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setExtendingContract(null)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-500 disabled:opacity-50"
                >
                  {isPending ? 'Memproses...' : 'Simpan Perpanjangan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Preview Kontrak */}
      {previewContract && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Pratinjau Dokumen Kontrak</h3>
                <p className="text-[10px] text-blue-600 font-bold">{previewContract.nomorKontrak}</p>
              </div>
              <button onClick={() => setPreviewContract(null)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              <p><strong>Penyewa:</strong> {previewContract.tenant?.nama || '-'}</p>
              <p><strong>Email:</strong> {previewContract.tenant?.email || '-'}</p>
              <p><strong>Nomor HP:</strong> {previewContract.tenant?.nomorHp || '-'}</p>
              <p><strong>Kamar:</strong> {previewContract.kamar?.nomorKamar || '-'}</p>
              <p><strong>Periode Sewa:</strong> {formatDate(previewContract.tanggalMulai)} s/d {formatDate(previewContract.tanggalSelesai)} ({previewContract.durasiBulan} Bulan)</p>
              <p><strong>Status:</strong> <span className="font-bold text-emerald-600">{previewContract.status}</span></p>
              {previewContract.catatan && <p><strong>Catatan:</strong> {previewContract.catatan}</p>}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => handlePrintContractDocument(previewContract)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
              >
                🖨️ Cetak Dokumen Sah
              </button>
              <button
                onClick={() => setPreviewContract(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
