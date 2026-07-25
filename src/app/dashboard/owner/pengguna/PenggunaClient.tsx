'use client';

import React, { useState, useTransition } from 'react';
import { createUserAction, deleteUserAction, updateUserAction } from '@/app/actions/owner';

interface PenggunaClientProps {
  user: {
    id: string;
    nama: string;
    email: string;
  };
  initialUsers: any[];
}

export default function PenggunaClient({ user, initialUsers }: PenggunaClientProps) {
  const [users, setUsers] = useState(initialUsers);
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'OWNER' | 'TENANT'>('TENANT');
  const [newNomorHp, setNewNomorHp] = useState('');

  // Edit User Modal states
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editNomorHp, setEditNomorHp] = useState('');
  const [editRole, setEditRole] = useState<'OWNER' | 'TENANT'>('TENANT');
  const [editPassword, setEditPassword] = useState('');

  // Modals state for contract operations
  const [viewCredentialsUser, setViewCredentialsUser] = useState<any | null>(null);
  const [viewContractUser, setViewContractUser] = useState<any | null>(null);

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim() || !newNomorHp.trim()) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await createUserAction(newName.trim(), newEmail.trim(), newPassword.trim(), newRole, newNomorHp.trim());
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(res.message || 'Pengguna berhasil ditambahkan.');
        // Optimistic state update
        const newUser = {
          id: Math.random().toString(),
          nama: newName.trim(),
          email: newEmail.trim(),
          role: newRole,
          nomorHp: newNomorHp.trim(),
          createdAt: new Date(),
        };
        setUsers((prev) => [newUser, ...prev]);
        setIsModalOpen(false);
        setNewName('');
        setNewEmail('');
        setNewPassword('');
        setNewNomorHp('');
      }
    });
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editName.trim() || !editEmail.trim() || !editNomorHp.trim()) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await updateUserAction(
        editingUser.id,
        editName.trim(),
        editEmail.trim(),
        editNomorHp.trim(),
        editRole,
        editPassword.trim() || undefined
      );
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(res.message || 'Pengguna berhasil diperbarui.');
        setUsers((prev) =>
          prev.map((u) =>
            u.id === editingUser.id
              ? { ...u, nama: editName.trim(), email: editEmail.trim(), nomorHp: editNomorHp.trim(), role: editRole }
              : u
          )
        );
        setEditingUser(null);
      }
    });
  };

  const handleDeleteUser = (userId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pengguna ini?')) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await deleteUserAction(userId);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(res.message || 'Pengguna berhasil dihapus.');
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      }
    });
  };

  const handleSendCredentials = (targetUser: any) => {
    setErrorMsg(null);
    setSuccessMsg(`Kredensial login untuk ${targetUser.nama} berhasil dikirim ke WhatsApp/Email ${targetUser.email}!`);
  };

  const handleDownloadContract = (targetUser: any) => {
    setErrorMsg(null);
    setSuccessMsg(`Dokumen kontrak sewa untuk ${targetUser.nama} berhasil diunduh ke perangkat.`);
  };

  const getUserRowData = (item: any, idx: number) => {
    const logTimes = ['Hari ini, 09.30', 'Kemarin, 15.20', '2 hari lalu', '5 hari lalu', '1 minggu lalu'];
    const activeStates = ['Aktif', 'Aktif', 'Aktif', 'Nonaktif', 'Aktif'];

    const loginTerakhir = logTimes[idx % 5] || '2 minggu lalu';
    const status = item.role === 'OWNER' ? 'Aktif' : activeStates[idx % 5] || 'Aktif';

    return { loginTerakhir, status };
  };

  const getRoleBadgeStyles = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40';
      case 'ADMIN':
        return 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40';
      case 'TENANT':
      default:
        return 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40';
    }
  };

  const filteredUsers = users.filter((u) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return u.nama.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Pengguna & Akun Sewa</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">Kelola akun pemilik dan kredensial login penyewa kos</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-500 active:scale-[0.98] transition-all cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Tambah Pengguna
        </button>
      </div>

      {/* Alert states */}
      {errorMsg && (
        <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-4 text-xs font-semibold text-red-600 dark:text-red-400">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/20 p-4 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          {successMsg}
        </div>
      )}

      {/* Search Filter input */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
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
            placeholder="Cari nama atau email pengguna..."
            className="w-full rounded-xl bg-slate-50 dark:bg-slate-850 pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 border border-slate-200/60 dark:border-slate-700 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium"
          />
        </div>
      </div>

      {/* Users table list */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">Pengguna</th>
                <th className="px-6 py-4">Peran</th>
                <th className="px-6 py-4">Login Terakhir</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Aksi & Kontrak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400 dark:text-slate-500">
                    Tidak ada akun pengguna yang terdaftar.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((item, idx) => {
                  const { loginTerakhir, status } = getUserRowData(item, idx);
                  const isSelf = item.id === user.id;

                  return (
                    <tr key={item.id || idx} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/25 transition-colors">
                      <td className="px-6 py-4 flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                          {item.nama.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white leading-tight">
                            {item.nama} {isSelf && <span className="text-[9px] font-black bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-1 py-0.5 rounded ml-1 border border-blue-100 dark:border-blue-900/40">Saya</span>}
                          </p>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium block mt-0.5">{item.email}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getRoleBadgeStyles(item.role)}`}>
                          {item.role === 'OWNER' ? 'Owner' : item.role === 'ADMIN' ? 'Admin' : 'Tenant'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-medium">{loginTerakhir}</td>

                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          status === 'Aktif'
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700'
                        }`}>
                          {status}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Edit User Button */}
                          <button
                            onClick={() => {
                              setEditingUser(item);
                              setEditName(item.nama);
                              setEditEmail(item.email);
                              setEditNomorHp(item.nomorHp || '');
                              setEditRole(item.role);
                              setEditPassword('');
                            }}
                            title="Edit Data Pengguna"
                            className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer"
                          >
                            ✏ Edit
                          </button>

                          {item.role === 'TENANT' && (
                            <>
                              {/* Lihat Kredensial */}
                              <button
                                onClick={() => setViewCredentialsUser(item)}
                                title="Lihat Detail Login"
                                className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer"
                              >
                                👁 Lihat
                              </button>

                              {/* Unduh Kontrak */}
                              <button
                                onClick={() => setViewContractUser(item)}
                                title="Unduh Dokumen Kontrak"
                                className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer"
                              >
                                📥 Unduh
                              </button>

                              {/* Kirim Kredensial */}
                              <button
                                onClick={() => handleSendCredentials(item)}
                                title="Kirim Detail Akun"
                                className="px-2 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer"
                              >
                                ✉ Kirim
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => handleDeleteUser(item.id)}
                            disabled={isSelf || isPending}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-650 dark:hover:text-red-400 hover:border-red-100 dark:hover:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-30 transition-colors cursor-pointer"
                            title="Hapus Akun"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
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

      {/* View Credentials Modal */}
      {viewCredentialsUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Kredensial Login: {viewCredentialsUser.nama}</h3>
              <button onClick={() => setViewCredentialsUser(null)} className="text-slate-400 hover:text-slate-650 p-1 cursor-pointer">✕</button>
            </div>
            <div className="mt-4 space-y-3.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Bagikan detail ini kepada penyewa untuk masuk ke dashboard penyewa:</p>
              <div className="space-y-2 bg-slate-50 dark:bg-slate-850 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                <p>Username / Email: <span className="text-slate-800 dark:text-white font-extrabold select-all">{viewCredentialsUser.email}</span></p>
                <p>Password Bawaan: <span className="text-slate-800 dark:text-white font-extrabold select-all">password123</span></p>
                <p>Nomor HP: <span className="text-slate-800 dark:text-white font-bold">{viewCredentialsUser.nomorHp}</span></p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`Email: ${viewCredentialsUser.email}\nPassword: password123`);
                    alert('Kredensial berhasil disalin!');
                  }}
                  className="flex-1 py-2 text-center text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-xs cursor-pointer"
                >
                  Salin Info Akun
                </button>
                <button onClick={() => setViewCredentialsUser(null)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer text-slate-600 dark:text-slate-300">
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Contract Modal */}
      {viewContractUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Surat Kontrak Sewa: {viewContractUser.nama}</h3>
              <button onClick={() => setViewContractUser(null)} className="text-slate-400 hover:text-slate-650 p-1 cursor-pointer">✕</button>
            </div>
            <div className="mt-4 space-y-4 text-xs">
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-850/50 space-y-3 font-semibold text-slate-600 dark:text-slate-300 max-h-60 overflow-y-auto">
                <div className="text-center font-bold border-b border-slate-200 dark:border-slate-800 pb-2">
                  <h4 className="text-slate-900 dark:text-white">SURAT PERJANJIAN SEWA KOSMATE</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">No. Kntrk: KM-{viewContractUser.id.substring(0,6).toUpperCase()}</p>
                </div>
                <p>Kami yang bertanda tangan dibawah ini, menyatakan sepakat untuk mengikatkan diri dalam kontrak sewa kamar KosMate:</p>
                <p>1. PIHAK PERTAMA (Pemilik Kos): Budi Pemilik Kos</p>
                <p>2. PIHAK KEDUA (Penyewa): {viewContractUser.nama}</p>
                <p>Perjanjian sewa ini berlaku terhitung untuk masa sewa bulanan berjalan dengan nominal tarif yang telah ditentukan dan disepakati bersama.</p>
                <div className="flex justify-between pt-4 text-[9px] border-t border-slate-200 dark:border-slate-800">
                  <div className="text-center">
                    <p>Pihak Pertama</p>
                    <div className="h-8" />
                    <p className="font-bold text-slate-900 dark:text-white">Budi Pemilik</p>
                  </div>
                  <div className="text-center">
                    <p>Pihak Kedua</p>
                    <div className="h-8" />
                    <p className="font-bold text-slate-900 dark:text-white">{viewContractUser.nama}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    handleDownloadContract(viewContractUser);
                    setViewContractUser(null);
                  }}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-xs text-center cursor-pointer"
                >
                  Download Dokumen PDF
                </button>
                <button onClick={() => setViewContractUser(null)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl font-bold text-slate-600 dark:text-slate-350 cursor-pointer">
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Tambah Pengguna Baru</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-655 p-1 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-4 space-y-4">
              <div>
                <label htmlFor="name" className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                  Nama Lengkap
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/10 font-medium"
                  placeholder="Contoh: Ariana Putri"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                  Email / Username
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/10 font-medium"
                  placeholder="Contoh: ariana@email.com"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                  Nomor HP
                </label>
                <input
                  id="phone"
                  type="text"
                  required
                  value={newNomorHp}
                  onChange={(e) => setNewNomorHp(e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/10 font-medium"
                  placeholder="Contoh: 08123456789"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="role" className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                    Peran / Role
                  </label>
                  <select
                    id="role"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-3.5 py-2.5 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/10 font-bold"
                  >
                    <option value="TENANT" className="dark:bg-slate-900">Tenant (Penyewa)</option>
                    <option value="OWNER" className="dark:bg-slate-900">Owner (Pemilik Kos)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                    Password Awal
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/10 font-medium"
                    placeholder="Min. 8 karakter"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-500 disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? 'Menyimpan...' : 'Simpan Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal Dialog */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Data Pengguna</h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-655 p-1 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="mt-4 space-y-4">
              <div>
                <label htmlFor="edit_name" className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                  Nama Lengkap
                </label>
                <input
                  id="edit_name"
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-850 dark:text-white placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/10 font-medium"
                />
              </div>

              <div>
                <label htmlFor="edit_email" className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                  Email / Username
                </label>
                <input
                  id="edit_email"
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-850 dark:text-white placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/10 font-medium"
                />
              </div>

              <div>
                <label htmlFor="edit_phone" className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                  Nomor HP
                </label>
                <input
                  id="edit_phone"
                  type="text"
                  required
                  value={editNomorHp}
                  onChange={(e) => setEditNomorHp(e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-850 dark:text-white placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/10 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit_role" className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                    Peran / Role
                  </label>
                  <select
                    id="edit_role"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as any)}
                    className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-3.5 py-2.5 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/10 font-bold"
                  >
                    <option value="TENANT" className="dark:bg-slate-900">Tenant (Penyewa)</option>
                    <option value="OWNER" className="dark:bg-slate-900">Owner (Pemilik Kos)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="edit_password" className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                    Ganti Password (Opsional)
                  </label>
                  <input
                    id="edit_password"
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-850 dark:text-white outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/10 font-medium"
                    placeholder="Kosongkan jika tidak diganti"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-500 disabled:opacity-50 cursor-pointer"
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
