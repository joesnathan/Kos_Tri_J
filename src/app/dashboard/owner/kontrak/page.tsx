import { redirect } from 'next/navigation';
import { getUserFromSession } from '@/lib/auth';
import KontrakClient from '@/app/dashboard/owner/kontrak/KontrakClient';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function OwnerKontrakPage() {
  const user = await getUserFromSession();

  if (!user || user.role !== 'OWNER') {
    redirect('/login');
  }

  const db = prisma as any;

  // Fetch tenants
  const tenants = await db.user.findMany({
    where: { role: 'TENANT' },
    select: {
      id: true,
      nama: true,
      email: true,
      nomorHp: true,
      kamarId: true,
      kamar: { select: { id: true, nomorKamar: true, hargaBulanan: true } },
    },
  });

  // Fetch vacant rooms for assignment
  const vacantRooms = await db.kamar.findMany({
    select: { id: true, nomorKamar: true, hargaBulanan: true },
  });

  // Fetch contracts
  const dbContracts = await db.kontrak.findMany({
    include: {
      tenant: { select: { id: true, nama: true, email: true, nomorHp: true } },
      kamar: { select: { id: true, nomorKamar: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <KontrakClient
      user={user}
      initialTenants={tenants}
      vacantRooms={vacantRooms}
      initialContracts={dbContracts}
    />
  );
}
