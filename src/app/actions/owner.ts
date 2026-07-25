'use server';

import prisma from '@/lib/prisma';
import { getUserFromSession, hashPassword } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { sendEmailNotification } from '@/lib/email';

export type InvoicesResult = {
  success?: boolean;
  error?: string;
  invoices?: unknown[];
};

export type ActionStatusResult = {
  success?: boolean;
  error?: string;
  message?: string;
  id?: string;
};

export type RevenueReportResult = {
  success?: boolean;
  error?: string;
  totalRevenue?: number;
  monthlyRevenue?: Array<{
    bulanTagihan: string;
    total: number;
    count: number;
  }>;
};

// Expanded Activity Logging Helper
export async function createLogAktivitas(
  tipe: string,
  deskripsi: string,
  meta?: {
    userId?: string;
    namaUser?: string;
    role?: string;
    ipAddress?: string;
    device?: string;
    browser?: string;
  }
) {
  try {
    let userId = meta?.userId;
    let namaUser = meta?.namaUser;
    let role = meta?.role;

    if (!userId) {
      const activeUser = await getUserFromSession();
      if (activeUser) {
        userId = activeUser.id;
        namaUser = activeUser.nama;
        role = activeUser.role;
      }
    }

    await (prisma as any).logAktivitas.create({
      data: {
        tipe,
        deskripsi,
        userId: userId || null,
        namaUser: namaUser || 'Sistem',
        role: role || 'SYSTEM',
        ipAddress: meta?.ipAddress || '127.0.0.1',
        device: meta?.device || 'Desktop',
        browser: meta?.browser || 'Browser',
      },
    });
  } catch (err) {
    console.error('Error creating log aktivitas:', err);
  }
}

export async function createNotifikasi(userId: string | null, judul: string, deskripsi: string, tautan?: string) {
  try {
    await prisma.notifikasi.create({
      data: {
        userId,
        judul,
        deskripsi,
        tautan,
      },
    });
  } catch (err) {
    console.error('Error creating notifikasi:', err);
  }
}

// Invoice Number Auto-Generator
async function generateInvoiceNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `INV/${year}/${month}/`;

  const count = await (prisma as any).tagihan.count({
    where: {
      nomorInvoice: {
        startsWith: prefix,
      },
    },
  });

  return `${prefix}${String(count + 1).padStart(4, '0')}`;
}

/**
 * Server Action to fetch pending invoices.
 */
export async function getPendingInvoicesAction(): Promise<InvoicesResult> {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'OWNER') {
      return { error: 'Unauthorized: Akses ditolak.' };
    }

    const invoices = await prisma.tagihan.findMany({
      where: { status: 'MENUNGGU_VERIFIKASI' },
      include: {
        user: {
          select: {
            id: true,
            nama: true,
            email: true,
            nomorHp: true,
            kamar: { select: { nomorKamar: true } },
          },
        },
        buktiTransfer: {
          select: {
            id: true,
            fotoResi: true,
            tanggalUpload: true,
            catatan: true,
          },
        },
      },
      orderBy: { updatedAt: 'asc' },
    });

    return { success: true, invoices };
  } catch (error) {
    console.error('Error fetching pending invoices:', error);
    return { error: 'Terjadi kesalahan sistem saat memuat tagihan pending.' };
  }
}

/**
 * Server Action to approve a payment.
 */
export async function approveInvoiceAction(tagihanId: string): Promise<ActionStatusResult> {
  if (!tagihanId) return { error: 'ID Tagihan wajib diisi.' };

  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'OWNER') {
      return { error: 'Unauthorized: Hanya pemilik yang dapat menyetujui pembayaran.' };
    }

    const invoice = await prisma.tagihan.findUnique({
      where: { id: tagihanId },
      include: { user: true },
    });

    if (!invoice) return { error: 'Tagihan tidak ditemukan.' };
    if (invoice.status === 'LUNAS') return { error: 'Tagihan ini sudah berstatus LUNAS.' };

    const autoInvoiceNum = (invoice as any).nomorInvoice || (await generateInvoiceNumber());

    const updatedInvoice: any = await (prisma as any).tagihan.update({
      where: { id: tagihanId },
      data: {
        status: 'LUNAS',
        nomorInvoice: autoInvoiceNum,
      },
      include: {
        user: { select: { nama: true, email: true } },
      },
    });

    await createLogAktivitas(
      'Pembayaran Berhasil',
      `Pembayaran sewa No. Invoice ${autoInvoiceNum} oleh ${updatedInvoice.user.nama} untuk periode ${updatedInvoice.bulanTagihan} disetujui.`
    );
    await createNotifikasi(
      updatedInvoice.userId,
      'Pembayaran Berhasil',
      `Pembayaran sewa untuk periode ${updatedInvoice.bulanTagihan} sebesar Rp ${updatedInvoice.nominal.toLocaleString('id-ID')} telah disetujui pemilik (Invoice: ${autoInvoiceNum}).`,
      '/dashboard/tenant'
    );

    // Send SMTP Email Notification to Owner & Tenant
    await sendEmailNotification({
      subject: `Pembayaran Berhasil - ${updatedInvoice.user.nama} (${autoInvoiceNum})`,
      body: `Pembayaran sewa kos atas nama ${updatedInvoice.user.nama} untuk periode ${updatedInvoice.bulanTagihan} sebesar Rp ${updatedInvoice.nominal.toLocaleString(
        'id-ID'
      )} telah Diverifikasi & Disetujui.\n\nNomor Invoice: ${autoInvoiceNum}\nStatus: LUNAS`,
      type: 'PAYMENT_SUCCESS',
    });

    revalidatePath('/dashboard/owner');
    revalidatePath('/dashboard/tenant');
    revalidatePath('/dashboard/owner/pembayaran');
    revalidatePath('/dashboard/owner/riwayat-bayar');

    return {
      success: true,
      message: `Pembayaran berhasil disetujui. Invoice ${autoInvoiceNum} ditandai LUNAS.`,
    };
  } catch (error) {
    console.error('Error approving invoice:', error);
    return { error: 'Terjadi kesalahan sistem saat menyetujui pembayaran.' };
  }
}

