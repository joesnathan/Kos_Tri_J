import { redirect } from 'next/navigation';
import { getUserFromSession } from '@/lib/auth';
import NotifikasiClient from './NotifikasiClient';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function OwnerNotifikasiPage() {
  const user = await getUserFromSession();

  if (!user || user.role !== 'OWNER') {
    redirect('/login');
  }

  // Fetch pending verifications
  const pendingPayments = await prisma.tagihan.findMany({
    where: { status: 'MENUNGGU_VERIFIKASI' },
    include: {
      user: {
        select: {
          nama: true,
          kamar: {
            select: { nomorKamar: true }
          }
        }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  // Fetch active complaints
  const activeComplaints = await prisma.keluhan.findMany({
    where: { status: { in: ['Baru', 'Diproses'] } },
    include: {
      kamar: { select: { nomorKamar: true } },
      tenant: { select: { nama: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Fetch unpaid bills (late/overdue)
  const unpaidBills = await prisma.tagihan.findMany({
    where: { status: 'BELUM_BAYAR' },
    include: {
      user: {
        select: {
          nama: true,
          kamar: { select: { nomorKamar: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <NotifikasiClient
      user={user}
      pendingPayments={pendingPayments}
      activeComplaints={activeComplaints}
      unpaidBills={unpaidBills}
    />
  );
}

