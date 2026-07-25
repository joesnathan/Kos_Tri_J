'use client';

import React, { useState, useTransition } from 'react';
import { addTenantAction, editTenantAction, deleteUserAction } from '@/app/actions/owner';

interface PenyewaClientProps {
  user: {
    nama: string;
    email: string;
  };
  initialTenants: any[];
  vacantRooms: any[];
}

export default function PenyewaClient({ user, initialTenants, vacantRooms }: PenyewaClientProps) {
  const [tenants, setTenants] = useState(initialTenants);
  const [searchQuery, setSearchQuery] = useState('');

  // Add tenant modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');

  // Edit tenant modal state
  const [editingTenant, setEditingTenant] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRoomId, setEditRoomId] = useState('');

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const formatDate = (dateInput: Date | string | null | undefined) => {
    if (!dateInput) return '-';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleAddTenantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPhone.trim()) {
      setErrorMsg('Nama, Email, dan Nomor HP wajib diisi.');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await addTenantAction(
        newName.trim(),
        newEmail.trim(),
        newPhone.trim(),
        selectedRoomId || undefined
      );

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(res.message || 'Penyewa berhasil ditambahkan.');
        const assignedRoom = vacantRooms.find((r) => r.id === selectedRoomId);
        const newTenantObj = {
          id: res.id || Math.random().toString(),
          nama: newName.trim(),
          email: newEmail.trim(),
          nomorHp: newPhone.trim(),
          kamarId: selectedRoomId || null,
          kamar: assignedRoom ? { nomorKamar: assignedRoom.nomorKamar } : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        setTenants((prev) => [newTenantObj, ...prev]);
        setIsAddModalOpen(false);
        setNewName('');
        setNewEmail('');
        setNewPhone('');
        setSelectedRoomId('');
      }
    });
  };

  const handleOpenEditModal = (t: any) => {
    setEditingTenant(t);
    setEditName(t.nama || '');
    setEditEmail(t.email || '');
    setEditPhone(t.nomorHp || '');
    setEditRoomId(t.kamarId || 'none');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleEditTenantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant || !editName.trim() || !editEmail.trim()) {
      setErrorMsg('Nama dan Email tidak boleh kosong.');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await editTenantAction(
        editingTenant.id,
        editName.trim(),
        editEmail.trim(),
        editPhone.trim(),
        editRoomId
      );

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg('Data penyewa berhasil diperbarui!');
        const assignedRoom = vacantRooms.find((r) => r.id === editRoomId);
        setTenants((prev) =>
          prev.map((t) =>
            t.id === editingTenant.id
              ? {
                  ...t,
                  nama: editName.trim(),
                  email: editEmail.trim(),
                  nomorHp: editPhone.trim(),
                  kamarId: editRoomId === 'none' ? null : editRoomId,
                  kamar: editRoomId !== 'none' && assignedRoom ? { nomorKamar: assignedRoom.nomorKamar } : t.kamar,
                }
              : t
          )
        );
        setEditingTenant(null);
      }
    });
  };

  const handleDeleteTenant = (tenantId: string, nama: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus penyewa "${nama}"?`)) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await deleteUserAction(tenantId);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(`Penyewa ${nama} berhasil dihapus.`);
        setTenants((prev) => prev.filter((t) => t.id !== tenantId));
      }
    });
  };

  const filteredTenants = tenants.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.nama.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      t.nomorHp.includes(q) ||
      (t.kamar?.nomorKamar && t.kamar.nomorKamar.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Kelola Penyewa</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
            Kelola data penyewa, edit profil, dan status huni kos secara real-time
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-500 active:scale-[0.98] transition-all cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Tambah Penyewa
        </button>
      </div>

      {/* Status Messages */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-2xl text-xs font-semibold">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 rounded-2xl text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Filter and Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Cari nama penyewa, email, nomor hp, atau nomor kamar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-blue-500 shadow-sm"
          />
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3.5">Penyewa</th>
                <th className="px-5 py-3.5">Kontak</th>
                <th className="px-5 py-3.5">Kamar</th>
                <th className="px-5 py-3.5">Tanggal Masuk</th>
                <th className="px-5 py-3.5">Status Huni</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-slate-500 font-medium">
                    Tidak ada data penyewa yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredTenants.map((t) => {
                  const roomLabel = t.kamar?.nomorKamar ? `Kamar ${t.kamar.nomorKamar}` : '-';
                  const statusLabel = t.kamarId ? 'Aktif Menghuni' : 'Menunggu Kamar';

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-xs shrink-0">
                            {t.nama.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold">{t.nama}</p>
                            <p className="text-[10px] text-slate-400 font-normal">{t.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-400 font-medium">{t.nomorHp || '-'}</td>
                      <td className="px-5 py-4 font-bold text-slate-800 dark:text-slate-200">{roomLabel}</td>
                      <td className="px-5 py-4 text-slate-500 dark:text-slate-400 font-medium">{formatDate(t.createdAt)}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-extrabold ${
                            t.kamarId
                              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40'
                              : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40'
                          }`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditModal(t)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteTenant(t.id, t.nama)}
                            className="px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-bold hover:bg-red-100 dark:hover:bg-red-900/50 transition-all cursor-pointer"
                          >
                            Hapus
                          </button>
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

      {/* Modal Tambah Penyewa */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tambah Penyewa Baru</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddTenantSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  placeholder="Nama Penyewa"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  placeholder="penyewa@email.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nomor WhatsApp / HP *</label>
                <input
                  type="text"
                  required
                  placeholder="08123456789"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Alokasi Kamar (Opsional)</label>
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">-- Belum Ada Kamar --</option>
                  {vacantRooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.nomorKamar} (Rp {room.hargaBulanan.toLocaleString('id-ID')}/bln)
                    </option>
                  ))}
                </select>
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
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-500 disabled:opacity-50"
                >
                  {isPending ? 'Menyimpan...' : 'Tambah Penyewa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Data Penyewa */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Edit Data Penyewa</h3>
              <button onClick={() => setEditingTenant(null)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleEditTenantSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nomor WhatsApp / HP</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Alokasi Kamar</label>
                <select
                  value={editRoomId}
                  onChange={(e) => setEditRoomId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="none">-- Tanpa Kamar / Kosongkan --</option>
                  {vacantRooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.nomorKamar} (Rp {room.hargaBulanan.toLocaleString('id-ID')}/bln)
                    </option>
                  ))}
                  {editingTenant.kamarId && !vacantRooms.some((r) => r.id === editingTenant.kamarId) && (
                    <option value={editingTenant.kamarId}>
                      Kamar {editingTenant.kamar?.nomorKamar || 'Saat Ini'}
                    </option>
                  )}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTenant(null)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-500 disabled:opacity-50"
                >
                  {isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