/**
 * Server Action to reject a payment.
 */
export async function rejectInvoiceAction(tagihanId: string, alasanDitolak: string): Promise<ActionStatusResult> {
  if (!tagihanId) return { error: 'ID Tagihan wajib diisi.' };
  if (!alasanDitolak || alasanDitolak.trim().length === 0) return { error: 'Alasan penolakan wajib diisi.' };

  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'OWNER') {
      return { error: 'Unauthorized' };
    }

    const invoice = await prisma.tagihan.findUnique({
      where: { id: tagihanId },
    });

    if (!invoice) return { error: 'Tagihan tidak ditemukan.' };
    if (invoice.status === 'LUNAS') return { error: 'Gagal menolak: Tagihan sudah LUNAS.' };

    const updatedInvoice = await prisma.$transaction(async (tx) => {
      await tx.buktiTransfer.update({
        where: { tagihanId },
        data: { alasanDitolak: alasanDitolak.trim() },
      });

      return tx.tagihan.update({
        where: { id: tagihanId },
        data: { status: 'DITOLAK' },
        include: { user: { select: { nama: true, email: true } } },
      });
    });

    await createLogAktivitas(
      'Pembayaran Ditolak',
      `Pembayaran sewa oleh ${updatedInvoice.user.nama} untuk periode ${updatedInvoice.bulanTagihan} ditolak. Alasan: ${alasanDitolak}`
    );
    await createNotifikasi(
      updatedInvoice.userId,
      'Pembayaran Ditolak',
      `Pembayaran sewa untuk periode ${updatedInvoice.bulanTagihan} ditolak. Alasan: ${alasanDitolak}`,
      '/dashboard/tenant'
    );

    // Send Email Notification
    await sendEmailNotification({
      subject: `Pembayaran Ditolak - ${updatedInvoice.user.nama}`,
      body: `Pembayaran sewa kos oleh ${updatedInvoice.user.nama} untuk periode ${updatedInvoice.bulanTagihan} ditolak.\n\nAlasan: ${alasanDitolak}\n\nSilakan penyewa melakukan upload ulang bukti pembayaran yang valid.`,
      type: 'PAYMENT_FAILED',
    });

    revalidatePath('/dashboard/owner');
    revalidatePath('/dashboard/tenant');
    revalidatePath('/dashboard/owner/pembayaran');

    return {
      success: true,
      message: 'Pembayaran berhasil ditolak. Alasan penolakan telah disimpan.',
    };
  } catch (error) {
    console.error('Error rejecting invoice:', error);
    return { error: 'Terjadi kesalahan sistem saat menolak pembayaran.' };
  }
}

/**
 * Server Action to generate an invoice manually.
 */
export async function createInvoiceAction(
  userId: string,
  nominal: number,
  bulanTagihan: string,
  metodePembayaran?: string
): Promise<ActionStatusResult> {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'OWNER') return { error: 'Unauthorized' };

    const nomorInvoice = await generateInvoiceNumber();

    const createdInvoice: any = await (prisma as any).tagihan.create({
      data: {
        nomorInvoice,
        userId,
        nominal,
        bulanTagihan,
        metodePembayaran: metodePembayaran || 'Transfer Bank',
        status: 'BELUM_BAYAR',
      },
      include: { user: { select: { nama: true } } },
    });

    await createLogAktivitas(
      'Tambah Data',
      `Tagihan baru ${nomorInvoice} sebesar Rp ${nominal.toLocaleString('id-ID')} dibuat untuk ${createdInvoice.user.nama}.`
    );

    revalidatePath('/dashboard/owner/pembayaran');
    revalidatePath('/dashboard/owner/riwayat-bayar');
    revalidatePath('/dashboard/owner');
    return { success: true, message: `Invoice ${nomorInvoice} berhasil dibuat.`, id: createdInvoice.id };
  } catch (error) {
    console.error('Error creating invoice:', error);
    return { error: 'Terjadi kesalahan sistem saat membuat invoice.' };
  }
}

// ==========================================
// KELOLA PENYEWA ACTIONS (EDIT & DELETE)
// ==========================================

