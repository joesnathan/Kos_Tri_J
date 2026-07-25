'use client';

import React, { useState, useTransition } from 'react';
import { createRoomAction, updateRoomDetailsAction } from '@/app/actions/owner';

interface KamarClientProps {
  user: {
    nama: string;
    email: string;
  };
  initialRooms: any[];
  tenantsList?: any[];
}

export default function KamarClient({ user, initialRooms, tenantsList = [] }: KamarClientProps) {
  const [rooms, setRooms] = useState(initialRooms);
  const [activeTab, setActiveTab] = useState<'Semua' | 'Terisi' | 'Kosong' | 'Maintenance'>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Add Room Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomPrice, setNewRoomPrice] = useState(1500000);
  const [newRoomStatus, setNewRoomStatus] = useState<'Kosong' | 'Terisi' | 'Perbaikan'>('Kosong');

  // Details Modal State
  const [selectedRoomDetails, setSelectedRoomDetails] = useState<any | null>(null);

  // Edit Modal State
  const [editingRoom, setEditingRoom] = useState<any | null>(null);
  const [editNumber, setEditNumber] = useState('');
  const [editPrice, setEditPrice] = useState(0);
  const [editStatus, setEditStatus] = useState<'Kosong' | 'Terisi' | 'Perbaikan'>('Kosong');
  
  // Link to database tenant accounts instead of raw strings
  const [selectedTenantId, setSelectedTenantId] = useState('none');
  const [editDueDate, setEditDueDate] = useState('');

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  // Facility helper
  const getRoomFacilities = (roomName: string) => {
    const isEven = parseInt(roomName.replace(/\D/g, '')) % 2 === 0;
    if (isEven) {
      return ['AC', 'WiFi', 'Kamar Mandi Dalam'];
    }
    return ['AC', 'WiFi'];
  };

  // Floor helper
  const getRoomFloor = (roomName: string) => {
    const num = parseInt(roomName.replace(/\D/g, ''));
    if (isNaN(num)) return 'Lantai 1';
    if (num >= 200) {
      return `Lantai ${Math.floor(num / 100)}`;
    }
    if (num > 5) return 'Lantai 2';
    return 'Lantai 1';
  };

  // Size helper
  const getRoomSize = (roomName: string) => {
    const num = parseInt(roomName.replace(/\D/g, ''));
    if (isNaN(num)) return '3x3m';
    if (num % 3 === 0) return '3x3m';
    if (num % 2 === 0) return '3x4m';
    return '2x3m';
  };

  // Handlers
  const handleAddRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomNumber.trim()) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    let nomorKamar = newRoomNumber.trim();
    if (!nomorKamar.toLowerCase().startsWith('kamar')) {
      nomorKamar = `Kamar ${nomorKamar}`;
    }

    startTransition(async () => {
      const res = await createRoomAction(nomorKamar, newRoomPrice, newRoomStatus);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(res.message || 'Kamar berhasil ditambahkan.');
        // Optimistically update list
        const newRoomObj = {
          id: Math.random().toString(),
          nomorKamar,
          hargaBulanan: newRoomPrice,
          status: newRoomStatus,
          users: [],
          keluhan: [],
        };
        setRooms((prev) => {
          const updated = [...prev, newRoomObj];
          updated.sort((a, b) => {
            const numA = parseInt(a.nomorKamar.replace(/^\D+/g, '')) || 0;
            const numB = parseInt(b.nomorKamar.replace(/^\D+/g, '')) || 0;
            return numA - numB;
          });
          return updated;
        });
        setIsAddModalOpen(false);
        setNewRoomNumber('');
        setNewRoomPrice(1500000);
        setNewRoomStatus('Kosong');
      }
    });
  };

  const handleOpenEdit = (room: any) => {
    setEditingRoom(room);
    setEditNumber(room.nomorKamar);
    setEditPrice(room.hargaBulanan);
    setEditStatus(room.status === 'Perbaikan' ? 'Perbaikan' : room.status);
    
    const tenant = room.users?.[0];
    setSelectedTenantId(tenant ? tenant.id : 'none');
    setEditDueDate(tenant?.tagihan?.[0] ? tenant.tagihan[0].bulanTagihan : 'Juli 2025');
  };

  const handleUpdateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom || !editNumber.trim()) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await updateRoomDetailsAction(
        editingRoom.id,
        editNumber,
        editPrice,
        editStatus,
        editStatus === 'Terisi' ? selectedTenantId : undefined,
        editStatus === 'Terisi' ? editDueDate : undefined
      );

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(res.message || 'Kamar berhasil diperbarui.');
        
        // Find tenant details to update local state optimistically
        const selectedTenant = tenantsList.find(t => t.id === selectedTenantId);
        
        setRooms((prev) =>
          prev.map((r) => {
            if (r.id === editingRoom.id) {
              const updatedUsers = (editStatus === 'Terisi' && selectedTenant) ? [
                {
                  id: selectedTenant.id,
                  nama: selectedTenant.nama,
                  email: selectedTenant.email,
                  nomorHp: selectedTenant.nomorHp,
                  tagihan: [{ bulanTagihan: editDueDate, status: 'BELUM_BAYAR' }]
                }
              ] : [];
              return {
                ...r,
                nomorKamar: editNumber,
                hargaBulanan: editPrice,
                status: editStatus,
                users: updatedUsers
              };
            }
            return r;
          })
        );
        setEditingRoom(null);
      }
    });
  };

  // Filtered rooms
  const filteredRooms = rooms.filter((room) => {
    if (activeTab === 'Terisi' && room.status !== 'Terisi') return false;
    if (activeTab === 'Kosong' && room.status !== 'Kosong') return false;
    if (activeTab === 'Maintenance' && room.status !== 'Perbaikan') return false;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchRoom = room.nomorKamar.toLowerCase().includes(query);
      const matchTenant = room.users && room.users.some((t: any) => t.nama.toLowerCase().includes(query));
      return matchRoom || matchTenant;
    }

    return true;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Kelola Kamar</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">Atur status, harga sewa, fasilitas, dan detail hunian kamar kos</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-500 active:scale-[0.98] transition-all cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Tambah Kamar Baru
        </button>
      </div>

      {/* Alert states */}
      {errorMsg && (
        <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-4 text-xs font-semibold text-red-650 dark:text-red-400">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/20 p-4 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          {successMsg}
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Tabs Filter */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
          {(['Semua', 'Terisi', 'Kosong', 'Maintenance'] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 dark:text-slate-450 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Local Search input */}
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
            <svg className="h-4 w-4 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nomor kamar atau penyewa..."
            className="w-full rounded-xl bg-slate-50 dark:bg-slate-850 pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-550 border border-slate-200/60 dark:border-slate-700 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium"
          />
        </div>
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredRooms.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 dark:text-slate-500 text-sm font-semibold">
            Tidak ada kamar yang sesuai filter atau kriteria pencarian.
          </div>
        ) : (
          filteredRooms.map((room) => {
            const hasOccupant = room.status === 'Terisi' && room.users && room.users.length > 0;
            const activeTenant = hasOccupant ? room.users[0] : null;

            return (
              <div
                key={room.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between overflow-hidden hover:shadow-md transition-all"
              >
                {/* Room top card header */}
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-black text-slate-900 dark:text-white uppercase">
                      {room.nomorKamar.replace('Kamar ', 'R-')}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                        room.status === 'Terisi'
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40'
                          : room.status === 'Kosong'
                          ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/40'
                          : 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/40'
                      }`}
                    >
                      {room.status === 'Terisi' ? 'Terisi' : room.status === 'Kosong' ? 'Kosong' : 'Maintenance'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Harga Sewa Bulanan</span>
                    <span className="text-base font-black text-slate-900 dark:text-white block mt-0.5">
                      {formatCurrency(room.hargaBulanan)}
                    </span>
                  </div>

                  {/* Occupant details block */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    {activeTenant ? (
                      <div>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-extrabold uppercase block tracking-wider">Penyewa</span>
                        <p className="text-xs font-bold text-slate-800 dark:text-white leading-tight mt-0.5">{activeTenant.nama}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-medium mt-0.5">{activeTenant.email}</p>
                      </div>
                    ) : (
                      <p className="text-xs font-medium text-slate-450 dark:text-slate-500 italic">Kamar belum dihuni.</p>
                    )}
                  </div>
                </div>

                {/* Card footer actions */}
                <div className="bg-slate-50/50 dark:bg-slate-850 px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between select-none">
                  <button
                    onClick={() => setSelectedRoomDetails(room)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-850 dark:hover:text-white hover:underline cursor-pointer"
                  >
                    Detail Kamar
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(room)}
                      className="px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Room Modal Dialog */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Tambah Kamar Kos Baru</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-655 p-1 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddRoom} className="mt-4 space-y-4">
              <div>
                <label htmlFor="room_num" className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                  Nomor Kamar
                </label>
                <input
                  id="room_num"
                  type="text"
                  required
                  value={newRoomNumber}
                  onChange={(e) => setNewRoomNumber(e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-202 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-850 dark:text-white placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white"
                  placeholder="Contoh: 101, 102, R01"
                />
              </div>

              <div>
                <label htmlFor="room_price" className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                  Tarif Sewa Bulanan (Rp)
                </label>
                <input
                  id="room_price"
                  type="number"
                  required
                  min={1000}
                  value={newRoomPrice}
                  onChange={(e) => setNewRoomPrice(parseInt(e.target.value) || 0)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-202 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-850 dark:text-white outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label htmlFor="room_status" className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                  Status Awal Kamar
                </label>
                <select
                  id="room_status"
                  value={newRoomStatus}
                  onChange={(e) => setNewRoomStatus(e.target.value as any)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-202 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-3.5 py-2.5 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-bold"
                >
                  <option value="Kosong" className="dark:bg-slate-900">Kosong (Tersedia)</option>
                  <option value="Perbaikan" className="dark:bg-slate-900">Perbaikan (Maintenance)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-500 disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? 'Menyimpan...' : 'Simpan Kamar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Room Modal */}
      {editingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Edit {editingRoom.nomorKamar}</h3>
              <button onClick={() => setEditingRoom(null)} className="text-slate-400 hover:text-slate-655 p-1 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateRoom} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Nomor Kamar</label>
                <input
                  type="text"
                  required
                  value={editNumber}
                  onChange={(e) => setEditNumber(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-slate-202 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-855 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Tarif Sewa Bulanan (Rp)</label>
                <input
                  type="number"
                  required
                  value={editPrice}
                  onChange={(e) => setEditPrice(parseInt(e.target.value) || 0)}
                  className="mt-1 block w-full rounded-xl border border-slate-202 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-855 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Status Kamar</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-3.5 py-2.5 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500 font-bold"
                >
                  <option value="Kosong" className="dark:bg-slate-900">Kosong (Tersedia)</option>
                  <option value="Terisi" className="dark:bg-slate-900">Terisi (Dihuni)</option>
                  <option value="Perbaikan" className="dark:bg-slate-900">Perbaikan (Maintenance)</option>
                </select>
              </div>

              {/* Show Tenant selector dropdown if status is Terisi */}
              {editStatus === 'Terisi' && (
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-wider">Pilih Penyewa Kos</h4>
                  
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider">Nama Akun Penyewa</label>
                    <select
                      value={selectedTenantId}
                      onChange={(e) => setSelectedTenantId(e.target.value)}
                      className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-3.5 py-2.5 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500 font-bold"
                    >
                      <option value="none" className="dark:bg-slate-900">-- Pilih Akun Penyewa --</option>
                      {tenantsList.map((t) => (
                        <option key={t.id} value={t.id} className="dark:bg-slate-900">
                          {t.nama} ({t.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Render details read-only */}
                  {selectedTenantId !== 'none' && (() => {
                    const selectedTenant = tenantsList.find(t => t.id === selectedTenantId);
                    if (!selectedTenant) return null;
                    return (
                      <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 text-[10px] space-y-1 font-semibold text-slate-500 dark:text-slate-400">
                        <p>Gmail / Email: <span className="text-slate-700 dark:text-white font-bold">{selectedTenant.email}</span></p>
                        <p>Nomor HP: <span className="text-slate-700 dark:text-white font-bold">{selectedTenant.nomorHp}</span></p>
                      </div>
                    );
                  })()}

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider">Bulan Jatuh Tempo</label>
                    <input
                      type="text"
                      required
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="mt-1 block w-full rounded-xl border border-slate-202 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-855 dark:text-white outline-none focus:border-blue-500"
                      placeholder="Juli 2025"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-3">
                <button type="button" onClick={() => setEditingRoom(null)} className="rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                  Batal
                </button>
                <button type="submit" disabled={isPending} className="rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-500 cursor-pointer">
                  Update Kamar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Room Modal */}
      {selectedRoomDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase">Info {selectedRoomDetails.nomorKamar}</h3>
              <button onClick={() => setSelectedRoomDetails(null)} className="text-slate-400 hover:text-slate-655 p-1 cursor-pointer">
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs font-semibold text-slate-600 dark:text-slate-350">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Status</span>
                  <span className="text-slate-800 dark:text-white block mt-1">{selectedRoomDetails.status}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Lantai</span>
                  <span className="text-slate-800 dark:text-white block mt-1">{getRoomFloor(selectedRoomDetails.nomorKamar)}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Ukuran Kamar</span>
                  <span className="text-slate-800 dark:text-white block mt-1">{getRoomSize(selectedRoomDetails.nomorKamar)}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Harga Sewa</span>
                  <span className="text-slate-800 dark:text-white block mt-1">{formatCurrency(selectedRoomDetails.hargaBulanan)}</span>
                </div>
              </div>

              <div>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Fasilitas Kamar</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {getRoomFacilities(selectedRoomDetails.nomorKamar).map((fac) => (
                    <span key={fac} className="px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800 text-[10px]">
                      {fac}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                {selectedRoomDetails.users && selectedRoomDetails.users.length > 0 ? (
                  <div className="space-y-2">
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Detail Penghuni Aktif</span>
                    <div className="bg-slate-50 dark:bg-slate-850/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                      <p>Nama: <span className="text-slate-800 dark:text-white font-bold">{selectedRoomDetails.users[0].nama}</span></p>
                      <p>Nomor HP: <span className="text-slate-800 dark:text-white font-bold">{selectedRoomDetails.users[0].nomorHp}</span></p>
                      <p>Gmail: <span className="text-slate-800 dark:text-white font-bold">{selectedRoomDetails.users[0].email}</span></p>
                      <p>Tempo: <span className="text-slate-800 dark:text-white font-bold">{selectedRoomDetails.users[0].tagihan?.[0]?.bulanTagihan || 'Juli 2025'}</span></p>
                    </div>
                  </div>
                ) : (
                  <p className="italic text-slate-400">Kamar saat ini berstatus kosong (tidak dihuni).</p>
                )}
              </div>

              <button
                onClick={() => setSelectedRoomDetails(null)}
                className="w-full mt-2 py-2.5 text-center text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
