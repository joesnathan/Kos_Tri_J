'use client';

import React from 'react';

interface AnalitikClientProps {
  user: {
    nama: string;
    email: string;
  };
}

export default function AnalitikClient({ user }: AnalitikClientProps) {
  // Mock data matching the figma screen
  const roomsDistribution = [
    { name: 'R01', val: 'Rp 1.500.000', percentage: '75%' },
    { name: 'R02', val: 'Rp 1.500.000', percentage: '75%' },
    { name: 'R05', val: 'Rp 1.500.000', percentage: '75%' },
    { name: 'R06', val: 'Rp 1.500.000', percentage: '75%' },
    { name: 'R07', val: 'Rp 1.500.000', percentage: '75%' },
    { name: 'R09', val: 'Rp 1.500.000', percentage: '75%' },
    { name: 'R10', val: 'Rp 1.500.000', percentage: '75%' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 leading-tight">Analitik</h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">Analisis mendalam performa kos Anda</p>
        </div>
      </div>

      {/* Top 4 Metrics Cards */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Card 1: Avg Pendapatan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold tracking-wider uppercase">Avg. Pendapatan/Kamar</span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded">
                ↗ +8%
              </span>
            </div>
            <h4 className="text-xl font-black text-slate-900 mt-2">Rp 1.6jt</h4>
          </div>
          <p className="text-[9px] text-slate-400 mt-1.5 font-medium">Per bulan</p>
        </div>

        {/* Card 2: Tingkat Hunian */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold tracking-wider uppercase">Tingkat Hunian</span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded">
                ↗ +5%
              </span>
            </div>
            <h4 className="text-xl font-black text-slate-900 mt-2">80%</h4>
          </div>
          <p className="text-[9px] text-slate-400 mt-1.5 font-medium">8 dari 10 kamar</p>
        </div>

        {/* Card 3: Tingkat Keluhan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold tracking-wider uppercase">Tingkat Keluhan</span>
              <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1 py-0.5 rounded">
                ↘ -12%
              </span>
            </div>
            <h4 className="text-xl font-black text-slate-900 mt-2">2.1%</h4>
          </div>
          <p className="text-[9px] text-slate-400 mt-1.5 font-medium">Per penyewa</p>
        </div>

        {/* Card 4: On-Time Payment */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold tracking-wider uppercase">On-Time Payment</span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded">
                ↗ +3%
              </span>
            </div>
            <h4 className="text-xl font-black text-slate-900 mt-2">71%</h4>
          </div>
          <p className="text-[9px] text-slate-400 mt-1.5 font-medium">Membayar tepat waktu</p>
        </div>
      </section>

      {/* Main Charts area */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Tren Cashflow Card (span 2) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Tren Cashflow</h3>
          {/* SVG Custom Line Chart */}
          <div className="h-56 w-full relative pt-2">
            <svg className="h-full w-full" viewBox="0 0 600 200" preserveAspectRatio="none">
              {/* Grid Lines */}
              <line x1="0" y1="50" x2="600" y2="50" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="100" x2="600" y2="100" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="150" x2="600" y2="150" stroke="#f1f5f9" strokeWidth="1" />

              {/* Line path */}
              <path
                d="M 50 120 C 130 115, 210 135, 290 105 C 370 95, 450 102, 550 90"
                fill="none"
                stroke="#10b981"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Data points */}
              <circle cx="50" cy="120" r="4" fill="#ffffff" stroke="#10b981" strokeWidth="3" />
              <circle cx="290" cy="105" r="4" fill="#ffffff" stroke="#10b981" strokeWidth="3" />
              <circle cx="550" cy="90" r="4" fill="#ffffff" stroke="#10b981" strokeWidth="3" />
            </svg>
            <div className="flex justify-between text-[10px] text-slate-400 font-semibold px-4 mt-3">
              <span>Jan</span>
              <span>Feb</span>
              <span>Mar</span>
              <span>Apr</span>
              <span>May</span>
              <span>Jun</span>
              <span>Jul</span>
            </div>
          </div>
        </div>

        {/* Right: Distribusi Pendapatan per Kamar */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
            Distribusi Pendapatan per Kamar
          </h3>

          <div className="space-y-3.5">
            {roomsDistribution.map((item, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-700">
                  <span>{item.name}</span>
                  <span className="font-extrabold text-slate-800">{item.val}</span>
                </div>
                {/* Horizontal Progress bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    style={{ width: item.percentage }}
                    className="bg-blue-600 h-full rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