export async function editTenantAction(
  tenantId: string,
  nama: string,
  email: string,
  nomorHp: string,
  kamarId?: string | null
): Promise<ActionStatusResult> {
  if (!tenantId || !nama || !email) {
    return { error: 'Nama dan Email wajib diisi.' };
  }

  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'OWNER') return { error: 'Unauthorized' };

    const currentTenant = await prisma.user.findUnique({
      where: { id: tenantId },
      include: { kamar: true },
    });

    if (!currentTenant) return { error: 'Penyewa tidak ditemukan.' };

    // Check email uniqueness if email changed
    if (email !== currentTenant.email) {
      const emailExists = await prisma.user.findUnique({ where: { email } });
      if (emailExists) return { error: 'Email sudah terdaftar pada pengguna lain.' };
    }

    const previousKamarId = currentTenant.kamarId;
    const targetKamarId = kamarId === 'none' || !kamarId ? null : kamarId;

    await prisma.$transaction(async (tx) => {
      // Update tenant fields
      await tx.user.update({
        where: { id: tenantId },
        data: {
          nama,
          email,
          nomorHp,
          kamarId: targetKamarId,
        },
      });

      // Handle room changes
      if (previousKamarId && previousKamarId !== targetKamarId) {
        const remainingTenants = await tx.user.count({
          where: { kamarId: previousKamarId, NOT: { id: tenantId } },
        });
        if (remainingTenants === 0) {
          await tx.kamar.update({
            where: { id: previousKamarId },
            data: { status: 'Kosong' },
          });
        }
      }

      if (targetKamarId && previousKamarId !== targetKamarId) {
        await tx.kamar.update({
          where: { id: targetKamarId },
          data: { status: 'Terisi' },
        });
      }
    });

    await createLogAktivitas('Edit Data', `Data penyewa ${nama} berhasil diperbarui oleh Pemilik.`);

    revalidatePath('/dashboard/owner/penyewa');
    revalidatePath('/dashboard/owner/kamar');
    revalidatePath('/dashboard/owner/pengguna');
    revalidatePath('/dashboard/owner');
    revalidatePath('/dashboard/tenant');

    return { success: true, message: 'Data penyewa berhasil diperbarui.' };
  } catch (error) {
    console.error('Error editing tenant:', error);
    return { error: 'Terjadi kesalahan sistem saat memperbarui data penyewa.' };
  }
}

// ==========================================
// JADWAL & KALENDER ACTIONS (CRUD)
// ==========================================

export async function getJadwalAction() {
  try {
    const user = await getUserFromSession();
    if (!user) return { error: 'Unauthorized' };

    const jadwalList = await (prisma as any).jadwal.findMany({
      orderBy: { tanggal: 'asc' },
    });
    return { success: true, jadwalList };
  } catch (error) {
    console.error('Error fetching jadwal:', error);
    return { error: 'Gagal mengambil data jadwal.' };
  }
}

export async function createJadwalAction(
  judul: string,
  tanggal: string,
  tipe: 'pembayaran' | 'maintenance' | 'kontrak' | 'lainnya',
  deskripsi?: string,
  tautan?: string
): Promise<ActionStatusResult> {
  if (!judul || !tanggal) return { error: 'Judul dan tanggal wajib diisi.' };

  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'OWNER') return { error: 'Unauthorized' };

    const newJadwal = await (prisma as any).jadwal.create({
      data: {
        judul,
        tanggal: new Date(tanggal),
        tipe,
        deskripsi: deskripsi || null,
        tautan: tautan || null,
      },
    });

    await createLogAktivitas('Tambah Data', `Jadwal baru "${judul}" (${tipe}) ditambahkan pada tanggal ${tanggal.split('T')[0]}.`);

    await sendEmailNotification({
      subject: `Jadwal Baru Dibuat - ${judul}`,
      body: `Jadwal baru telah ditambahkan ke kalender kos.\n\nJudul: ${judul}\nTanggal: ${tanggal.split('T')[0]}\nTipe: ${tipe}\nDeskripsi: ${deskripsi || '-'}`,
      type: 'IMPORTANT_SCHEDULE',
    });

    revalidatePath('/dashboard/owner/kalender');
    revalidatePath('/dashboard/owner');

    return { success: true, message: 'Jadwal berhasil ditambahkan.', id: newJadwal.id };
  } catch (error) {
    console.error('Error creating jadwal:', error);
    return { error: 'Terjadi kesalahan sistem saat menambahkan jadwal.' };
  }
}

export async function updateJadwalAction(
  id: string,
  judul: string,
  tanggal: string,
  tipe: 'pembayaran' | 'maintenance' | 'kontrak' | 'lainnya',
  deskripsi?: string,
  tautan?: string
): Promise<ActionStatusResult> {
  if (!id || !judul || !tanggal) return { error: 'Field wajib tidak lengkap.' };

  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'OWNER') return { error: 'Unauthorized' };

    await (prisma as any).jadwal.update({
      where: { id },
      data: {
        judul,
        tanggal: new Date(tanggal),
        tipe,
        deskripsi: deskripsi || null,
        tautan: tautan || null,
      },
    });

    await createLogAktivitas('Edit Data', `Jadwal "${judul}" berhasil diperbarui.`);

    revalidatePath('/dashboard/owner/kalender');
    revalidatePath('/dashboard/owner');

    return { success: true, message: 'Jadwal berhasil diperbarui.' };
  } catch (error) {
    console.error('Error updating jadwal:', error);
    return { error: 'Terjadi kesalahan sistem saat memperbarui jadwal.' };
  }
}

