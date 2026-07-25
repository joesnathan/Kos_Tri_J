import { redirect } from 'next/navigation';
import { getUserFromSession } from '@/lib/auth';
import OwnerLayoutClient from '@/app/dashboard/owner/OwnerLayoutClient';
import { getProfilKosAction } from '@/app/actions/owner';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface OwnerLayoutProps {
  children: React.ReactNode;
}

export default async function OwnerLayout({ children }: OwnerLayoutProps) {
  const user = await getUserFromSession();

  // Redirect to login if user is unauthenticated or has another role
  if (!user || user.role !== 'OWNER') {
    redirect('/login');
  }

  const { profil } = await getProfilKosAction();

  // Query notification indicators in layout to feed the top navbar bell dropdown
  const pendingPayments = await prisma.tagihan.findMany({
    where: { status: 'MENUNGGU_VERIFIKASI' },
    include: {
      user: {
        select: {
          nama: true,
          kamar: { select: { nomorKamar: true } },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const activeComplaints = await prisma.keluhan.findMany({
    where: { NOT: { status: 'Selesai' } },
    include: {
      kamar: { select: { nomorKamar: true } },
      tenant: { select: { nama: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const unpaidBills = await prisma.tagihan.findMany({
    where: { status: 'BELUM_BAYAR' },
    include: {
      user: {
        select: {
          nama: true,
          kamar: { select: { nomorKamar: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <OwnerLayoutClient
      user={user}
      initialProfilKos={profil}
      pendingPayments={pendingPayments}
      activeComplaints={activeComplaints}
      unpaidBills={unpaidBills}
    >
      {children}
    </OwnerLayoutClient>
  );
}

