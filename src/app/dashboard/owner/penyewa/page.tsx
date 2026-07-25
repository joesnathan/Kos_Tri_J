import prisma from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import PenyewaClient from '@/app/dashboard/owner/penyewa/PenyewaClient';

export const dynamic = 'force-dynamic';

export default async function OwnerPenyewaPage() {
  const user = await getUserFromSession();

  if (!user || user.role !== 'OWNER') {
    redirect('/login');
  }

  // Load all tenant users with their room details
  const tenants = await prisma.user.findMany({
    where: { role: 'TENANT' },
    include: {
      kamar: {
        select: {
          nomorKamar: true,
        },
      },
    },
    orderBy: { nama: 'asc' },
  });

  // Load all vacant rooms so the owner can assign the new tenant
  const vacantRooms = await prisma.kamar.findMany({
    where: { status: 'Kosong' },
    orderBy: { nomorKamar: 'asc' },
  });

  // Sort vacant rooms numerically
  vacantRooms.sort((a, b) => {
    const numA = parseInt(a.nomorKamar.replace(/^\D+/g, '')) || 0;
    const numB = parseInt(b.nomorKamar.replace(/^\D+/g, '')) || 0;
    return numA - numB;
  });

  return <PenyewaClient user={user} initialTenants={tenants} vacantRooms={vacantRooms} />;
}