export async function deleteJadwalAction(id: string): Promise<ActionStatusResult> {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'OWNER') return { error: 'Unauthorized' };

    const deleted = await (prisma as any).jadwal.delete({ where: { id } });
    await createLogAktivitas('Hapus Data', `Jadwal "${deleted.judul}" telah dihapus dari kalender.`);

    revalidatePath('/dashboard/owner/kalender');
    revalidatePath('/dashboard/owner');

    return { success: true, message: 'Jadwal berhasil dihapus.' };
  } catch (error) {
    console.error('Error deleting jadwal:', error);
    return { error: 'Terjadi kesalahan sistem saat menghapus jadwal.' };
  }
}

// ==========================================
// DOKUMEN KONTRAK SEWA ACTIONS (CRUD)
// ==========================================

export async function getKontrakAction() {
  try {
    const user = await getUserFromSession();
    if (!user) return { error: 'Unauthorized' };

    const kontrakList = await (prisma as any).kontrak.findMany({
      include: {
        tenant: { select: { id: true, nama: true, email: true, nomorHp: true } },
        kamar: { select: { id: true, nomorKamar: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, kontrakList };
  } catch (error) {
    console.error('Error fetching kontrak:', error);
    return { error: 'Gagal mengambil data kontrak.' };
  }
}

export async function createKontrakAction(
  tenantId: string,
  kamarId: string,
  tanggalMulai: string,
  durasiBulan: number,
  fileUrl?: string,
  catatan?: string
): Promise<ActionStatusResult> {
  if (!tenantId || !tanggalMulai || !durasiBulan) {
    return { error: 'Penyewa, tanggal mulai, dan durasi wajib diisi.' };
  }

  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'OWNER') return { error: 'Unauthorized' };

    const tenant = await prisma.user.findUnique({ where: { id: tenantId } });
    if (!tenant) return { error: 'Penyewa tidak ditemukan.' };

    const startDate = new Date(tanggalMulai);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + Number(durasiBulan));

    const count = await (prisma as any).kontrak.count();
    const nomorKontrak = `KTR/${new Date().getFullYear()}/${String(count + 1).padStart(4, '0')}`;

    const newKontrak = await (prisma as any).kontrak.create({
      data: {
        tenantId,
        kamarId: kamarId || tenant.kamarId || null,
        nomorKontrak,
        tanggalMulai: startDate,
        tanggalSelesai: endDate,
        durasiBulan: Number(durasiBulan),
        status: 'Aktif',
        fileUrl: fileUrl || null,
        catatan: catatan || null,
      },
    });

    await createLogAktivitas('Tambah Data', `Kontrak sewa baru ${nomorKontrak} dibuat untuk ${tenant.nama}.`);
    await createNotifikasi(
      tenantId,
      'Kontrak Sewa Baru',
      `Kontrak sewa Anda (${nomorKontrak}) berlaku mulai ${tanggalMulai.split('T')[0]} hingga ${endDate.toISOString().split('T')[0]}.`,
      '/dashboard/tenant'
    );

    revalidatePath('/dashboard/owner/kontrak');
    revalidatePath('/dashboard/owner');

    return { success: true, message: `Kontrak ${nomorKontrak} berhasil dibuat.`, id: newKontrak.id };
  } catch (error) {
    console.error('Error creating kontrak:', error);
    return { error: 'Terjadi kesalahan sistem saat membuat kontrak.' };
  }
}

export async function extendKontrakAction(kontrakId: string, perpanjangBulan: number): Promise<ActionStatusResult> {
  if (!kontrakId || perpanjangBulan <= 0) return { error: 'ID Kontrak dan durasi perpanjangan valid wajib diisi.' };

  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'OWNER') return { error: 'Unauthorized' };

    const existing = await (prisma as any).kontrak.findUnique({
      where: { id: kontrakId },
      include: { tenant: { select: { nama: true } } },
    });

    if (!existing) return { error: 'Kontrak tidak ditemukan.' };

    const currentEnd = new Date(existing.tanggalSelesai);
    currentEnd.setMonth(currentEnd.getMonth() + Number(perpanjangBulan));

    await (prisma as any).kontrak.update({
      where: { id: kontrakId },
      data: {
        tanggalSelesai: currentEnd,
        durasiBulan: existing.durasiBulan + Number(perpanjangBulan),
        status: 'Aktif',
      },
    });

    await createLogAktivitas(
      'Perubahan Pengaturan',
      `Kontrak ${existing.nomorKontrak} (${existing.tenant.nama}) diperpanjang ${perpanjangBulan} bulan hingga ${currentEnd.toISOString().split('T')[0]}.`
    );

    revalidatePath('/dashboard/owner/kontrak');
    revalidatePath('/dashboard/owner');

    return { success: true, message: `Kontrak berhasil diperpanjang hingga ${currentEnd.toISOString().split('T')[0]}.` };
  } catch (error) {
    console.error('Error extending kontrak:', error);
    return { error: 'Terjadi kesalahan sistem saat memperpanjang kontrak.' };
  }
}

