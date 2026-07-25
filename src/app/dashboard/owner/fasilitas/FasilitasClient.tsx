'use client';

import React, { useState } from 'react';

interface FasilitasClientProps {
  user: {
    nama: string;
    email: string;
  };
}

interface FasilitasItem {
  id: string;
  name: string;
  units: number;
  status: 'Baik' | 'Maintenance';
  icon: React.ReactNode;
}

export default function FasilitasClient({ user }: FasilitasClientProps) {
  const [facilities, setFacilities] = useState<FasilitasItem[]>([
    {
      id: '1',
      name: 'AC',
      units: 8,
      status: 'Baik',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m2.828-9.9a5 5 0 117.07 7.07l-7.07-7.07z" />
        </svg>
      ),
    },
    {
      id: '2',
      name: 'WiFi',
      units: 1,
      status: 'Baik',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071a10 10 0 0114.14 0M1.758 7.243a15 15 0 0120.484 0" />
        </svg>
      ),
    },
    {
      id: '3',
      name: 'Kamar Mandi Dalam',
      units: 3,
      status: 'Baik',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
      ),
    },
    {
      id: '4',
      name: 'Balkon',
      units: 1,
      status: 'Baik',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v12a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 21h6" />
        </svg>
      ),
    },
    {
      id: '5',
      name: 'Parkir Motor',
      units: 1,
      status: 'Baik',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      ),
    },
    {
      id: '6',
      name: 'Dapur Bersama',
      units: 1,
      status: 'Maintenance',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7" />
          <circle cx="9" cy="9" r="4" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
    },
    {
      id: '7',
      name: 'Ruang Bersama',
      units: 1,
      status: 'Baik',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      id: '8',
      name: 'CCTV',
      units: 4,
      status: 'Baik',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUnits, setNewUnits] = useState(1);
  const [newStatus, setNewStatus] = useState<'Baik' | 'Maintenance'>('Baik');

  // Edit facility states
  const [editingFacility, setEditingFacility] = useState<FasilitasItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editUnits, setEditUnits] = useState(1);
  const [editStatus, setEditStatus] = useState<'Baik' | 'Maintenance'>('Baik');

  const handleAddFacility = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newItem: FasilitasItem = {
      id: Math.random().toString(),
      name: newName,
      units: newUnits,
      status: newStatus,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4" />
        </svg>
      ),
    };

    setFacilities((prev) => [...prev, newItem]);
    setIsModalOpen(false);
    setNewName('');
    setNewUnits(1);
    setNewStatus('Baik');
  };

  const handleOpenEdit = (fac: FasilitasItem) => {
    setEditingFacility(fac);
    setEditName(fac.name);
    setEditUnits(fac.units);
    setEditStatus(fac.status);
  };

  const handleUpdateFacility = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFacility || !editName.trim()) return;

    setFacilities((prev) =>
      prev.map((fac) => {
        if (fac.id === editingFacility.id) {
          return {
            ...fac,
            name: editName,
            units: editUnits,
            status: editStatus,
          };
        }
        return fac;
      })
    );

    setEditingFacility(null);
  };

  const handleDeleteFacility = (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus fasilitas ini?')) return;
    setFacilities((prev) => prev.filter((fac) => fac.id !== id));
    setEditingFacility(null);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 leading-tight">Fasilitas Kos</h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">Kelola fasilitas kos</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-500 active:scale-[0.98] transition-all"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Tambah Fasilitas
        </button>
      </div>

      {/* Grid inventory facilities */}
      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {facilities.map((fac) => (
          <div
            key={fac.id}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-50 text-blue-500 rounded-xl shrink-0">
                {fac.icon}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-800 truncate">{fac.name}</h4>
                <p className="text-[11px] text-slate-400 font-bold mt-0.5">{fac.units} unit</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  fac.status === 'Baik'
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    : 'bg-amber-50 text-amber-600 border border-amber-100'
                }`}
              >
                {fac.status}
              </span>

              <button
                onClick={() => handleOpenEdit(fac)}
                className="text-[10px] font-extrabold text-blue-600 hover:text-blue-500 transition-colors"
              >
                Kelola
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* Add Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Tambah Fasilitas Baru</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddFacility} className="mt-4 space-y-4">
              <div>
                <label htmlFor="name" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Nama Fasilitas
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50/30 px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 font-medium"
                  placeholder="Contoh: Kulkas Bersama"
                />
              </div>

              <div>
                <label htmlFor="units" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Jumlah Unit
                </label>
                <input
                  id="units"
                  type="number"
                  required
                  min={1}
                  value={newUnits}
                  onChange={(e) => setNewUnits(parseInt(e.target.value) || 1)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50/30 px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 font-medium"
                />
              </div>

              <div>
                <label htmlFor="status" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Status
                </label>
                <select
                  id="status"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50/30 px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 font-bold"
                >
                  <option value="Baik">Baik (Berfungsi)</option>
                  <option value="Maintenance">Maintenance (Dalam Perbaikan)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-500"
                >
                  Simpan Fasilitas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit/Manage Modal Dialog */}
      {editingFacility && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Kelola Fasilitas: {editingFacility.name}</h3>
              <button onClick={() => setEditingFacility(null)} className="text-slate-400 hover:text-slate-600 p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateFacility} className="mt-4 space-y-4">
              <div>
                <label htmlFor="edit_name" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Nama Fasilitas
                </label>
                <input
                  id="edit_name"
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50/30 px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label htmlFor="edit_units" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Jumlah Unit
                </label>
                <input
                  id="edit_units"
                  type="number"
                  required
                  min={1}
                  value={editUnits}
                  onChange={(e) => setEditUnits(parseInt(e.target.value) || 1)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50/30 px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label htmlFor="edit_status" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Status
                </label>
                <select
                  id="edit_status"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50/30 px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white font-bold"
                >
                  <option value="Baik">Baik (Berfungsi)</option>
                  <option value="Maintenance">Maintenance (Dalam Perbaikan)</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => handleDeleteFacility(editingFacility.id)}
                  className="rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 py-2.5 text-xs font-bold text-red-600 text-center"
                >
                  Hapus
                </button>
                <button
                  type="button"
                  onClick={() => setEditingFacility(null)}
                  className="rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 text-center"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-500 text-center"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
