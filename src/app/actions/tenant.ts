'use server';

import prisma from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { createLogAktivitas, createNotifikasi } from './owner';
import { sendEmailNotification } from '@/lib/email';

export type InvoiceResult = {
  success?: boolean;
  error?: string;
  invoice?: any;
  bankAccounts?: any[];
};

export type UploadResult = {
  success?: boolean;
  error?: string;
  message?: string;
};

/**
 * Server Action for tenants to fetch their active/latest invoice and owner bank details.
 */
export async function getActiveInvoiceAction(): Promise<InvoiceResult> {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'TENANT') {
      return { error: 'Unauthorized: Hanya tenant yang dapat mengakses invoice.' };
    }

    const invoice = await prisma.tagihan.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        buktiTransfer: {
          select: {
            id: true,
            fotoResi: true,
            tanggalUpload: true,
            catatan: true,
            alasanDitolak: true,
          },
        },
      },
    });

    const bankAccounts = await prisma.rekeningPemilik.findMany({
      select: {
        id: true,
        namaBank: true,
        nomorRekening: true,
        atasNama: true,
      },
    });

    return {
      success: true,
      invoice: invoice || null,
      bankAccounts,
    };
  } catch (error) {
    console.error('Error fetching tenant active invoice:', error);
    return { error: 'Terjadi kesalahan saat memuat data invoice.' };
  }
}

/**
 * Server Action for tenants to upload proof of transfer.
 */
export async function uploadBuktiTransferAction(
  tagihanId: string,
  fotoResi: string,
  catatan?: string
): Promise<UploadResult> {
  if (!tagihanId || !fotoResi) {
    return { error: 'ID Tagihan dan Foto Resi wajib disertakan.' };
  }

  try {
    const parsedUrl = new URL(fotoResi);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return { error: 'Format URL foto resi tidak valid.' };
    }
  } catch {
    return { error: 'Format URL foto resi tidak valid.' };
  }

  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'TENANT') {
      return { error: 'Unauthorized: Hanya tenant yang dapat mengupload bukti pembayaran.' };
    }

    const invoice = await prisma.tagihan.findUnique({
      where: { id: tagihanId },
    });

    if (!invoice) return { error: 'Tagihan tidak ditemukan.' };
    if (invoice.userId !== user.id) return { error: 'Unauthorized.' };
    if (invoice.status === 'MENUNGGU_VERIFIKASI') {
      return { error: 'Upload terkunci: Pembayaran Anda sedang menunggu verifikasi pemilik.' };
    }
    if (invoice.status === 'LUNAS') {
      return { error: 'Upload ditolak: Tagihan ini sudah lunas.' };
    }

    await prisma.$transaction(async (tx) => {
      await tx.buktiTransfer.upsert({
        where: { tagihanId },
        create: {
          tagihanId,
          fotoResi,
          catatan: catatan || null,
          alasanDitolak: null,
        },
        update: {
          fotoResi,
          catatan: catatan || null,
          alasanDitolak: null,
          tanggalUpload: new Date(),
        },
      });

      await tx.tagihan.update({
        where: { id: tagihanId },
        data: { status: 'MENUNGGU_VERIFIKASI' },
      });
    });

    await createLogAktivitas(
      'Pembayaran Menunggu Verifikasi',
      `Penyewa ${user.nama} mengunggah bukti transfer sewa periode ${invoice.bulanTagihan}.`,
      { userId: user.id, namaUser: user.nama, role: 'TENANT' }
    );
    await createNotifikasi(
      null,
      'Pembayaran Menunggu Verifikasi',
      `Penyewa ${user.nama} mengunggah bukti transfer sewa periode ${invoice.bulanTagihan}.`,
      '/dashboard/owner/pembayaran'
    );

    // Send SMTP email notification to owner
    await sendEmailNotification({
      subject: `Bukti Pembayaran Diunggah - ${user.nama}`,
      body: `Penyewa ${user.nama} telah mengunggah bukti transfer pembayaran sewa periode ${invoice.bulanTagihan} sebesar Rp ${invoice.nominal.toLocaleString(
        'id-ID'
      )}.\n\nSilakan verifikasi melalui dashboard pemilik kos.`,
      type: 'PAYMENT_SUCCESS',
    });

    revalidatePath('/dashboard/tenant');
    revalidatePath('/dashboard/owner');
    revalidatePath('/dashboard/owner/pembayaran');

    return {
      success: true,
      message: 'Bukti transfer berhasil diunggah. Menunggu verifikasi pemilik.',
    };
  } catch (error) {
    console.error('Error saving transfer proof:', error);
    return { error: 'Terjadi kesalahan sistem saat menyimpan bukti transfer.' };
  }
}