export async function deleteKontrakAction(id: string): Promise<ActionStatusResult> {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'OWNER') return { error: 'Unauthorized' };

    const deleted = await (prisma as any).kontrak.delete({ where: { id } });
    await createLogAktivitas('Hapus Data', `Kontrak ${deleted.nomorKontrak} telah dihapus.`);

    revalidatePath('/dashboard/owner/kontrak');
    revalidatePath('/dashboard/owner');

    return { success: true, message: 'Dokumen kontrak berhasil dihapus.' };
  } catch (error) {
    console.error('Error deleting kontrak:', error);
    return { error: 'Terjadi kesalahan sistem saat menghapus kontrak.' };
  }
}

// ==========================================
// USER ACTIVITY LOGS ACTION
// ==========================================

export async function getLogAktivitasAction(limit = 100) {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'OWNER') return { error: 'Unauthorized' };

    const logs = await (prisma as any).logAktivitas.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { nama: true, email: true, role: true } },
      },
    });

    return { success: true, logs };
  } catch (error) {
    console.error('Error fetching log aktivitas:', error);
    return { error: 'Gagal mengambil data log aktivitas.' };
  }
}

// ==========================================
// EXISTING ROOM & REVENUE ACTIONS
// ==========================================

export async function getOwnerRevenueReportAction(): Promise<RevenueReportResult> {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'OWNER') {
      return { error: 'Unauthorized' };
    }

    const totalAggregation = await prisma.tagihan.aggregate({
      where: { status: 'LUNAS' },
      _sum: { nominal: true },
    });

    const monthlyGroups = await prisma.tagihan.groupBy({
      by: ['bulanTagihan'],
      where: { status: 'LUNAS' },
      _sum: { nominal: true },
      _count: { id: true },
      orderBy: { bulanTagihan: 'asc' },
    });

    const totalRevenue = totalAggregation._sum.nominal || 0;
    const monthlyRevenue = monthlyGroups.map((group) => ({
      bulanTagihan: group.bulanTagihan,
      total: group._sum.nominal || 0,
      count: group._count.id,
    }));

    return { success: true, totalRevenue, monthlyRevenue };
  } catch (error) {
    console.error('Error loading revenue report:', error);
    return { error: 'Terjadi kesalahan sistem saat memuat laporan pendapatan.' };
  }
}

export async function createRoomAction(
  nomorKamar: string,
  hargaBulanan: number,
  status: 'Kosong' | 'Terisi' | 'Perbaikan'
): Promise<ActionStatusResult> {
  if (!nomorKamar || !hargaBulanan) return { error: 'Nomor kamar dan harga bulanan wajib diisi.' };

  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'OWNER') return { error: 'Unauthorized' };

    const existingRoom = await prisma.kamar.findUnique({ where: { nomorKamar } });
    if (existingRoom) return { error: 'Nomor kamar sudah terdaftar.' };

    const createdRoom = await prisma.kamar.create({
      data: { nomorKamar, hargaBulanan, status },
    });

    await createLogAktivitas('Tambah Data', `Kamar baru ${nomorKamar} berhasil dibuat dengan status ${status}.`);

    revalidatePath('/dashboard/owner/kamar');
    revalidatePath('/dashboard/owner');

    return { success: true, message: 'Kamar berhasil ditambahkan.', id: createdRoom.id };
  } catch (error) {
    console.error('Error creating room:', error);
    return { error: 'Terjadi kesalahan sistem saat membuat kamar baru.' };
  }
}

export async function createUserAction(
  nama: string,
  email: string,
  password: string,
  role: 'OWNER' | 'TENANT',
  nomorHp: string
): Promise<ActionStatusResult> {
  if (!nama || !email || !password || !nomorHp) return { error: 'Semua field wajib diisi.' };

  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'OWNER') return { error: 'Unauthorized' };

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return { error: 'Email sudah terdaftar.' };

    const hashedPassword = await hashPassword(password);
    await prisma.user.create({
      data: { nama, email, password: hashedPassword, role, nomorHp },
    });

    await createLogAktivitas('Tambah Data', `Pengguna baru ${nama} (${role}) telah ditambahkan.`);

    revalidatePath('/dashboard/owner/pengguna');
    return { success: true, message: 'Pengguna berhasil dibuat.' };
  } catch (error) {
    console.error('Error creating user:', error);
    return { error: 'Terjadi kesalahan sistem saat membuat pengguna baru.' };
  }
}

