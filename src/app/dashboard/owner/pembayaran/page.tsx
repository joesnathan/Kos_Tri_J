import { redirect } from 'next/navigation';
import { getUserFromSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import PembayaranClient from '@/app/dashboard/owner/pembayaran/PembayaranClient';

export const dynamic = 'force-dynamic';

export default async function OwnerPembayaranPage() {
  const user = await getUserFromSession();

  if (!user || user.role !== 'OWNER') {
    redirect('/login');
  }

  // Fetch all invoices for detailed listings and stats
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

  // Fetch all tenant users to support manual invoice generation
  const tenants = await prisma.user.findMany({
    where: { role: 'TENANT' },
    orderBy: { nama: 'asc' },
  });

  return <PembayaranClient user={user} allInvoices={invoices} tenants={tenants} />;
}
