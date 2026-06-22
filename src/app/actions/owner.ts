'use server';

import prisma from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export type InvoicesResult = {
  success?: boolean;
  error?: string;
  invoices?: any[];
};

export type ActionStatusResult = {
  success?: boolean;
  error?: string;
  message?: string;
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

/**
 * Server Action for owners to fetch all invoices currently awaiting verification.
 * Includes details of the tenant and the proof of transfer.
 */
export async function getPendingInvoicesAction(): Promise<InvoicesResult> {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'OWNER') {
      return { error: 'Unauthorized: Akses ditolak. Hanya pemilik yang dapat memverifikasi pembayaran.' };
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
      orderBy: { updatedAt: 'asc' }, // Older requests first to be fair
    });

    return {
      success: true,
      invoices,
    };
  } catch (error) {
    console.error('Error fetching pending invoices:', error);
    return { error: 'Terjadi kesalahan sistem saat memuat tagihan pending.' };
  }
}

/**
 * Server Action to approve a payment.
 * Marks the invoice status as LUNAS.
 */
export async function approveInvoiceAction(tagihanId: string): Promise<ActionStatusResult> {
  if (!tagihanId) {
    return { error: 'ID Tagihan wajib diisi.' };
  }

  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'OWNER') {
      return { error: 'Unauthorized: Hanya pemilik yang dapat menyetujui pembayaran.' };
    }

    const invoice = await prisma.tagihan.findUnique({
      where: { id: tagihanId },
    });

    if (!invoice) {
      return { error: 'Tagihan tidak ditemukan.' };
    }

    if (invoice.status === 'LUNAS') {
      return { error: 'Tagihan ini sudah berstatus LUNAS.' };
    }

    // Update status to LUNAS
    await prisma.tagihan.update({
      where: { id: tagihanId },
      data: { status: 'LUNAS' },
    });

    // Revalidate relevant cached views
    revalidatePath('/dashboard/owner');
    revalidatePath('/dashboard/tenant');

    return {
      success: true,
      message: 'Pembayaran berhasil disetujui. Tagihan ditandai LUNAS.',
    };
  } catch (error) {
    console.error('Error approving invoice:', error);
    return { error: 'Terjadi kesalahan sistem saat menyetujui pembayaran.' };
  }
}

/**
 * Server Action to reject a payment.
 * Sets invoice status back to DITOLAK and records the rejection reason in BuktiTransfer.
 */
export async function rejectInvoiceAction(
  tagihanId: string,
  alasanDitolak: string
): Promise<ActionStatusResult> {
  if (!tagihanId) {
    return { error: 'ID Tagihan wajib diisi.' };
  }
  if (!alasanDitolak || alasanDitolak.trim().length === 0) {
    return { error: 'Alasan penolakan wajib diisi.' };
  }

  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'OWNER') {
      return { error: 'Unauthorized: Hanya pemilik yang dapat menolak pembayaran.' };
    }

    const invoice = await prisma.tagihan.findUnique({
      where: { id: tagihanId },
    });

    if (!invoice) {
      return { error: 'Tagihan tidak ditemukan.' };
    }

    if (invoice.status === 'LUNAS') {
      return { error: 'Gagal menolak: Tagihan ini sudah berstatus LUNAS.' };
    }

    // Atomic update of proof reason and invoice status
    await prisma.$transaction(async (tx) => {
      // Update rejection reason on transfer proof
      await tx.buktiTransfer.update({
        where: { tagihanId },
        data: { alasanDitolak: alasanDitolak.trim() },
      });

      // Reset invoice status to DITOLAK so tenant can re-upload
      await tx.tagihan.update({
        where: { id: tagihanId },
        data: { status: 'DITOLAK' },
      });
    });

    // Revalidate cached routes
    revalidatePath('/dashboard/owner');
    revalidatePath('/dashboard/tenant');

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
 * Server Action to retrieve the owner's revenue report.
 * Aggregates all paid (LUNAS) invoices.
 */
export async function getOwnerRevenueReportAction(): Promise<RevenueReportResult> {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== 'OWNER') {
      return { error: 'Unauthorized: Hanya pemilik yang dapat mengakses laporan pendapatan.' };
    }

    // Cumulative total revenue
    const totalAggregation = await prisma.tagihan.aggregate({
      where: { status: 'LUNAS' },
      _sum: { nominal: true },
    });

    // Group paid revenue by billing month
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

    return {
      success: true,
      totalRevenue,
      monthlyRevenue,
    };
  } catch (error) {
    console.error('Error loading revenue report:', error);
    return { error: 'Terjadi kesalahan sistem saat memuat laporan pendapatan.' };
  }
}