export async function deleteUserAction(targetUserId: string): Promise<ActionStatusResult> {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'OWNER') return { error: 'Unauthorized' };

    if (user.id === targetUserId) return { error: 'Anda tidak dapat menghapus akun Anda sendiri.' };

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { nama: true, kamarId: true, kamar: { select: { nomorKamar: true } } },
    });

    if (!targetUser) return { error: 'Pengguna tidak ditemukan.' };

    if (targetUser.kamarId) {
      const otherTenants = await prisma.user.count({
        where: { kamarId: targetUser.kamarId, NOT: { id: targetUserId } },
      });
      if (otherTenants === 0) {
        await prisma.kamar.update({
          where: { id: targetUser.kamarId },
          data: { status: 'Kosong' },
        });
      }
    }

    await prisma.user.delete({ where: { id: targetUserId } });

    const roomInfo = targetUser.kamar?.nomorKamar ? ` (Kamar ${targetUser.kamar.nomorKamar})` : '';
    await createLogAktivitas('Hapus Data', `Penyewa ${targetUser.nama}${roomInfo} telah check-out / dihapus.`);

    await sendEmailNotification({
      subject: `Penyewa Keluar - ${targetUser.nama}`,
      body: `Penyewa ${targetUser.nama}${roomInfo} telah keluar / akunnya dihapus dari sistem.`,
      type: 'TENANT_CHECKOUT',
    });

    revalidatePath('/dashboard/owner/pengguna');
    revalidatePath('/dashboard/owner/kamar');
    revalidatePath('/dashboard/owner');
    return { success: true, message: 'Pengguna berhasil dihapus.' };
  } catch (error) {
    console.error('Error deleting user:', error);
    return { error: 'Terjadi kesalahan sistem saat menghapus pengguna.' };
  }
}

export async function updateRoomDetailsAction(
  roomId: string,
  nomorKamar: string,
  hargaBulanan: number,
  status: 'Kosong' | 'Terisi' | 'Perbaikan',
  selectedTenantId?: string,
  dueDate?: string
): Promise<ActionStatusResult> {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'OWNER') return { error: 'Unauthorized' };

    const originalRoom = await prisma.kamar.findUnique({
      where: { id: roomId },
      select: { status: true, nomorKamar: true },
    });

    if (!originalRoom) return { error: 'Kamar tidak ditemukan.' };

    await prisma.$transaction(async (tx) => {
      await tx.kamar.update({
        where: { id: roomId },
        data: { nomorKamar, hargaBulanan, status },
      });

      if (status === 'Terisi') {
        await tx.user.updateMany({
          where: { kamarId: roomId, role: 'TENANT' },
          data: { kamarId: null },
        });

        if (selectedTenantId && selectedTenantId !== 'none') {
          const tenant = await tx.user.update({
            where: { id: selectedTenantId },
            data: { kamarId: roomId },
          });

          const activeInvoice = await tx.tagihan.findFirst({
            where: { userId: tenant.id },
            orderBy: { createdAt: 'desc' },
          });

          if (!activeInvoice) {
            const currentMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
            await tx.tagihan.create({
              data: {
                userId: tenant.id,
                nominal: hargaBulanan,
                bulanTagihan: dueDate || currentMonthStr,
                status: 'BELUM_BAYAR',
              },
            });
          }
        }
      } else {
        await tx.user.updateMany({
          where: { kamarId: roomId, role: 'TENANT' },
          data: { kamarId: null },
        });
      }
    });

    if (originalRoom.status !== status) {
      await createLogAktivitas('Edit Data', `Status ${originalRoom.nomorKamar} diubah dari ${originalRoom.status} menjadi ${status}.`);
    }

    revalidatePath('/dashboard/owner/kamar');
    revalidatePath('/dashboard/owner');
    revalidatePath('/dashboard/tenant');
    return { success: true, message: 'Detail kamar berhasil diperbarui.' };
  } catch (error) {
    console.error('Error updating room details:', error);
    return { error: 'Terjadi kesalahan sistem saat memperbarui kamar.' };
  }
}

export async function addTenantAction(
  nama: string,
  email: string,
  nomorHp: string,
  kamarId?: string
): Promise<ActionStatusResult> {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'OWNER') return { error: 'Unauthorized' };

    const hashedPassword = await bcrypt.hash('password123', 10);

    const res = await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { email } });
      if (existing) return { error: 'Email sudah terdaftar di sistem.' };

      const tenant = await tx.user.create({
        data: {
          nama,
          email,
          password: hashedPassword,
          role: 'TENANT',
          nomorHp,
          kamarId: kamarId || null,
        },
      });

      if (kamarId) {
        const kamar = await tx.kamar.update({
          where: { id: kamarId },
          data: { status: 'Terisi' },
        });

        const currentMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        await tx.tagihan.create({
          data: {
            userId: tenant.id,
            nominal: kamar.hargaBulanan,
            bulanTagihan: currentMonthStr,
            status: 'BELUM_BAYAR',
          },
        });
      }

      return { success: true, message: 'Penyewa berhasil ditambahkan. Sandi bawaan adalah password123.', tenantId: tenant.id };
    });

    if (res.error) return res;

    if (kamarId) {
      const kamar = await prisma.kamar.findUnique({ where: { id: kamarId } });
      await createLogAktivitas('Tambah Data', `Penyewa baru ${nama} dialokasikan ke ${kamar?.nomorKamar || 'Kamar'}.`);
    } else {
      await createLogAktivitas('Tambah Data', `Penyewa baru ${nama} didaftarkan.`);
    }

    await sendEmailNotification({
      subject: `Penyewa Baru Terdaftar - ${nama}`,
      body: `Penyewa baru telah berhasil didaftarkan di sistem Kos Tri J.\n\nNama: ${nama}\nEmail: ${email}\nNomor HP: ${nomorHp}`,
      type: 'NEW_TENANT',
    });

    revalidatePath('/dashboard/owner/penyewa');
    revalidatePath('/dashboard/owner/kamar');
    revalidatePath('/dashboard/owner/pengguna');
    revalidatePath('/dashboard/owner');

    return { success: true, message: res.message, id: res.tenantId };
  } catch (error) {
    console.error('Error manual adding tenant:', error);
    return { error: 'Terjadi kesalahan sistem saat menambahkan penyewa.' };
  }
}

