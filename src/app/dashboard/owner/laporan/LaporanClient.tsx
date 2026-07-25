'use client';

import React, { useState } from 'react';

interface LaporanClientProps {
  user: {
    nama: string;
    email: string;
  };
  initialRevenue: number;
  initialExpense: number;
  initialPiutang: number;
  initialUnpaidCount: number;
  initialMonthlyRevenue: any[];
  rawLunas: Array<{ nominal: number; updatedAt: string }>;
  rawPiutang: Array<{ nominal: number; createdAt: string }>;
  rawExpense: Array<{ nominal: number; tanggal: string }>;
}

export default function LaporanClient({
  user,
  initialRevenue,
  initialExpense,
  initialPiutang,
  initialUnpaidCount,
  initialMonthlyRevenue,
  rawLunas = [],
  rawPiutang = [],
  rawExpense = [],
}: LaporanClientProps) {
  const [activeTab, setActiveTab] = useState<'Harian' | 'Mingguan' | 'Bulanan' | 'Tahunan'>('Bulanan');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  const reports = {
    totalRevenue: initialRevenue,
    totalExpense: initialExpense,
    netProfit: Math.max(initialRevenue - initialExpense, 0),
    piutang: initialPiutang,
    unpaidCount: initialUnpaidCount,
  };

  // Dynamic Chart calculations based on activeTab
  const getChartData = () => {
    const lunas = rawLunas.map(d => ({ nominal: d.nominal, date: new Date(d.updatedAt) }));
    const piutang = rawPiutang.map(d => ({ nominal: d.nominal, date: new Date(d.createdAt) }));
    const expense = rawExpense.map(d => ({ nominal: d.nominal, date: new Date(d.tanggal) }));

    const now = new Date();
    let intervals: Array<{ start: Date; end: Date; label: string }> = [];

    if (activeTab === 'Harian') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
        const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
        const label = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        intervals.push({ start, end, label });
      }
    } else if (activeTab === 'Mingguan') {
      for (let i = 3; i >= 0; i--) {
        const dEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7);
        const dStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (i + 1) * 7 + 1);
        const start = new Date(dStart.getFullYear(), dStart.getMonth(), dStart.getDate(), 0, 0, 0);
        const end = new Date(dEnd.getFullYear(), dEnd.getMonth(), dEnd.getDate(), 23, 59, 59);
        const label = `Minggu ${4 - i}`;
        intervals.push({ start, end, label });
      }
    } else if (activeTab === 'Bulanan') {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
        const label = d.toLocaleDateString('id-ID', { month: 'short' });
        intervals.push({ start, end, label });
      }
    } else {
      for (let i = 2; i >= 0; i--) {
        const year = now.getFullYear() - i;
        const start = new Date(year, 0, 1, 0, 0, 0);
        const end = new Date(year, 11, 31, 23, 59, 59);
        const label = `${year}`;
        intervals.push({ start, end, label });
      }
    }

    return intervals.map(interval => {
      const sumLunas = lunas
        .filter(item => item.date >= interval.start && item.date <= interval.end)
        .reduce((sum, item) => sum + item.nominal, 0);

      const sumExpense = expense
        .filter(item => item.date >= interval.start && item.date <= interval.end)
        .reduce((sum, item) => sum + item.nominal, 0);

      const sumPiutang = piutang
        .filter(item => item.date >= interval.start && item.date <= interval.end)
        .reduce((sum, item) => sum + item.nominal, 0);

      const netProfit = Math.max(sumLunas - sumExpense, 0);

      return {
        label: interval.label,
        pendapatan: sumLunas,
        pengeluaran: sumExpense,
        netProfit,
        piutang: sumPiutang
      };
    });
  };

  const chartData = getChartData();

  const getMaxVal = (field: 'pendapatan' | 'pengeluaran' | 'netProfit' | 'piutang') => {
    return Math.max(...chartData.map(d => d[field]), 1);
  };

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Periode,Pendapatan,Pengeluaran,Net Profit,Piutang\n';
    
    chartData.forEach((row) => {
      csvContent += `"${row.label}",${row.pendapatan},${row.pengeluaran},${row.netProfit},${row.piutang}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `laporan_keuangan_kos_${activeTab.toLowerCase()}_${new Date().getFullYear()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const getProfitMargin = () => {
    if (reports.totalRevenue === 0) return '0%';
    const margin = (reports.netProfit / reports.totalRevenue) * 100;
    return `${margin.toFixed(1)}%`;
  };

  const currentDateStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* SCREEN UI HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Laporan Keuangan</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
            Generate laporan keuangan dan operasional secara otomatis
          </p>
        </div>
        {/* Export buttons */}
        <div className="flex items-center gap-2 shrink-0 select-none">
          <button
            onClick={handlePrint}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition-all cursor-pointer shadow-md shadow-blue-500/20"
          >
            🖨️ Print Laporan PDF
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer shadow-sm"
          >
            📊 Export CSV (Excel)
          </button>
        </div>
      </div>

      {/* TABS FILTER */}
      <div className="flex items-center gap-1.5 select-none bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit print:hidden">
        {(['Harian', 'Mingguan', 'Bulanan', 'Tahunan'] as const).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* SCREEN UI CONTENT GRID */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 print:hidden">
        {/* Left: 4 Bar Charts Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Chart 1: Pendapatan */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Pendapatan Sewa</h3>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">{activeTab}</span>
            </div>
            <div className="h-40 flex items-end justify-between px-3 pt-3 gap-2 relative">
              {chartData.map((item, idx) => {
                const max = getMaxVal('pendapatan');
                const percent = Math.round((item.pendapatan / max) * 100);
                return (
                  <div key={idx} className="flex flex-col items-center flex-1 group relative">
                    <span className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-lg z-10 whitespace-nowrap">
                      {formatCurrency(item.pendapatan)}
                    </span>
                    <div className="w-full bg-slate-50 dark:bg-slate-950 rounded-t-lg h-28 relative overflow-hidden flex items-end">
                      <div
                        style={{ height: `${percent}%` }}
                        className="w-full bg-emerald-500 dark:bg-emerald-600 rounded-t-lg transition-all duration-300 shadow-sm"
                      />
                    </div>
                    <span className="text-[8px] text-slate-400 dark:text-slate-500 font-extrabold mt-2 text-center truncate w-full">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart 2: Pengeluaran */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Pengeluaran Operasional</h3>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">{activeTab}</span>
            </div>
            <div className="h-40 flex items-end justify-between px-3 pt-3 gap-2 relative">
              {chartData.map((item, idx) => {
                const max = getMaxVal('pengeluaran');
                const percent = Math.round((item.pengeluaran / max) * 100);
                return (
                  <div key={idx} className="flex flex-col items-center flex-1 group relative">
                    <span className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-lg z-10 whitespace-nowrap">
                      {formatCurrency(item.pengeluaran)}
                    </span>
                    <div className="w-full bg-slate-50 dark:bg-slate-950 rounded-t-lg h-28 relative overflow-hidden flex items-end">
                      <div
                        style={{ height: `${percent}%` }}
                        className="w-full bg-rose-500 dark:bg-rose-600 rounded-t-lg transition-all duration-300 shadow-sm"
                      />
                    </div>
                    <span className="text-[8px] text-slate-400 dark:text-slate-500 font-extrabold mt-2 text-center truncate w-full">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart 3: Net Profit */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Net Profit</h3>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">{activeTab}</span>
            </div>
            <div className="h-40 flex items-end justify-between px-3 pt-3 gap-2 relative">
              {chartData.map((item, idx) => {
                const max = getMaxVal('netProfit');
                const percent = Math.round((item.netProfit / max) * 100);
                return (
                  <div key={idx} className="flex flex-col items-center flex-1 group relative">
                    <span className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-lg z-10 whitespace-nowrap">
                      {formatCurrency(item.netProfit)}
                    </span>
                    <div className="w-full bg-slate-50 dark:bg-slate-950 rounded-t-lg h-28 relative overflow-hidden flex items-end">
                      <div
                        style={{ height: `${percent}%` }}
                        className="w-full bg-blue-600 dark:bg-blue-500 rounded-t-lg transition-all duration-300 shadow-sm"
                      />
                    </div>
                    <span className="text-[8px] text-slate-400 dark:text-slate-500 font-extrabold mt-2 text-center truncate w-full">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart 4: Piutang */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Piutang</h3>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">{activeTab}</span>
            </div>
            <div className="h-40 flex items-end justify-between px-3 pt-3 gap-2 relative">
              {chartData.map((item, idx) => {
                const max = getMaxVal('piutang');
                const percent = Math.round((item.piutang / max) * 100);
                return (
                  <div key={idx} className="flex flex-col items-center flex-1 group relative">
                    <span className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-lg z-10 whitespace-nowrap">
                      {formatCurrency(item.piutang)}
                    </span>
                    <div className="w-full bg-slate-50 dark:bg-slate-950 rounded-t-lg h-28 relative overflow-hidden flex items-end">
                      <div
                        style={{ height: `${percent}%` }}
                        className="w-full bg-amber-500 dark:bg-amber-600 rounded-t-lg transition-all duration-300 shadow-sm"
                      />
                    </div>
                    <span className="text-[8px] text-slate-400 dark:text-slate-500 font-extrabold mt-2 text-center truncate w-full">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Financial Summary Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 mb-5">
              Ringkasan Keuangan
            </h3>

            <div className="space-y-4">
              <div className="bg-slate-50/50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Total Pendapatan</p>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">Uang sewa lunas</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{formatCurrency(reports.totalRevenue)}</p>
                </div>
              </div>

              <div className="bg-slate-50/50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Total Pengeluaran</p>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">Biaya operasional</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-extrabold text-rose-500 dark:text-rose-400">{formatCurrency(reports.totalExpense)}</p>
                </div>
              </div>

              <div className="bg-slate-50/50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Net Profit</p>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold">Margin {getProfitMargin()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-extrabold text-blue-600 dark:text-blue-400">{formatCurrency(reports.netProfit)}</p>
                </div>
              </div>

              <div className="bg-slate-50/50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Total Piutang</p>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold">{reports.unpaidCount} penyewa belum bayar</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-extrabold text-amber-500 dark:text-amber-400">{formatCurrency(reports.piutang)}</p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium text-center mt-6">
            Laporan diperbarui otomatis secara real-time dari Database
          </p>
        </div>
      </div>

      {/* PROFESSIONAL PRINTABLE DOCUMENT CONTAINER (@media print ON ONLY) */}
      <div className="hidden print:block p-8 bg-white text-slate-900 font-sans">
        {/* Header Printable */}
        <div className="flex items-center justify-between border-b-2 border-blue-600 pb-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-xl">
              KTJ
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">KOS TRI J</h1>
              <p className="text-xs text-slate-500">Jl. Mawar No. 12, Kebayoran Baru, Jakarta Selatan</p>
              <p className="text-xs text-slate-500">Telepon / WhatsApp: 081234567890</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-black text-blue-600 uppercase tracking-wider">LAPORAN KEUANGAN</h2>
            <p className="text-xs font-bold text-slate-700 mt-1">Periode Filter: {activeTab}</p>
            <p className="text-xs text-slate-500">Tanggal Cetak: {currentDateStr}</p>
          </div>
        </div>

        {/* Executive Summary Table */}
        <div className="mb-8">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Ringkasan Ikhtisar Keuangan</h3>
          <table className="w-full border-collapse border border-slate-200 text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-800">
                <th className="border border-slate-200 p-2.5 text-left">Metrik Keuangan</th>
                <th className="border border-slate-200 p-2.5 text-right">Nilai Nominal</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-200 p-2.5 font-semibold">Total Pendapatan Sewa (Lunas)</td>
                <td className="border border-slate-200 p-2.5 text-right font-bold text-emerald-700">{formatCurrency(reports.totalRevenue)}</td>
              </tr>
              <tr>
                <td className="border border-slate-200 p-2.5 font-semibold">Total Pengeluaran Operasional</td>
                <td className="border border-slate-200 p-2.5 text-right font-bold text-rose-700">{formatCurrency(reports.totalExpense)}</td>
              </tr>
              <tr className="bg-blue-50 font-bold">
                <td className="border border-slate-200 p-2.5 text-blue-900">Laba Bersih (Net Profit)</td>
                <td className="border border-slate-200 p-2.5 text-right text-blue-900">{formatCurrency(reports.netProfit)}</td>
              </tr>
              <tr>
                <td className="border border-slate-200 p-2.5 font-semibold">Total Piutang Belum Bayar</td>
                <td className="border border-slate-200 p-2.5 text-right font-bold text-amber-700">{formatCurrency(reports.piutang)}</td>
              </tr>
              <tr>
                <td className="border border-slate-200 p-2.5 font-semibold">Margin Keuntungan (Profit Margin)</td>
                <td className="border border-slate-200 p-2.5 text-right font-bold">{getProfitMargin()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Detailed Breakdown Table */}
        <div className="mb-10">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Rincian Transaksi Per Sub-Periode</h3>
          <table className="w-full border-collapse border border-slate-200 text-xs">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="border border-slate-700 p-2.5 text-left">Periode</th>
                <th className="border border-slate-700 p-2.5 text-right">Pendapatan</th>
                <th className="border border-slate-700 p-2.5 text-right">Pengeluaran</th>
                <th className="border border-slate-700 p-2.5 text-right">Net Profit</th>
                <th className="border border-slate-700 p-2.5 text-right">Piutang</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((row, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="border border-slate-200 p-2.5 font-bold">{row.label}</td>
                  <td className="border border-slate-200 p-2.5 text-right text-emerald-700 font-semibold">{formatCurrency(row.pendapatan)}</td>
                  <td className="border border-slate-200 p-2.5 text-right text-rose-700 font-semibold">{formatCurrency(row.pengeluaran)}</td>
                  <td className="border border-slate-200 p-2.5 text-right text-blue-700 font-bold">{formatCurrency(row.netProfit)}</td>
                  <td className="border border-slate-200 p-2.5 text-right text-amber-700 font-semibold">{formatCurrency(row.piutang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Signatures */}
        <div className="flex justify-between items-end pt-8 border-t border-slate-200">
          <div className="text-xs text-slate-500">
            <p>Laporan ini dihasilkan secara otomatis berdasarkan data transaksi sah database Kos Tri J.</p>
            <p>Dicetak pada: {currentDateStr}</p>
          </div>
          <div className="text-center w-48">
            <p className="text-xs font-semibold text-slate-600 mb-12">Pemilik Kos Tri J</p>
            <div className="border-t border-slate-900 pt-1 font-bold text-xs">Tanda Tangan & Stempel</div>
          </div>
        </div>
      </div>
    </div>
  );
}
