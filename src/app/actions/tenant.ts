'use server';

import prisma from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

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
 * Server Action for tenants to fetch their active/latest invoice and the owner's bank account details.
 */
export async function getActiveInvoiceAction(): Promise<InvoiceResult> {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'TENANT') {
      return { error: 'Unauthorized: Hanya tenant yang dapat mengakses invoice.' };
    }

    // Fetch the latest invoice for this tenant (includes previous proof of transfer)
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

    // Fetch owner's bank account details
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
 * Saves the receipt URL and updates the invoice status to MENUNGGU_VERIFIKASI.
 * Locks the upload if status is already MENUNGGU_VERIFIKASI.
 */
export async function uploadBuktiTransferAction(
  tagihanId: string,
  fotoResi: string,
  catatan?: string
): Promise<UploadResult> {
  // Input Validation
  if (!tagihanId || !fotoResi) {
    return { error: 'ID Tagihan dan Foto Resi wajib disertakan.' };
  }

  // Validate that the image URL is a valid URL and uses http/https protocol (XSS & SSRF mitigation)
  try {
    const parsedUrl = new URL(fotoResi);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return { error: 'Format URL foto resi tidak valid.' };
    }
  } catch (e) {
    return { error: 'Format URL foto resi tidak valid.' };
  }

  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'TENANT') {
      return { error: 'Unauthorized: Hanya tenant yang dapat mengupload bukti pembayaran.' };
    }

    // Retrieve the target invoice
    const invoice = await prisma.tagihan.findUnique({
      where: { id: tagihanId },
    });

    if (!invoice) {
      return { error: 'Tagihan tidak ditemukan.' };
    }

    // Enforce authorization: Tenant can only upload for their own invoices
    if (invoice.userId !== user.id) {
      return { error: 'Unauthorized: Anda tidak memiliki akses ke tagihan ini.' };
    }

    // Prevent double-uploads/spam when status is already MENUNGGU_VERIFIKASI
    if (invoice.status === 'MENUNGGU_VERIFIKASI') {
      return { error: 'Upload terkunci: Pembayaran Anda sedang menunggu verifikasi pemilik.' };
    }

    // Prevent uploads if invoice is already paid (LUNAS)
    if (invoice.status === 'LUNAS') {
      return { error: 'Upload ditolak: Tagihan ini sudah lunas.' };
    }

    // Perform database operations in a transaction to ensure atomic updates
    await prisma.$transaction(async (tx) => {
      // Upsert the transfer proof (replaces or creates depending on previous attempts)
      await tx.buktiTransfer.upsert({
        where: { tagihanId },
        create: {
          tagihanId,
          fotoResi,
          catatan: catatan || null,
          alasanDitolak: null, // Clear any previous rejection reason
        },
        update: {
          fotoResi,
          catatan: catatan || null,
          alasanDitolak: null, // Clear any previous rejection reason
          tanggalUpload: new Date(),
        },
      });

      // Update the invoice status
      await tx.tagihan.update({
        where: { id: tagihanId },
        data: { status: 'MENUNGGU_VERIFIKASI' },
      });
    });

    // Revalidate paths to refresh page data
    revalidatePath('/dashboard/tenant');

    return {
      success: true,
      message: 'Bukti transfer berhasil diunggah. Menunggu verifikasi pemilik.',
    };
  } catch (error) {
    console.error('Error saving transfer proof:', error);
    return { error: 'Terjadi kesalahan sistem saat menyimpan bukti transfer.' };
  }
}
