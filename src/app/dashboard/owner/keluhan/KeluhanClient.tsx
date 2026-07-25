'use client';

import React, { useState, useTransition } from 'react';
import { updateComplaintStatusAction } from '@/app/actions/owner';

interface KeluhanClientProps {
  user: {
    nama: string;
    email: string;
  };
  initialComplaints?: any[];
}

interface ComplaintItem {
  id: string;
  code: string;
  description: string;
  tenantName: string;
  room: string;
  date: string;
  priority: 'Rendah' | 'Sedang' | 'Tinggi';
  status: 'Baru' | 'Diproses' | 'Selesai';
  balasan?: string;
  balasanAt?: string;
}

export default function KeluhanClient({ user, initialComplaints = [] }: KeluhanClientProps) {
  const [isPending, startTransition] = useTransition();

  const [complaints, setComplaints] = useState<ComplaintItem[]>(() => {
    return initialComplaints.map((c: any) => ({
      id: c.id,
      code: `C-${c.id.substring(0, 4).toUpperCase()}`,
      description: c.deskripsi,
      tenantName: c.tenant ? c.tenant.nama : 'Penyewa',
      room: c.kamar ? c.kamar.nomorKamar.replace('Kamar ', 'R') : 'R--',
      date: new Date(c.createdAt).toISOString().split('T')[0],
      priority: c.prioritas as any,
      status: c.status as any,
      balasan: c.balasan || '',
      balasanAt: c.balasanAt ? new Date(c.balasanAt).toISOString().split('T')[0] : '',
    }));
  });

  // Modal Reply states
  const [activeComplaint, setActiveComplaint] = useState<ComplaintItem | null>(null);
  const [replyText, setReplyText] = useState('');
  const [nextStatus, setNextStatus] = useState<'Diproses' | 'Selesai'>('Diproses');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openReplyModal = (c: ComplaintItem, targetStatus: 'Diproses' | 'Selesai') => {
    setActiveComplaint(c);
    setReplyText(c.balasan || '');
    setNextStatus(targetStatus);
    setIsModalOpen(true);
  };

  const handleSaveReply = () => {
    if (!activeComplaint) return;
    startTransition(async () => {
      const res = await updateComplaintStatusAction(activeComplaint.id, nextStatus, replyText);
      if (!res.error) {
        setComplaints((prev) =>
          prev.map((c) =>
            c.id === activeComplaint.id
              ? {
                  ...c,
                  status: nextStatus,
                  balasan: replyText,
                  balasanAt: new Date().toISOString().split('T')[0],
                }
              : c
          )
        );
        setIsModalOpen(false);
        setActiveComplaint(null);
        setReplyText('');
      }
    });
  };

  const getPriorityBadgeStyles = (priority: string) => {
    switch (priority) {
      case 'Tinggi':
        return 'bg-red-50 dark:bg-red-955/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/40';
      case 'Sedang':
        return 'bg-amber-50 dark:bg-amber-955/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40';
      case 'Rendah':
      default:
        return 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700';
    }
  };

  // Columns filter
  const baruList = complaints.filter((c) => c.status === 'Baru');
  const diprosesList = complaints.filter((c) => c.status === 'Diproses');
  const selesaiList = complaints.filter((c) => c.status === 'Selesai');

  return (
    <div className="p-6 space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Keluhan Penyewa</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">Pantau dan kelola keluhan dari penyewa kos menggunakan papan Kanban</p>
        </div>
      </div>

      {/* Kanban Board columns wrapper */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Column 1: Baru */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-202 dark:border-slate-800 pb-2">
            <h3 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-wider">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              Baru ({baruList.length})
            </h3>
          </div>

          <div className="space-y-3 min-h-[400px]">
            {baruList.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-400 dark:text-slate-500 font-semibold">
                Tidak ada keluhan baru.
              </div>
            ) : (
              baruList.map((c) => (
                <div
                  key={c.id}
                  className="bg-white dark:bg-slate-900 p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">{c.code}</span>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${getPriorityBadgeStyles(c.priority)}`}>
                      {c.priority}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-slate-850 dark:text-white leading-relaxed">{c.description}</p>

                  <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-slate-800 dark:text-white font-bold">{c.tenantName}</p>
                      <p className="text-slate-400 dark:text-slate-500 text-[9px] font-medium">{c.room} • {c.date}</p>
                    </div>
                    <button
                      onClick={() => openReplyModal(c, 'Diproses')}
                      disabled={isPending}
                      className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] transition-colors cursor-pointer shadow-sm"
                    >
                      Proses
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: Diproses */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-202 dark:border-slate-800 pb-2">
            <h3 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-wider">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              Diproses ({diprosesList.length})
            </h3>
          </div>

          <div className="space-y-3 min-h-[400px]">
            {diprosesList.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-400 dark:text-slate-500 font-semibold">
                Tidak ada keluhan diproses.
              </div>
            ) : (
              diprosesList.map((c) => (
                <div
                  key={c.id}
                  className="bg-white dark:bg-slate-900 p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">{c.code}</span>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${getPriorityBadgeStyles(c.priority)}`}>
                      {c.priority}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-slate-850 dark:text-white leading-relaxed">{c.description}</p>

                  {c.balasan && (
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800/80 text-[10px] leading-relaxed">
                      <p className="font-bold text-slate-700 dark:text-slate-300">Respon Anda:</p>
                      <p className="text-slate-500 dark:text-slate-450 mt-0.5">{c.balasan}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-slate-800 dark:text-white font-bold">{c.tenantName}</p>
                      <p className="text-slate-400 dark:text-slate-500 text-[9px] font-medium">{c.room} • {c.date}</p>
                    </div>
                    <button
                      onClick={() => openReplyModal(c, 'Selesai')}
                      disabled={isPending}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition-colors cursor-pointer shadow-sm"
                    >
                      Selesai
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 3: Selesai */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-202 dark:border-slate-800 pb-2">
            <h3 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-wider">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Selesai ({selesaiList.length})
            </h3>
          </div>

          <div className="space-y-3 min-h-[400px]">
            {selesaiList.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-400 dark:text-slate-500 font-semibold">
                Belum ada keluhan selesai.
              </div>
            ) : (
              selesaiList.map((c) => (
                <div
                  key={c.id}
                  className="bg-white dark:bg-slate-900 p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 opacity-80 hover:opacity-100 transition-opacity"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">{c.code}</span>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${getPriorityBadgeStyles(c.priority)}`}>
                      {c.priority}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-slate-850 dark:text-white line-through leading-relaxed">{c.description}</p>

                  {c.balasan && (
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800/80 text-[10px] leading-relaxed">
                      <p className="font-bold text-emerald-700 dark:text-emerald-400">Pesan Solusi:</p>
                      <p className="text-slate-500 dark:text-slate-450 mt-0.5">{c.balasan}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-slate-800 dark:text-white font-bold">{c.tenantName}</p>
                      <p className="text-slate-400 dark:text-slate-500 text-[9px] font-medium">{c.room} • {c.date}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openReplyModal(c, 'Selesai')}
                        className="text-[9px] text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer bg-transparent border-none"
                      >
                        Edit Solusi
                      </button>
                      <span className="text-emerald-600 dark:text-emerald-400 font-black text-xs">✓ Selesai</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Reply Modal */}
      {isModalOpen && activeComplaint && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Balas Keluhan {activeComplaint.code}</h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">Kirim balasan tanggapan Anda ke penyewa kamar.</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1 text-xs">
              <p className="font-bold text-slate-800 dark:text-slate-200">Keluhan:</p>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-semibold italic">"{activeComplaint.description}"</p>
              <p className="text-[10px] text-slate-400 mt-1.5 font-medium">Penyewa: {activeComplaint.tenantName} ({activeComplaint.room})</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider mb-2">
                  Status Selanjutnya
                </label>
                <select
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500 cursor-pointer shadow-sm"
                >
                  <option value="Diproses">Diproses</option>
                  <option value="Selesai">Selesai</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider mb-2">
                  Pesan Balasan Pemilik
                </label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Ketik balasan untuk penyewa..."
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-850 px-4 py-2.5 text-xs text-slate-800 dark:text-white outline-none focus:border-blue-500 shadow-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setActiveComplaint(null);
                  setReplyText('');
                }}
                className="flex-1 rounded-xl border border-slate-202 dark:border-slate-750 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-center"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveReply}
                disabled={isPending}
                className="flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 shadow-md shadow-blue-500/10 cursor-pointer text-center"
              >
                {isPending ? 'Menyimpan...' : 'Simpan & Kirim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
