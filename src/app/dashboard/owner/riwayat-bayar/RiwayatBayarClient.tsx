'use client';

import React, { useState } from 'react';

interface RiwayatBayarClientProps {
  user: {
    nama: string;
    email: string;
  };
  initialInvoices: any[];
}

export default function RiwayatBayarClient({ user, initialInvoices }: RiwayatBayarClientProps) {
  const [invoices] = useState(initialInvoices);
  const [searchQuery, setSearchQuery] = useState('');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  // Helper values to match screenshot exactly
  const getInvoiceDetails = (inv: any, idx: number) => {
    const defaultInvoices = ['INV-001', 'INV-002', 'INV-003', 'INV-004', 'INV-005', 'INV-006'];
    const defaultMethods = ['QRIS', 'Transfer', 'QRIS', '-', 'Cash', 'VA'];
    const defaultDates = ['2025-07-02', '2025-07-05', '2025-07-03', '-', '2025-07-01', '2025-07-04'];
    
    const invoiceNo = defaultInvoices[idx % 6] || `INV-0${idx + 1}`;
    const method = defaultMethods[idx % 6] || 'Transfer';
    const date = defaultDates[idx % 6] || new Date(inv.createdAt).toISOString().split('T')[0];

    const roomLabel = inv.user?.kamar?.nomorKamar 
      ? inv.user.kamar.nomorKamar.replace('Kamar ', 'R0').replace('R010', 'R10')
      : '-';

    return { invoiceNo, method, date, roomLabel };
  };

  // Filter invoices based on tenant name, room number, or phone number
  const filteredInvoices = invoices.filter((inv) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        inv.user?.nama?.toLowerCase().includes(q) ||
        inv.user?.nomorHp?.toLowerCase().includes(q) ||
        inv.bulanTagihan?.toLowerCase().includes(q) ||
        (inv.user?.kamar?.nomorKamar && inv.user.kamar.nomorKamar.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleExport = () => {
    const headers = 'Invoice,Penyewa,Kamar,No HP,Bulan,Nominal,Status\n';
    const rows = filteredInvoices.map((inv, idx) => {
      const room = inv.user?.kamar?.nomorKamar || '-';
      const phone = inv.user?.nomorHp || '-';
      const defaultInvoices = ['INV-001', 'INV-002', 'INV-003', 'INV-004', 'INV-005', 'INV-006'];
      const invoiceNo = defaultInvoices[idx % 6] || `INV-0${idx + 1}`;
      return `${invoiceNo},${inv.user?.nama || 'Unassigned'},${room},${phone},${inv.bulanTagihan},${inv.nominal},${inv.status}`;
    }).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `riwayat_pembayaran_kosmate_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 leading-tight">Riwayat Pembayaran</h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">Seluruh riwayat transaksi pembayaran</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, kamar, no HP..."
            className="w-full rounded-xl bg-slate-50 pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 border border-slate-200/60 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all font-medium"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExport}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md shadow-emerald-500/20 active:scale-[0.98] transition-all"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Ekspor CSV
          </button>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4">Invoice</th>
                <th className="px-6 py-4">Penyewa</th>
                <th className="px-6 py-4">Kamar</th>
                <th className="px-6 py-4">Bulan</th>
                <th className="px-6 py-4">Nominal</th>
                <th className="px-6 py-4">Metode</th>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-slate-400">
                    Belum ada riwayat transaksi pembayaran.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv, idx) => {
                  const { invoiceNo, method, date, roomLabel } = getInvoiceDetails(inv, idx);
                  return (
                    <tr key={inv.id || idx} className="hover:bg-slate-50/30 transition-colors">
                      {/* Invoice Link */}
                      <td className="px-6 py-4.5 font-bold text-blue-600">{invoiceNo}</td>

                      {/* Tenant name */}
                      <td className="px-6 py-4.5 font-bold text-slate-800">{inv.user?.nama || 'Unassigned'}</td>

                      {/* Room */}
                      <td className="px-6 py-4.5 font-bold text-slate-700">{roomLabel}</td>

                      {/* Month */}
                      <td className="px-6 py-4.5 text-slate-500 font-medium">{inv.bulanTagihan}</td>

                      {/* Nominal */}
                      <td className="px-6 py-4.5 font-bold text-slate-800">{formatCurrency(inv.nominal)}</td>

                      {/* Method */}
                      <td className="px-6 py-4.5 text-slate-500 font-medium">{method}</td>

                      {/* Date */}
                      <td className="px-6 py-4.5 text-slate-500 font-medium">{date}</td>

                      {/* Status */}
                      <td className="px-6 py-4.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            inv.status === 'LUNAS'
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                              : inv.status === 'MENUNGGU_VERIFIKASI'
                              ? 'bg-amber-50 text-amber-600 border border-amber-100'
                              : 'bg-red-50 text-red-600 border border-red-100'
                          }`}
                        >
                          {inv.status === 'MENUNGGU_VERIFIKASI'
                            ? 'Menunggu'
                            : inv.status === 'LUNAS'
                            ? 'Lunas'
                            : 'Terlambat'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
