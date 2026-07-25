'use client';

import React, { useState } from 'react';

interface MaintenanceClientProps {
  user: {
    nama: string;
    email: string;
  };
}

interface MaintenanceTask {
  id: string;
  name: string;
  room: string;
  priority: 'Rendah' | 'Sedang' | 'Tinggi';
  technician: string;
  date: string;
  cost: number;
  status: 'Menunggu' | 'Diproses' | 'Selesai';
}

export default function MaintenanceClient({ user }: MaintenanceClientProps) {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([
    {
      id: '1',
      name: 'Servis AC R04',
      room: 'R04',
      priority: 'Tinggi',
      technician: 'Pak Budi',
      date: '2025-07-04',
      cost: 450000,
      status: 'Selesai',
    },
    {
      id: '2',
      name: 'Ganti lampu koridor',
      room: 'Koridor Lt.2',
      priority: 'Rendah',
      technician: 'Pak Agus',
      date: '2025-07-06',
      cost: 120000,
      status: 'Diproses',
    },
    {
      id: '3',
      name: 'Perbaiki kunci R08',
      room: 'R08',
      priority: 'Sedang',
      technician: 'Pak Budi',
      date: '2025-07-07',
      cost: 200000,
      status: 'Menunggu',
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRoom, setNewRoom] = useState('R01');
  const [newPriority, setNewPriority] = useState<'Rendah' | 'Sedang' | 'Tinggi'>('Sedang');
  const [newTechnician, setNewTechnician] = useState('');
  const [newCost, setNewCost] = useState(150000);
  const [newStatus, setNewStatus] = useState<'Menunggu' | 'Diproses' | 'Selesai'>('Menunggu');

  // Edit task states
  const [editingTask, setEditingTask] = useState<MaintenanceTask | null>(null);
  const [editName, setEditName] = useState('');
  const [editRoom, setEditRoom] = useState('');
  const [editPriority, setEditPriority] = useState<'Rendah' | 'Sedang' | 'Tinggi'>('Sedang');
  const [editTechnician, setEditTechnician] = useState('');
  const [editCost, setEditCost] = useState(0);
  const [editStatus, setEditStatus] = useState<'Menunggu' | 'Diproses' | 'Selesai'>('Menunggu');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newTechnician.trim()) return;

    const newItem: MaintenanceTask = {
      id: Math.random().toString(),
      name: newName,
      room: newRoom,
      priority: newPriority,
      technician: newTechnician,
      date: new Date().toISOString().split('T')[0],
      cost: newCost,
      status: newStatus,
    };

    setTasks((prev) => [newItem, ...prev]);
    setIsModalOpen(false);
    setNewName('');
    setNewTechnician('');
    setNewRoom('R01');
    setNewPriority('Sedang');
    setNewStatus('Menunggu');
  };

  const handleOpenEdit = (task: MaintenanceTask) => {
    setEditingTask(task);
    setEditName(task.name);
    setEditRoom(task.room);
    setEditPriority(task.priority);
    setEditTechnician(task.technician);
    setEditCost(task.cost);
    setEditStatus(task.status);
  };

  const handleUpdateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editName.trim()) return;

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === editingTask.id) {
          return {
            ...t,
            name: editName,
            room: editRoom,
            priority: editPriority,
            technician: editTechnician,
            cost: editCost,
            status: editStatus,
          };
        }
        return t;
      })
    );

    setEditingTask(null);
  };

  const handleDeleteTask = (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus tugas ini?')) return;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setEditingTask(null);
  };

  const getPriorityBadgeStyles = (priority: string) => {
    switch (priority) {
      case 'Tinggi':
        return 'bg-red-50 text-red-600 border border-red-100';
      case 'Sedang':
        return 'bg-amber-50 text-amber-600 border border-amber-100';
      case 'Rendah':
      default:
        return 'bg-slate-100 text-slate-500 border border-slate-200';
    }
  };

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case 'Selesai':
        return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
      case 'Diproses':
        return 'bg-amber-50 text-amber-600 border border-amber-100';
      case 'Menunggu':
      default:
        return 'bg-slate-100 text-slate-400 border border-slate-200';
    }
  };

  const activeCount = tasks.filter((t) => t.status !== 'Selesai').length;
  const completedCount = tasks.filter((t) => t.status === 'Selesai').length;
  const totalCost = tasks.reduce((acc, t) => acc + t.cost, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 leading-tight">Maintenance</h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">Kelola pekerjaan maintenance properti kos</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-500 active:scale-[0.98] transition-all"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Tambah Tugas
        </button>
      </div>

      {/* Summary metrics cards */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-500 rounded-xl">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          <div>
            <h4 className="text-xl font-bold text-slate-900">{activeCount}</h4>
            <p className="text-xs text-slate-400 font-medium">Aktif</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-500 rounded-xl">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="text-xl font-bold text-slate-900">{completedCount}</h4>
            <p className="text-xs text-slate-400 font-medium">Selesai</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-500 rounded-xl">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h4 className="text-xl font-bold text-slate-900">{formatCurrency(totalCost)}</h4>
            <p className="text-xs text-slate-400 font-medium">Total Estimasi</p>
          </div>
        </div>
      </section>

      {/* Tasks List Table card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="divide-y divide-slate-100">
          {tasks.map((task) => (
            <div key={task.id} className="p-5 flex items-center justify-between hover:bg-slate-50/40 transition-colors">
              <div className="flex items-start gap-4">
                <span className={`px-2 py-0.5 rounded text-[8px] font-bold mt-1 uppercase ${getPriorityBadgeStyles(task.priority)}`}>
                  {task.priority}
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 leading-normal">{task.name}</h4>
                  <p className="text-[10px] text-slate-400 font-semibold mt-1">
                    {task.room} • Teknisi: {task.technician} • {task.date}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs font-extrabold text-slate-800">{formatCurrency(task.cost)}</p>
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold mt-1 ${getStatusBadgeStyles(task.status)}`}>
                    {task.status}
                  </span>
                </div>
                
                <button
                  onClick={() => handleOpenEdit(task)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Tambah Tugas Pemeliharaan</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddTask} className="mt-4 space-y-4">
              <div>
                <label htmlFor="name" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Nama Tugas / Pekerjaan
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50/30 px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                  placeholder="Contoh: Perbaikan Atap Bocor"
                />
              </div>

              <div>
                <label htmlFor="technician" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Nama Pengecek / Teknisi
                </label>
                <input
                  id="technician"
                  type="text"
                  required
                  value={newTechnician}
                  onChange={(e) => setNewTechnician(e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50/30 px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                  placeholder="Contoh: Pak Budi"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="room" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Lokasi / Kamar
                  </label>
                  <input
                    id="room"
                    type="text"
                    required
                    value={newRoom}
                    onChange={(e) => setNewRoom(e.target.value)}
                    className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50/30 px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="cost" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Estimasi Biaya (Rp)
                  </label>
                  <input
                    id="cost"
                    type="number"
                    required
                    value={newCost}
                    onChange={(e) => setNewCost(parseInt(e.target.value) || 0)}
                    className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50/30 px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="priority" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Prioritas
                  </label>
                  <select
                    id="priority"
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50/30 px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-blue-500 font-bold"
                  >
                    <option value="Rendah">Rendah</option>
                    <option value="Sedang">Sedang</option>
                    <option value="Tinggi">Tinggi</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="status" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Status
                  </label>
                  <select
                    id="status"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50/30 px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-blue-500 font-bold"
                  >
                    <option value="Menunggu">Menunggu</option>
                    <option value="Diproses">Diproses</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </div>
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
                  Simpan Tugas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal Dialog */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Edit Tugas Pemeliharaan</h3>
              <button onClick={() => setEditingTask(null)} className="text-slate-400 hover:text-slate-600 p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateTask} className="mt-4 space-y-4">
              <div>
                <label htmlFor="edit_name" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Nama Tugas / Pekerjaan
                </label>
                <input
                  id="edit_name"
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50/30 px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="edit_technician" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Nama Teknisi
                </label>
                <input
                  id="edit_technician"
                  type="text"
                  required
                  value={editTechnician}
                  onChange={(e) => setEditTechnician(e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50/30 px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit_room" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Lokasi / Kamar
                  </label>
                  <input
                    id="edit_room"
                    type="text"
                    required
                    value={editRoom}
                    onChange={(e) => setEditRoom(e.target.value)}
                    className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50/30 px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="edit_cost" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Estimasi Biaya (Rp)
                  </label>
                  <input
                    id="edit_cost"
                    type="number"
                    required
                    value={editCost}
                    onChange={(e) => setEditCost(parseInt(e.target.value) || 0)}
                    className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50/30 px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit_priority" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Prioritas
                  </label>
                  <select
                    id="edit_priority"
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as any)}
                    className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50/30 px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-blue-500 font-bold"
                  >
                    <option value="Rendah">Rendah</option>
                    <option value="Sedang">Sedang</option>
                    <option value="Tinggi">Tinggi</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="edit_status" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Status
                  </label>
                  <select
                    id="edit_status"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50/30 px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-blue-500 font-bold"
                  >
                    <option value="Menunggu">Menunggu</option>
                    <option value="Diproses">Diproses</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => handleDeleteTask(editingTask.id)}
                  className="rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 py-2.5 text-xs font-bold text-red-600 text-center"
                >
                  Hapus
                </button>
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
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
