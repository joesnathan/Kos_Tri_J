import { redirect } from 'next/navigation';
import { getUserFromSession } from '@/lib/auth';
import KeluhanClient from '@/app/dashboard/owner/keluhan/KeluhanClient';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function OwnerKeluhanPage() {
  const user = await getUserFromSession();

  if (!user || user.role !== 'OWNER') {
    redirect('/login');
  }

  // Load all complaints from DB with room and tenant details
  const complaints = await prisma.keluhan.findMany({
    include: {
      kamar: {
        select: {
          nomorKamar: true,
        },
      },
      tenant: {
        select: {
          nama: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return <KeluhanClient user={user} initialComplaints={complaints} />;
}
