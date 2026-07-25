import prisma from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import RiwayatBayarClient from '@/app/dashboard/owner/riwayat-bayar/RiwayatBayarClient';

export const dynamic = 'force-dynamic';

export default async function OwnerRiwayatBayarPage() {
  const user = await getUserFromSession();

  if (!user || user.role !== 'OWNER') {
    redirect('/login');
  }

  // Load all invoices for full history table
  const invoices = await prisma.tagihan.findMany({
    include: {
      user: {
        select: {
          id: true,
          nama: true,
          email: true,
          nomorHp: true,
          kamar: {
            select: {
              nomorKamar: true,
            },
          },
        },
      },
      buktiTransfer: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return <RiwayatBayarClient user={user} initialInvoices={invoices} />;
}