/**
 * Server Action for tenant to update their profile.
 */
export async function updateTenantProfileAction(
  nama: string,
  email: string,
  nomorHp: string,
  password?: string
): Promise<UploadResult> {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'TENANT') return { error: 'Unauthorized' };

    const updateData: any = { nama, email, nomorHp };
    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 10);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    await createLogAktivitas('Edit Data', `Penyewa ${nama} memperbarui informasi profil akun.`, {
      userId: user.id,
      namaUser: nama,
      role: 'TENANT',
    });

    revalidatePath('/dashboard/tenant');
    return { success: true, message: 'Profil Anda berhasil diperbarui.' };
  } catch (error) {
    console.error('Error updating tenant profile:', error);
    return { error: 'Terjadi kesalahan sistem saat memperbarui profil.' };
  }
}

/**
 * Server Action for tenant to submit a complaint.
 */
export async function submitComplaintAction(
  deskripsi: string,
  prioritas: 'Rendah' | 'Sedang' | 'Tinggi'
): Promise<UploadResult> {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'TENANT') return { error: 'Unauthorized' };

    if (!user.kamarId) {
      return { error: 'Anda belum terdaftar di kamar manapun. Silakan hubungi pemilik kos.' };
    }

    const createdComplaint = await prisma.keluhan.create({
      data: {
        deskripsi,
        prioritas,
        status: 'Baru',
        tenantId: user.id,
        kamarId: user.kamarId,
      },
      include: {
        kamar: { select: { nomorKamar: true } },
      },
    });

    const roomNo = createdComplaint.kamar.nomorKamar;
    await createLogAktivitas('Komplain Baru', `Penyewa ${user.nama} (${roomNo}) mengajukan keluhan baru.`, {
      userId: user.id,
      namaUser: user.nama,
      role: 'TENANT',
    });
    await createNotifikasi(
      null,
      'Keluhan Baru',
      `Keluhan baru dari ${user.nama} (${roomNo}): "${deskripsi.substring(0, 50)}..."`,
      '/dashboard/owner/keluhan'
    );

    // Send email notification to owner
    await sendEmailNotification({
      subject: `Komplain Baru Dari ${user.nama} (${roomNo})`,
      body: `Keluhan baru telah diajukan oleh ${user.nama} (${roomNo}).\n\nPrioritas: ${prioritas}\nDeskripsi: ${deskripsi}`,
      type: 'NEW_COMPLAINT',
    });

    revalidatePath('/dashboard/tenant');
    revalidatePath('/dashboard/owner');
    revalidatePath('/dashboard/owner/keluhan');

    return { success: true, message: 'Keluhan berhasil dikirim ke pemilik kos.' };
  } catch (error) {
    console.error('Error filing complaint:', error);
    return { error: 'Terjadi kesalahan sistem saat membuat keluhan.' };
  }
}

/**
 * Server Action to fetch tenant's complaints.
 */
export async function getTenantComplaintsAction() {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'TENANT') return [];

    return await prisma.keluhan.findMany({
      where: { tenantId: user.id },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    console.error('Error fetching tenant complaints:', error);
    return [];
  }
}