export type ProfilKosResult = {
  success?: boolean;
  error?: string;
  message?: string;
  profil?: any;
};

export async function getProfilKosAction(): Promise<ProfilKosResult> {
  try {
    let profil = await prisma.profilKos.findFirst();
    if (!profil) {
      profil = await prisma.profilKos.create({
        data: {
          namaKos: 'Kos Tri J',
          nomorHp: '081234567890',
          alamat: 'Jl. Mawar No. 12, Kebayoran Baru',
          kota: 'Jakarta Selatan',
          kodePos: '12345',
          website: 'https://kosmaju.com',
          logoUrl: '/images/default-logo.png',
        },
      });
    }
    return { success: true, profil };
  } catch (error) {
    console.error('Error fetching ProfilKos:', error);
    return { error: 'Terjadi kesalahan sistem saat mengambil data profil kos.' };
  }
}

export async function updateProfilKosAction(data: {
  namaKos: string;
  nomorHp: string;
  alamat: string;
  kota: string;
  kodePos: string;
  website: string;
  logoUrl?: string;
}): Promise<ProfilKosResult> {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'OWNER') {
      return { error: 'Unauthorized' };
    }

    let profil = await prisma.profilKos.findFirst();
    if (!profil) {
      profil = await prisma.profilKos.create({ data });
    } else {
      profil = await prisma.profilKos.update({
        where: { id: profil.id },
        data,
      });
    }

    await createLogAktivitas('Perubahan Pengaturan', `Profil kos "${data.namaKos}" berhasil diperbarui.`);

    revalidatePath('/dashboard/owner');
    revalidatePath('/dashboard/tenant');
    revalidatePath('/dashboard/owner/pengaturan');

    return { success: true, message: 'Profil kos berhasil diperbarui.', profil };
  } catch (error) {
    console.error('Error updating ProfilKos:', error);
    return { error: 'Terjadi kesalahan sistem saat menyimpan profil kos.' };
  }
}

export type ExpenseResult = {
  success?: boolean;
  error?: string;
  message?: string;
  expenses?: unknown[];
};

export async function getExpensesAction(): Promise<ExpenseResult> {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'OWNER') return { error: 'Unauthorized' };
    const expenses = await prisma.pengeluaran.findMany({ orderBy: { tanggal: 'desc' } });
    return { success: true, expenses };
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return { error: 'Terjadi kesalahan sistem saat mengambil data pengeluaran.' };
  }
}

export async function createExpenseAction(
  kategori: string,
  deskripsi: string,
  nominal: number,
  tanggalInput: string,
  adaResi: boolean
): Promise<ActionStatusResult> {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'OWNER') return { error: 'Unauthorized' };

    const createdExpense = await prisma.pengeluaran.create({
      data: {
        kategori,
        deskripsi,
        nominal,
        tanggal: new Date(tanggalInput),
        adaResi,
      },
    });

    await createLogAktivitas('Tambah Data', `Pengeluaran ${kategori} dicatat sebesar Rp ${nominal.toLocaleString('id-ID')}: "${deskripsi}"`);

    revalidatePath('/dashboard/owner/pengeluaran');
    revalidatePath('/dashboard/owner/laporan');
    return { success: true, message: 'Pengeluaran berhasil dicatat.', id: createdExpense.id };
  } catch (error) {
    console.error('Error creating expense:', error);
    return { error: 'Terjadi kesalahan sistem saat mencatat pengeluaran.' };
  }
}

export async function updateExpenseAction(
  id: string,
  kategori: string,
  deskripsi: string,
  nominal: number,
  tanggalInput: string,
  adaResi: boolean
): Promise<ActionStatusResult> {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'OWNER') return { error: 'Unauthorized' };

    await prisma.pengeluaran.update({
      where: { id },
      data: {
        kategori,
        deskripsi,
        nominal,
        tanggal: new Date(tanggalInput),
        adaResi,
      },
    });

    await createLogAktivitas('Edit Data', `Data pengeluaran "${deskripsi}" diperbarui.`);

    revalidatePath('/dashboard/owner/pengeluaran');
    revalidatePath('/dashboard/owner/laporan');
    return { success: true, message: 'Pengeluaran berhasil diperbarui.' };
  } catch (error) {
    console.error('Error updating expense:', error);
    return { error: 'Terjadi kesalahan sistem saat memperbarui pengeluaran.' };
  }
}

