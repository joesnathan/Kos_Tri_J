'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createExpenseAction, updateExpenseAction, deleteExpenseAction } from '@/app/actions/owner';

interface PengeluaranClientProps {
  user: {
    nama: string;
    email: string;
  };
  initialExpenses: any[];
}

interface ExpenseItem {
  id: string;
  category: 'Listrik' | 'Air' | 'Internet' | 'Maintenance' | 'Kebersihan' | 'Lainnya';
  description: string;
  nominal: number;
  date: string;
  hasReceipt: boolean;
}

export default function PengeluaranClient({ user, initialExpenses = [] }: PengeluaranClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Initialize state with database values
  const [expenses, setExpenses] = useState<ExpenseItem[]>(() => {
    return initialExpenses.map((exp: any) => ({
      id: exp.id,
      category: exp.kategori as any,
      description: exp.deskripsi,
      nominal: exp.nominal,
      date: new Date(exp.tanggal).toISOString().split('T')[0],
      hasReceipt: exp.adaResi,
    }));
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState<'Listrik' | 'Air' | 'Internet' | 'Maintenance' | 'Kebersihan' | 'Lainnya'>('Listrik');
  const [newDescription, setNewDescription] = useState('');
  const [newNominal, setNewNominal] = useState(100000);
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newHasReceipt, setNewHasReceipt] = useState(true);

  // Edit states
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [editCategory, setEditCategory] = useState<'Listrik' | 'Air' | 'Internet' | 'Maintenance' | 'Kebersihan' | 'Lainnya'>('Listrik');
  const [editDescription, setEditDescription] = useState('');
  const [editNominal, setEditNominal] = useState(0);
  const [editDate, setEditDate] = useState('');
  const [editHasReceipt, setEditHasReceipt] = useState(true);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  const formatUnitAmount = (val: number) => {
    if (val >= 1000) {
      return `${val / 1000}k`;
    }
    return formatCurrency(val);
  };

  // Calculations
  const totalExpense = expenses.reduce((acc, exp) => acc + exp.nominal, 0);
  const listrikExpense = expenses.filter((exp) => exp.category === 'Listrik').reduce((acc, exp) => acc + exp.nominal, 0);
  const airExpense = expenses.filter((exp) => exp.category === 'Air').reduce((acc, exp) => acc + exp.nominal, 0);
  const internetExpense = expenses.filter((exp) => exp.category === 'Internet').reduce((acc, exp) => acc + exp.nominal, 0);

  // Handlers
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDescription.trim()) return;

    startTransition(async () => {
      const res = await createExpenseAction(newCategory, newDescription.trim(), newNominal, newDate, newHasReceipt);
      if (res.error) {
        setToastMsg(`Error: ${res.error}`);
      } else {
        setToastMsg('Pengeluaran berhasil disimpan!');
        const newItem: ExpenseItem = {
          id: Math.random().toString(),
          category: newCategory,
          description: newDescription.trim(),
          nominal: newNominal,
          date: newDate,
          hasReceipt: newHasReceipt,
        };
        setExpenses((prev) => [newItem, ...prev]);
        setIsModalOpen(false);
        setNewDescription('');
        setNewNominal(100000);
        setNewCategory('Listrik');
        setNewHasReceipt(true);
        router.refresh();
      }
      setTimeout(() => setToastMsg(null), 3000);
    });
  };

  const handleOpenEdit = (exp: ExpenseItem) => {
    setEditingExpense(exp);
    setEditCategory(exp.category);
    setEditDescription(exp.description);
    setEditNominal(exp.nominal);
    setEditDate(exp.date);
    setEditHasReceipt(exp.hasReceipt);
  };

  const handleUpdateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense || !editDescription.trim()) return;

    startTransition(async () => {
      const res = await updateExpenseAction(
        editingExpense.id,
        editCategory,
        editDescription.trim(),
        editNominal,
        editDate,
        editHasReceipt
      );

      if (res.error) {
        setToastMsg(`Error: ${res.error}`);
      } else {
        setToastMsg('Pengeluaran berhasil diperbarui!');
        setExpenses((prev) =>
          prev.map((exp) => {
            if (exp.id === editingExpense.id) {
              return {
                ...exp,
                category: editCategory,
                description: editDescription.trim(),
                nominal: editNominal,
                date: editDate,
                hasReceipt: editHasReceipt,
              };
            }
            return exp;
          })
        );
        setEditingExpense(null);
        router.refresh();
      }
      setTimeout(() => setToastMsg(null), 3000);
    });
  };

  const handleDeleteExpense = (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pengeluaran ini?')) return;

    startTransition(async () => {
      const res = await deleteExpenseAction(id);
      if (res.error) {
        setToastMsg(`Error: ${res.error}`);
      } else {
        setToastMsg('Pengeluaran berhasil dihapus!');
        setExpenses((prev) => prev.filter((exp) => exp.id !== id));
        router.refresh();
      }
      setTimeout(() => setToastMsg(null), 3000);
    });
  };

  const getCategoryBadgeStyles = (category: string) => {
    switch (category) {
      case 'Listrik':
        return 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40';
      case 'Air':
        return 'bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900/40';
      case 'Internet':
        return 'bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40';
      case 'Maintenance':
        return 'bg-cyan-50 dark:bg-cyan-950/30 text-cyan-600 dark:text-cyan-400 border border-cyan-100 dark:border-cyan-900/40';
      case 'Kebersihan':
        return 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40';
      default:
        return 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Pengeluaran</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">Kelola pengeluaran operasional kos</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-500 active:scale-[0.98] transition-all cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Tambah Pengeluaran
        </button>
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-900 dark:bg-slate-800 text-white px-4.5 py-3 rounded-2xl shadow-xl text-xs font-bold animate-in fade-in slide-in-from-bottom-5 duration-200">
          {toastMsg}
        </div>
      )}

      {/* Summary Cards */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold tracking-wider text-slate-404 dark:text-slate-500 uppercase">Total Pengeluaran</span>
          <h4 className="text-xl font-black text-slate-900 dark:text-white mt-2">{formatCurrency(totalExpense)}</h4>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium">Semua kategori</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold tracking-wider text-slate-404 dark:text-slate-500 uppercase">Biaya Listrik</span>
          <h4 className="text-xl font-bold text-slate-900 dark:text-white mt-2">{formatCurrency(listrikExpense)}</h4>
          <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 font-bold">PLN token & tagihan</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold tracking-wider text-slate-404 dark:text-slate-500 uppercase">Air & PDAM</span>
          <h4 className="text-xl font-bold text-slate-900 dark:text-white mt-2">{formatCurrency(airExpense)}</h4>
          <p className="text-[10px] text-sky-600 dark:text-sky-400 mt-1 font-bold">Kebersihan & air</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold tracking-wider text-slate-404 dark:text-slate-500 uppercase">Internet & Wifi</span>
          <h4 className="text-xl font-bold text-slate-900 dark:text-white mt-2">{formatCurrency(internetExpense)}</h4>
          <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-1 font-bold">Langganan bulanan</p>
        </div>
      </section>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Table List */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Kategori</th>
                  <th className="px-6 py-4">Deskripsi</th>
                  <th className="px-6 py-4">Nominal</th>
                  <th className="px-6 py-4">Tanggal</th>
                  <th className="px-6 py-4">Nota</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500">
                      Belum ada catatan pengeluaran.
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/25 transition-colors">
                      <td className="px-6 py-4.5">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${getCategoryBadgeStyles(exp.category)}`}>
                          {exp.category}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 font-bold text-slate-800 dark:text-white">{exp.description}</td>
                      <td className="px-6 py-4.5 font-bold text-slate-800 dark:text-white">{formatCurrency(exp.nominal)}</td>
                      <td className="px-6 py-4.5 text-slate-500 dark:text-slate-400 font-medium">{exp.date}</td>
                      <td className="px-6 py-4.5">
                        <span className={`text-[10px] font-bold ${exp.hasReceipt ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                          {exp.hasReceipt ? '✔ Ada' : '✕ Tidak'}
                        </span>
                      </td>
                      <td className="px-6 py-4.5">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(exp)}
                            className="text-blue-600 dark:text-blue-400 hover:underline p-1 cursor-pointer font-bold"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="text-red-500 hover:underline p-1 cursor-pointer font-bold"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Category Distribution */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">Distribusi Kategori</h3>
          <div className="space-y-4 pt-1">
            {/* Listrik progress */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-bold">
                <span className="text-slate-655 dark:text-slate-400">⚡ Listrik</span>
                <span className="text-slate-800 dark:text-white">{formatUnitAmount(listrikExpense)}</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  style={{ width: totalExpense > 0 ? `${(listrikExpense / totalExpense) * 100}%` : '0%' }}
                  className="h-full bg-blue-500 rounded-full"
                />
              </div>
            </div>

            {/* Air progress */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-bold">
                <span className="text-slate-655 dark:text-slate-400">💧 Air & PDAM</span>
                <span className="text-slate-800 dark:text-white">{formatUnitAmount(airExpense)}</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  style={{ width: totalExpense > 0 ? `${(airExpense / totalExpense) * 100}%` : '0%' }}
                  className="h-full bg-sky-500 rounded-full"
                />
              </div>
            </div>

            {/* Internet progress */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-bold">
                <span className="text-slate-655 dark:text-slate-400">🌐 Wifi Internet</span>
                <span className="text-slate-800 dark:text-white">{formatUnitAmount(internetExpense)}</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  style={{ width: totalExpense > 0 ? `${(internetExpense / totalExpense) * 100}%` : '0%' }}
                  className="h-full bg-purple-500 rounded-full"
                />
              </div>
            </div>

            {/* Others progress */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-bold">
                <span className="text-slate-655 dark:text-slate-400">🛠️ Kategori Lain</span>
                <span className="text-slate-800 dark:text-white">{formatUnitAmount(totalExpense - listrikExpense - airExpense - internetExpense)}</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  style={{ width: totalExpense > 0 ? `${((totalExpense - listrikExpense - airExpense - internetExpense) / totalExpense) * 100}%` : '0%' }}
                  className="h-full bg-slate-400 rounded-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-202 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Catat Pengeluaran</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 p-1 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="mt-4 space-y-4">
              <div>
                <label htmlFor="kategori" className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                  Kategori
                </label>
                <select
                  id="kategori"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-3.5 py-2.5 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 font-bold"
                >
                  <option value="Listrik" className="dark:bg-slate-900">Listrik</option>
                  <option value="Air" className="dark:bg-slate-900">Air</option>
                  <option value="Internet" className="dark:bg-slate-900">Internet</option>
                  <option value="Maintenance" className="dark:bg-slate-900">Maintenance</option>
                  <option value="Kebersihan" className="dark:bg-slate-900">Kebersihan</option>
                  <option value="Lainnya" className="dark:bg-slate-900">Lainnya</option>
                </select>
              </div>

              <div>
                <label htmlFor="deskripsi" className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                  Deskripsi Pengeluaran
                </label>
                <input
                  id="deskripsi"
                  type="text"
                  required
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Contoh: Pembelian token listrik R02"
                  className="mt-1.5 block w-full rounded-xl border border-slate-202 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-850 dark:text-white outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="nominal" className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                    Nominal (Rp)
                  </label>
                  <input
                    id="nominal"
                    type="number"
                    required
                    min={100}
                    value={newNominal}
                    onChange={(e) => setNewNominal(parseInt(e.target.value) || 0)}
                    className="mt-1.5 block w-full rounded-xl border border-slate-202 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-850 dark:text-white outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900"
                  />
                </div>

                <div>
                  <label htmlFor="tanggal" className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                    Tanggal
                  </label>
                  <input
                    id="tanggal"
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="mt-1.5 block w-full rounded-xl border border-slate-202 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-850 dark:text-white outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newHasReceipt}
                    onChange={(e) => setNewHasReceipt(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 dark:border-slate-750 text-blue-600 focus:ring-blue-500 dark:bg-slate-850"
                  />
                  <span>Memiliki Nota Bukti Fisik</span>
                </label>
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
                  {isPending ? 'Menyimpan...' : 'Simpan Pengeluaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Pengeluaran</h3>
              <button onClick={() => setEditingExpense(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 p-1 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateExpense} className="mt-4 space-y-4">
              <div>
                <label htmlFor="edit_category" className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                  Kategori
                </label>
                <select
                  id="edit_category"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as any)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-3.5 py-2.5 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 font-bold"
                >
                  <option value="Listrik" className="dark:bg-slate-900">Listrik</option>
                  <option value="Air" className="dark:bg-slate-900">Air</option>
                  <option value="Internet" className="dark:bg-slate-900">Internet</option>
                  <option value="Maintenance" className="dark:bg-slate-900">Maintenance</option>
                  <option value="Kebersihan" className="dark:bg-slate-900">Kebersihan</option>
                  <option value="Lainnya" className="dark:bg-slate-900">Lainnya</option>
                </select>
              </div>

              <div>
                <label htmlFor="edit_description" className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                  Deskripsi Pengeluaran
                </label>
                <input
                  id="edit_description"
                  type="text"
                  required
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-202 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-855 dark:text-white outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit_nominal" className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                    Nominal (Rp)
                  </label>
                  <input
                    id="edit_nominal"
                    type="number"
                    required
                    value={editNominal}
                    onChange={(e) => setEditNominal(parseInt(e.target.value) || 0)}
                    className="mt-1.5 block w-full rounded-xl border border-slate-202 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-855 dark:text-white outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900"
                  />
                </div>

                <div>
                  <label htmlFor="edit_date" className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                    Tanggal
                  </label>
                  <input
                    id="edit_date"
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="mt-1.5 block w-full rounded-xl border border-slate-202 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-855 dark:text-white outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editHasReceipt}
                    onChange={(e) => setEditHasReceipt(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 dark:border-slate-750 text-blue-600 focus:ring-blue-500 dark:bg-slate-850"
                  />
                  <span>Memiliki Nota Bukti Fisik</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
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
