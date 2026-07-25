'use client';

import React, { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  updateProfilKosAction,
  createBankAccAction,
  deleteBankAccAction,
  createUserAction,
  updateUserAction,
  deleteUserAction,
} from '@/app/actions/owner';
import { useProfilKos } from '@/context/ProfilKosContext';

interface BankAccount {
  id: string;
  namaBank: string;
  nomorRekening: string;
  atasNama: string;
}

interface PengaturanClientProps {
  user: {
    id: string;
    nama: string;
    email: string;
  };
  initialProfilKos: any;
  initialBankAccounts: BankAccount[];
  initialUsers?: any[];
}

export default function PengaturanClient({
  user,
  initialProfilKos,
  initialBankAccounts,
  initialUsers = [],
}: PengaturanClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { setProfil } = useProfilKos();

  const [activeTab, setActiveTab] = useState<'profil' | 'akses' | 'pembayaran' | 'log'>('profil');
  const [userLogs, setUserLogs] = useState<any[]>([]);
  const [logSearchQuery, setLogSearchQuery] = useState('');

  const fetchLogs = React.useCallback(async () => {
    try {
      const res = await fetch('/api/logs');
      const data = await res.json();
      if (data.success) {
        setUserLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Error fetching activity logs:', err);
    }
  }, []);

  React.useEffect(() => {
    if (activeTab === 'log') {
      fetchLogs();
      const interval = setInterval(fetchLogs, 4000);
      return () => clearInterval(interval);
    }
  }, [activeTab, fetchLogs]);

  // Profil Kos Form state
  const [namaKos, setNamaKos] = useState(initialProfilKos?.namaKos || 'Kos Tri J');
  const [noHp, setNoHp] = useState(initialProfilKos?.nomorHp || '081234567890');
  const [alamat, setAlamat] = useState(initialProfilKos?.alamat || 'Jl. Mawar No. 12, Kebayoran Baru');
  const [kota, setKota] = useState(initialProfilKos?.kota || 'Jakarta Selatan');
  const [kodePos, setKodePos] = useState(initialProfilKos?.kodePos || '12345');
  const [website, setWebsite] = useState(initialProfilKos?.website || 'https://kosmaju.com');
  const [logoUrl, setLogoUrl] = useState(initialProfilKos?.logoUrl || '/images/default-logo.png');

  // Cropping & Upload states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);

  // Tab 3: Bank Accounts states
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(initialBankAccounts);
  const [bankName, setBankName] = useState('');
  const [bankNo, setBankNo] = useState('');
  const [bankOwner, setBankOwner] = useState('');

  // Tab 2: Users Management (Peran & Akses) states
  const [users, setUsers] = useState(initialUsers);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Modals for User additions/edits
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'OWNER' | 'TENANT'>('TENANT');
  const [newUserNomorHp, setNewUserNomorHp] = useState('');

  // Edit User Modal states
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserNomorHp, setEditUserNomorHp] = useState('');
  const [editUserRole, setEditUserRole] = useState<'OWNER' | 'TENANT'>('TENANT');
  const [editUserPassword, setEditUserPassword] = useState('');

  // Info details modals
  const [viewCredentialsUser, setViewCredentialsUser] = useState<any | null>(null);
  const [viewContractUser, setViewContractUser] = useState<any | null>(null);

  // Status Alerts
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Profile update handler
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const res = await updateProfilKosAction({
        namaKos,
        nomorHp: noHp,
        alamat,
        kota,
        kodePos,
        website,
        logoUrl,
      });
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg('Pengaturan profil kos berhasil disimpan!');
        if (res.profil) {
          setProfil(res.profil);
        }
        router.refresh();
      }
    });
  };

  // Bank accounts handlers
  const handleAddBankAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName.trim() || !bankNo.trim() || !bankOwner.trim()) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await createBankAccAction(bankName.trim(), bankNo.trim(), bankOwner.trim());
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg('Rekening bank berhasil ditambahkan!');
        setBankAccounts((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            namaBank: bankName.trim(),
            nomorRekening: bankNo.trim(),
            atasNama: bankOwner.trim(),
          },
        ]);
        setBankName('');
        setBankNo('');
        setBankOwner('');
        router.refresh();
      }
    });
  };

  const handleDeleteBankAccount = (id: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const res = await deleteBankAccAction(id);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg('Rekening bank berhasil dihapus!');
        setBankAccounts((prev) => prev.filter((acc) => acc.id !== id));
        router.refresh();
      }
    });
  };

  // User accounts handlers
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim() || !newUserNomorHp.trim()) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await createUserAction(
        newUserName.trim(),
        newUserEmail.trim(),
        newUserPassword.trim(),
        newUserRole,
        newUserNomorHp.trim()
      );
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(res.message || 'Pengguna berhasil ditambahkan.');
        const createdUser = {
          id: Math.random().toString(),
          nama: newUserName.trim(),
          email: newUserEmail.trim(),
          role: newUserRole,
          nomorHp: newUserNomorHp.trim(),
          createdAt: new Date(),
        };
        setUsers((prev) => [createdUser, ...prev]);
        setIsAddUserModalOpen(false);
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserNomorHp('');
        router.refresh();
      }
    });
  };

  const handleOpenEditUser = (u: any) => {
    setEditingUser(u);
    setEditUserName(u.nama);
    setEditUserEmail(u.email);
    setEditUserNomorHp(u.nomorHp || '');
    setEditUserRole(u.role);
    setEditUserPassword('');
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editUserName.trim() || !editUserEmail.trim() || !editUserNomorHp.trim()) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await updateUserAction(
        editingUser.id,
        editUserName.trim(),
        editUserEmail.trim(),
        editUserNomorHp.trim(),
        editUserRole,
        editUserPassword.trim() || undefined
      );
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(res.message || 'Pengguna berhasil diperbarui.');
        setUsers((prev) =>
          prev.map((u) =>
            u.id === editingUser.id
              ? {
                  ...u,
                  nama: editUserName.trim(),
                  email: editUserEmail.trim(),
                  nomorHp: editUserNomorHp.trim(),
                  role: editUserRole,
                }
              : u
          )
        );
        setEditingUser(null);
        router.refresh();
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
        router.refresh();
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
      case 'TENANT':
      default:
        return 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40';
    }
  };

  const filteredUsers = users.filter((u) => {
    if (userSearchQuery.trim()) {
      const q = userSearchQuery.toLowerCase();
      return u.nama.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Pengaturan Kos</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">Konfigurasi profile kos, akun pengguna, peran, akses, dan bank transfer</p>
        </div>
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Left Side Tab Navigation */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-1.5 h-fit lg:col-span-1">
          {/* Tab 1: Profil Kos */}
          <button
            onClick={() => {
              setActiveTab('profil');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
              activeTab === 'profil'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Profil Kos</span>
          </button>

          {/* Tab 2: Peran & Akses */}
          <button
            onClick={() => {
              setActiveTab('akses');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
              activeTab === 'akses'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Peran & Akses</span>
          </button>

          {/* Tab 3: Pembayaran */}
          <button
            onClick={() => {
              setActiveTab('pembayaran');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
              activeTab === 'pembayaran'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <span>Pembayaran</span>
          </button>

          {/* Tab 4: User Activity Log */}
          <button
            onClick={() => {
              setActiveTab('log');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
              activeTab === 'log'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>User Activity Log</span>
          </button>
        </div>

        {/* Right Side Form Content */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 lg:col-span-3 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-5 gap-4">
            <div className="flex items-center gap-4">
              <img
                src={logoUrl || '/images/default-logo.png'}
                alt="Logo Kos"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=120&q=80';
                }}
                className="h-14 w-14 rounded-2xl object-cover border border-slate-200 dark:border-slate-800 shadow-md shadow-blue-500/10 shrink-0"
              />
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">{namaKos}</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">{alamat}, {kota}</p>
              </div>
            </div>
          </div>

          {/* Profile settings form */}
          {activeTab === 'profil' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="bg-slate-50/50 dark:bg-slate-950/40 p-4.5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                <label className="block text-xs font-bold text-slate-755 dark:text-slate-300 uppercase tracking-wider">
                  Logo Kos
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <img
                    src={logoUrl || '/images/default-logo.png'}
                    alt="Logo Kos Preview"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/default-logo.png';
                    }}
                    className="h-16 w-16 rounded-2xl object-cover border border-slate-200 dark:border-slate-800 shadow-sm shrink-0 bg-white"
                  />
                  <div className="flex-1 w-full space-y-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/jpeg,image/png,image/jpg,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 2 * 1024 * 1024) {
                          setErrorMsg("Ukuran logo maksimal 2MB.");
                          return;
                        }
                        const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
                        if (!validTypes.includes(file.type)) {
                          setErrorMsg("Gunakan file JPG, JPEG, PNG, atau WebP.");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = () => {
                          setImageSrc(reader.result as string);
                          setCropZoom(1);
                          setCropX(0);
                          setCropY(0);
                          setIsCropModalOpen(true);
                        };
                        reader.readAsDataURL(file);
                      }}
                      className="hidden"
                    />
                    <div className="flex flex-wrap gap-2.5">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-md shadow-blue-500/10 transition-colors cursor-pointer"
                      >
                        Pilih & Crop Logo
                      </button>
                      {logoUrl && logoUrl !== '/images/default-logo.png' && (
                        <button
                          type="button"
                          onClick={() => setLogoUrl('/images/default-logo.png')}
                          className="px-4 py-2.5 rounded-xl bg-red-55/20 border border-red-200 dark:border-red-900/60 hover:bg-red-100/40 dark:hover:bg-red-950/20 text-xs font-bold text-red-600 dark:text-red-400 transition-colors cursor-pointer"
                        >
                          Hapus Logo
                        </button>
                      )}
                    </div>
                    <p className="text-[9px] text-slate-400 dark:text-slate-505 font-semibold">Mendukung format JPG, JPEG, PNG, atau WebP. Maksimal 2MB.</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="namaKos" className="block text-xs font-bold text-slate-750 dark:text-slate-350 uppercase tracking-wider">
                    Nama Kos
                  </label>
                  <input
                    id="namaKos"
                    type="text"
                    required
                    value={namaKos}
                    onChange={(e) => setNamaKos(e.target.value)}
                    className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900"
                  />
                </div>

                <div>
                  <label htmlFor="noHp" className="block text-xs font-bold text-slate-750 dark:text-slate-350 uppercase tracking-wider">
                    No. HP Pemilik
                  </label>
                  <input
                    id="noHp"
                    type="text"
                    required
                    value={noHp}
                    onChange={(e) => setNoHp(e.target.value)}
                    className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="alamat" className="block text-xs font-bold text-slate-750 dark:text-slate-350 uppercase tracking-wider">
                  Alamat Lengkap
                </label>
                <input
                  id="alamat"
                  type="text"
                  required
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="kota" className="block text-xs font-bold text-slate-750 dark:text-slate-350 uppercase tracking-wider">
                    Kota
                  </label>
                  <input
                    id="kota"
                    type="text"
                    required
                    value={kota}
                    onChange={(e) => setKota(e.target.value)}
                    className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900"
                  />
                </div>

                <div>
                  <label htmlFor="kodePos" className="block text-xs font-bold text-slate-750 dark:text-slate-350 uppercase tracking-wider">
                    Kode Pos
                  </label>
                  <input
                    id="kodePos"
                    type="text"
                    required
                    value={kodePos}
                    onChange={(e) => setKodePos(e.target.value)}
                    className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="website" className="block text-xs font-bold text-slate-750 dark:text-slate-350 uppercase tracking-wider">
                  Website
                </label>
                <input
                  id="website"
                  type="text"
                  required
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900"
                />
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-500 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          )}

          {/* User management tab (Peran & Akses) */}
          {activeTab === 'akses' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">Daftar Akun & Hak Akses</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
                    Buat, ubah, dan atur akun owner dan penyewa kos di sistem.
                  </p>
                </div>
                <button
                  onClick={() => setIsAddUserModalOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-500 transition-colors shadow-sm cursor-pointer"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Tambah Pengguna
                </button>
              </div>

              {/* Local search user */}
              <div className="relative w-full sm:w-72 bg-white dark:bg-slate-900">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <svg className="h-4 w-4 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Cari pengguna..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-850 pl-9 pr-4 py-2 text-xs text-slate-800 dark:text-white placeholder-slate-400 border border-slate-200 dark:border-slate-700 outline-none focus:bg-white dark:focus:bg-slate-900"
                />
              </div>

              {/* Users table */}
              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                  <thead className="bg-slate-50 dark:bg-slate-950">
                    <tr className="text-left text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">
                      <th className="px-5 py-3">Nama</th>
                      <th className="px-5 py-3">Peran</th>
                      <th className="px-5 py-3">Gmail / No. HP</th>
                      <th className="px-5 py-3">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-850 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-350">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-10 text-slate-400 italic">
                          Tidak ada data pengguna ditemukan.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((item, idx) => {
                        const { loginTerakhir, status } = getUserRowData(item, idx);
                        const isSelf = item.id === user.id;

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-xs uppercase">
                                  {item.nama.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                                    {item.nama}
                                    {isSelf && (
                                      <span className="px-1.5 py-0.5 rounded text-[8px] bg-blue-100 dark:bg-blue-950/45 text-blue-600 dark:text-blue-400">
                                        Saya
                                      </span>
                                    )}
                                  </p>
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Log: {loginTerakhir}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${getRoleBadgeStyles(item.role)}`}>
                                {item.role === 'OWNER' ? 'Owner (Pemilik)' : 'Tenant (Penyewa)'}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <p className="text-slate-800 dark:text-white">{item.email}</p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">{item.nomorHp || '-'}</p>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleOpenEditUser(item)}
                                  className="px-2 py-1 rounded bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <svg className="h-3 w-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                  Edit
                                </button>
                                {!isSelf && (
                                  <button
                                    onClick={() => handleDeleteUser(item.id)}
                                    className="px-2 py-1 rounded bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/40 hover:bg-red-100 dark:hover:bg-red-900/30 text-[10px] font-bold cursor-pointer"
                                  >
                                    Hapus
                                  </button>
                                )}
                                {item.role === 'TENANT' && (
                                  <>
                                    <button
                                      onClick={() => setViewCredentialsUser(item)}
                                      className="px-2 py-1 rounded bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-[10px] font-bold cursor-pointer"
                                    >
                                      Kirim WA
                                    </button>
                                    <button
                                      onClick={() => setViewContractUser(item)}
                                      className="px-2 py-1 rounded bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-[10px] font-bold cursor-pointer"
                                    >
                                      Kontrak
                                    </button>
                                  </>
                                )}
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
          )}

          {/* Bank Accounts management tab */}
          {activeTab === 'pembayaran' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">Kelola Rekening Pembayaran</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
                  Daftar rekening bank Anda yang akan ditampilkan kepada penyewa untuk bukti transfer.
                </p>
              </div>

              {/* Bank accounts list */}
              <div className="space-y-3">
                {bankAccounts.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic">Belum ada rekening pembayaran terdaftar.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {bankAccounts.map((acc) => (
                      <div key={acc.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">{acc.namaBank}</span>
                          <h4 className="text-sm font-black text-slate-800 dark:text-white mt-1">{acc.nomorRekening}</h4>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-semibold">a/n {acc.atasNama}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteBankAccount(acc.id)}
                          disabled={isPending}
                          className="text-xs text-red-500 hover:text-red-650 font-bold p-1 cursor-pointer disabled:opacity-50"
                        >
                          Hapus
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Account form */}
              <form onSubmit={handleAddBankAccount} className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Tambah Rekening Baru</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Nama Bank</label>
                    <input
                      type="text"
                      required
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="Contoh: Bank BCA, Mandiri"
                      className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-3.5 py-2 text-xs text-slate-800 dark:text-white outline-none focus:bg-white dark:focus:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Nomor Rekening</label>
                    <input
                      type="text"
                      required
                      value={bankNo}
                      onChange={(e) => setBankNo(e.target.value)}
                      placeholder="Contoh: 8127391823"
                      className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-3.5 py-2 text-xs text-slate-800 dark:text-white outline-none focus:bg-white dark:focus:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Atas Nama</label>
                    <input
                      type="text"
                      required
                      value={bankOwner}
                      onChange={(e) => setBankOwner(e.target.value)}
                      placeholder="Contoh: Budi Sudarsono"
                      className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-3.5 py-2 text-xs text-slate-800 dark:text-white outline-none focus:bg-white dark:focus:bg-slate-900"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-500 disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? 'Menambahkan...' : 'Tambah Rekening'}
                </button>
              </form>
            </div>
          )}

          {/* User Activity Log tab */}
          {activeTab === 'log' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">User Activity Log Real-time</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
                    Riwayat seluruh aktivitas Owner & Penyewa (Login, Logout, Transaksi, Edit Data, Upload, WhatsApp, Pengaturan).
                  </p>
                </div>
                <button
                  onClick={fetchLogs}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs cursor-pointer"
                >
                  🔄 Refresh Log
                </button>
              </div>

              {/* Search Log */}
              <div className="relative w-full sm:w-80">
                <input
                  type="text"
                  placeholder="Filter log (Nama, Tipe, Deskripsi)..."
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-850 px-3.5 py-2 text-xs text-slate-800 dark:text-white placeholder-slate-400 border border-slate-200 dark:border-slate-700 outline-none"
                />
              </div>

              {/* Log Table */}
              <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Waktu</th>
                      <th className="px-4 py-3">Pengguna & Role</th>
                      <th className="px-4 py-3">Aktivitas</th>
                      <th className="px-4 py-3">Rincian Deskripsi</th>
                      <th className="px-4 py-3">Perangkat / IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {userLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                          Belum ada aktivitas tercatat.
                        </td>
                      </tr>
                    ) : (
                      userLogs
                        .filter((l) => {
                          if (!logSearchQuery.trim()) return true;
                          const q = logSearchQuery.toLowerCase();
                          return (
                            (l.namaUser && l.namaUser.toLowerCase().includes(q)) ||
                            (l.tipe && l.tipe.toLowerCase().includes(q)) ||
                            (l.deskripsi && l.deskripsi.toLowerCase().includes(q))
                          );
                        })
                        .map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-3 font-semibold whitespace-nowrap text-slate-500 dark:text-slate-400">
                              {new Date(log.createdAt).toLocaleString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-bold text-slate-900 dark:text-white">{log.namaUser || 'Sistem'}</p>
                              <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-900/40">
                                {log.role || 'USER'}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-extrabold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                              {log.tipe}
                            </td>
                            <td className="px-4 py-3 font-medium">{log.deskripsi}</td>
                            <td className="px-4 py-3 text-[10px] text-slate-400 font-mono whitespace-nowrap">
                              {log.ipAddress || '127.0.0.1'} ({log.device || 'Desktop'} / {log.browser || 'Browser'})
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Tambah Pengguna */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Tambah Pengguna Baru</h3>
              <button onClick={() => setIsAddUserModalOpen(false)} className="text-slate-400 hover:text-slate-655 p-1 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:bg-white"
                  placeholder="Dimas Prasetyo"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Gmail / Username Login</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:bg-white"
                  placeholder="dimas@gmail.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Password Awal</label>
                <input
                  type="password"
                  required
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:bg-white"
                  placeholder="Min. 6 karakter"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Nomor HP / WhatsApp</label>
                <input
                  type="text"
                  required
                  value={newUserNomorHp}
                  onChange={(e) => setNewUserNomorHp(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:bg-white"
                  placeholder="081234567890"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Peran (Role)</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-3.5 py-2.5 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500 font-bold"
                >
                  <option value="TENANT" className="dark:bg-slate-900">Tenant (Penyewa Kos)</option>
                  <option value="OWNER" className="dark:bg-slate-900">Owner (Pemilik Kos)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-500 cursor-pointer"
                >
                  Simpan Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Pengguna */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Akun Pengguna</h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-655 p-1 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Gmail / Username</label>
                <input
                  type="email"
                  required
                  value={editUserEmail}
                  onChange={(e) => setEditUserEmail(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Nomor HP</label>
                <input
                  type="text"
                  required
                  value={editUserNomorHp}
                  onChange={(e) => setEditUserNomorHp(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Peran (Role)</label>
                <select
                  value={editUserRole}
                  onChange={(e) => setEditUserRole(e.target.value as any)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-3.5 py-2.5 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500 font-bold"
                >
                  <option value="TENANT" className="dark:bg-slate-900">Tenant (Penyewa Kos)</option>
                  <option value="OWNER" className="dark:bg-slate-900">Owner (Pemilik Kos)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                  Password Baru <span className="text-[10px] text-slate-400 normal-case">(kosongkan jika tidak diubah)</span>
                </label>
                <input
                  type="password"
                  value={editUserPassword}
                  onChange={(e) => setEditUserPassword(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:bg-white"
                  placeholder="Minimal 6 karakter"
                />
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
                  className="rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-500 cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Kirim Kredensial WA */}
      {viewCredentialsUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Kirim Kredensial Akses</h3>
              <button onClick={() => setViewCredentialsUser(null)} className="text-slate-400 hover:text-slate-655 p-1 cursor-pointer">
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs font-semibold text-slate-600 dark:text-slate-350">
              <p>Anda akan mengirimkan pesan WhatsApp otomatis berisi detail login akun penyewa kos berikut:</p>
              
              <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                <p>Nama: <span className="text-slate-800 dark:text-white font-bold">{viewCredentialsUser.nama}</span></p>
                <p>Email: <span className="text-slate-800 dark:text-white font-bold">{viewCredentialsUser.email}</span></p>
                <p>No. WhatsApp: <span className="text-slate-800 dark:text-white font-bold">{viewCredentialsUser.nomorHp || 'Belum diisi'}</span></p>
                <p>Tautan Web: <span className="text-blue-600 hover:underline">http://localhost:3000/login</span></p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setViewCredentialsUser(null)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-xs font-bold text-slate-500 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Tutup
                </button>
                <button
                  onClick={() => {
                    handleSendCredentials(viewCredentialsUser);
                    setViewCredentialsUser(null);
                  }}
                  className="rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-500 cursor-pointer"
                >
                  Kirim Sekarang
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Lihat / Unduh Kontrak */}
      {viewContractUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Dokumen Kontrak Sewa</h3>
              <button onClick={() => setViewContractUser(null)} className="text-slate-400 hover:text-slate-655 p-1 cursor-pointer">
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs font-semibold text-slate-600 dark:text-slate-350">
              <p>Detail dokumen kontrak sewa kos aktif atas nama:</p>

              <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                <p>Penyewa: <span className="text-slate-800 dark:text-white font-bold">{viewContractUser.nama}</span></p>
                <p>Status Kontrak: <span className="text-emerald-600 font-bold">Aktif</span></p>
                <p>Mulai Sewa: <span className="text-slate-800 dark:text-white font-bold">10 Juli 2025</span></p>
                <p>File Dokumen: <span className="text-slate-800 dark:text-white font-bold">KONTRAK_{viewContractUser.nama.toUpperCase().replace(/\s+/g, '_')}.pdf</span></p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setViewContractUser(null)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-xs font-bold text-slate-500 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Kembali
                </button>
                <button
                  onClick={() => {
                    handleDownloadContract(viewContractUser);
                    setViewContractUser(null);
                  }}
                  className="rounded-xl bg-purple-650 py-2.5 text-xs font-bold text-white shadow-md hover:bg-purple-600 cursor-pointer"
                >
                  Unduh PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Crop Modal */}
      {isCropModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Sesuaikan Logo Kos</h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-505 font-medium">Gunakan slider di bawah untuk mengatur perbesaran dan posisi logo.</p>
            </div>

            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-dashed border-slate-202 dark:border-slate-800">
              <div className="w-[200px] h-[200px] overflow-hidden relative border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950 flex items-center justify-center shadow-inner">
                <img
                  src={imageSrc || ''}
                  alt="Crop Preview Source"
                  style={{
                    transform: `scale(${cropZoom}) translate(${cropX}px, ${cropY}px)`,
                    maxWidth: 'none',
                    maxHeight: '100%',
                    position: 'absolute',
                    transition: 'none',
                  }}
                />
              </div>
            </div>

            <div className="space-y-4">
              {/* Zoom Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-slate-500">
                  <span>Zoom</span>
                  <span>{cropZoom.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.05"
                  value={cropZoom}
                  onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              {/* Offset X Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-slate-500">
                  <span>Geser Horisontal (X)</span>
                  <span>{cropX}px</span>
                </div>
                <input
                  type="range"
                  min="-150"
                  max="150"
                  step="1"
                  value={cropX}
                  onChange={(e) => setCropX(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              {/* Offset Y Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-slate-500">
                  <span>Geser Vertikal (Y)</span>
                  <span>{cropY}px</span>
                </div>
                <input
                  type="range"
                  min="-150"
                  max="150"
                  step="1"
                  value={cropY}
                  onChange={(e) => setCropY(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsCropModalOpen(false);
                  setImageSrc(null);
                }}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-center"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const img = new Image();
                  img.src = imageSrc!;
                  img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = 200;
                    canvas.height = 200;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                      ctx.fillStyle = '#ffffff';
                      ctx.fillRect(0, 0, 200, 200);

                      const size = Math.min(img.width, img.height);
                      const sSize = size / cropZoom;
                      const sx = (img.width - sSize) / 2 - (cropX * (img.width / 200)) / cropZoom;
                      const sy = (img.height - sSize) / 2 - (cropY * (img.height / 200)) / cropZoom;

                      ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, 200, 200);
                      const croppedBase64 = canvas.toDataURL('image/jpeg', 0.9);
                      setLogoUrl(croppedBase64);
                      setIsCropModalOpen(false);
                    }
                  };
                }}
                className="flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 shadow-md shadow-blue-500/10 cursor-pointer text-center"
              >
                Potong & Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