export async function deleteExpenseAction(id: string): Promise<ActionStatusResult> {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'OWNER') return { error: 'Unauthorized' };

    await prisma.pengeluaran.delete({ where: { id } });
    await createLogAktivitas('Hapus Data', `Catatan pengeluaran berhasil dihapus.`);

    revalidatePath('/dashboard/owner/pengeluaran');
    revalidatePath('/dashboard/owner/laporan');
    return { success: true, message: 'Pengeluaran berhasil dihapus.' };
  } catch (error) {
    console.error('Error deleting expense:', error);
    return { error: 'Terjadi kesalahan sistem saat menghapus pengeluaran.' };
  }
}

export async function createBankAccAction(
  namaBank: string,
  nomorRekening: string,
  atasNama: string
): Promise<ActionStatusResult> {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'OWNER') return { error: 'Unauthorized' };

    const createdBank = await prisma.rekeningPemilik.create({
      data: { namaBank, nomorRekening, atasNama },
    });

    await createLogAktivitas('Tambah Data', `Rekening bank baru ${namaBank} (${nomorRekening}) a/n ${atasNama} ditambahkan.`);

    revalidatePath('/dashboard/owner/pengaturan');
    revalidatePath('/dashboard/tenant');
    revalidatePath('/dashboard/owner');
    return { success: true, message: 'Rekening bank berhasil ditambahkan.', id: createdBank.id };
  } catch (error) {
    console.error('Error creating bank account:', error);
    return { error: 'Terjadi kesalahan sistem saat menambahkan rekening.' };
  }
}

export async function deleteBankAccAction(id: string): Promise<ActionStatusResult> {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'OWNER') return { error: 'Unauthorized' };

    await prisma.rekeningPemilik.delete({ where: { id } });
    await createLogAktivitas('Hapus Data', `Rekening bank berhasil dihapus.`);

    revalidatePath('/dashboard/owner/pengaturan');
    revalidatePath('/dashboard/tenant');
    revalidatePath('/dashboard/owner');
    return { success: true, message: 'Rekening bank berhasil dihapus.' };
  } catch (error) {
    console.error('Error deleting bank account:', error);
    return { error: 'Terjadi kesalahan sistem saat menghapus rekening.' };
  }
}

export async function updateUserAction(
  targetUserId: string,
  nama: string,
  email: string,
  nomorHp: string,
  role: 'OWNER' | 'TENANT',
  password?: string
): Promise<ActionStatusResult> {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'OWNER') return { error: 'Akses ditolak.' };

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) return { error: 'Pengguna tidak ditemukan.' };

    if (email !== targetUser.email) {
      const emailExists = await prisma.user.findUnique({ where: { email } });
      if (emailExists) return { error: 'Email sudah terdaftar.' };
    }

    const data: any = { nama, email, nomorHp, role };
    if (password && password.trim() !== '') {
      data.password = await bcrypt.hash(password.trim(), 10);
    }

    await prisma.user.update({
      where: { id: targetUserId },
      data,
    });

    await createLogAktivitas('Edit Data', `Data akun ${nama} (${role}) diperbarui oleh Pemilik.`);

    revalidatePath('/dashboard/owner/pengguna');
    revalidatePath('/dashboard/owner/kamar');
    revalidatePath('/dashboard/owner');
    revalidatePath('/dashboard/tenant');
    return { success: true, message: 'Data pengguna berhasil diperbarui.' };
  } catch (error) {
    console.error('Error updating user:', error);
    return { error: 'Terjadi kesalahan sistem saat memperbarui data pengguna.' };
  }
}

export async function updateComplaintStatusAction(
  complaintId: string,
  status: 'Baru' | 'Diproses' | 'Selesai',
  balasan?: string
): Promise<ActionStatusResult> {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'OWNER') return { error: 'Akses ditolak.' };

    const originalComplaint = await prisma.keluhan.findUnique({
      where: { id: complaintId },
      include: {
        tenant: { select: { nama: true } },
        kamar: { select: { nomorKamar: true } },
      },
    });

    if (!originalComplaint) return { error: 'Keluhan tidak ditemukan.' };

    const dataToUpdate: any = { status };
    if (balasan !== undefined) {
      dataToUpdate.balasan = balasan.trim();
      dataToUpdate.balasanAt = new Date();
    }

    await prisma.keluhan.update({
      where: { id: complaintId },
      data: dataToUpdate,
    });

    const roomInfo = originalComplaint.kamar?.nomorKamar ? ` (Kamar ${originalComplaint.kamar.nomorKamar})` : '';
    await createLogAktivitas('Edit Data', `Status keluhan ${originalComplaint.tenant.nama}${roomInfo} diubah menjadi ${status}.`);
    await createNotifikasi(
      originalComplaint.tenantId,
      `Keluhan Anda ${status}`,
      `Keluhan Anda berstatus: ${status}. ${balasan ? 'Balasan: "' + balasan.substring(0, 40) + '..."' : ''}`,
      '/dashboard/tenant'
    );

    revalidatePath('/dashboard/owner/keluhan');
    revalidatePath('/dashboard/owner');
    revalidatePath('/dashboard/tenant');

    return { success: true, message: 'Status keluhan berhasil diperbarui.' };
  } catch (error) {
    console.error('Error updating complaint status:', error);
    return { error: 'Terjadi kesalahan sistem saat memperbarui status keluhan.' };
  }
}
