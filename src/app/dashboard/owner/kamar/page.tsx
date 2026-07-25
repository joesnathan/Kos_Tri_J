import prisma from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import KamarClient from '@/app/dashboard/owner/kamar/KamarClient';

export const dynamic = 'force-dynamic';

export default async function OwnerKamarPage() {
  const user = await getUserFromSession();

  if (!user || user.role !== 'OWNER') {
    redirect('/login');
  }

  // Load all rooms with their tenants, invoices, and complaints from database
  const rooms = await prisma.kamar.findMany({
    include: {
      users: {
        select: {
          id: true,
          nama: true,
          email: true,
          nomorHp: true,
          tagihan: {
            select: {
              bulanTagihan: true,
              status: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      },
      keluhan: {
        select: {
          id: true,
          deskripsi: true,
          status: true,
          prioritas: true,
        },
      },
    },
  });

  // Sort rooms numerically (e.g. "Kamar 1", "Kamar 2", ..., "Kamar 10")
  rooms.sort((a, b) => {
    const numA = parseInt(a.nomorKamar.replace(/^\D+/g, '')) || 0;
    const numB = parseInt(b.nomorKamar.replace(/^\D+/g, '')) || 0;
    return numA - numB;
  });

  // Load all existing tenants to support easy dropdown selections when editing
  const tenants = await prisma.user.findMany({
    where: { role: 'TENANT' },
    select: {
      id: true,
      nama: true,
      email: true,
      nomorHp: true,
    },
    orderBy: { nama: 'asc' },
  });

  return <KamarClient user={user} initialRooms={rooms} tenantsList={tenants} />;
}

