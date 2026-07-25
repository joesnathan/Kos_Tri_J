import { redirect } from 'next/navigation';
import { getUserFromSession } from '@/lib/auth';
import KalenderClient from '@/app/dashboard/owner/kalender/KalenderClient';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function OwnerKalenderPage() {
  const user = await getUserFromSession();

  if (!user || user.role !== 'OWNER') {
    redirect('/login');
  }

  // Fetch payments
  const invoices = await prisma.tagihan.findMany({
    include: {
      user: {
        select: {
          nama: true,
          kamar: {
            select: {
              nomorKamar: true,
            },
          },
        },
      },
    },
  });

  // Fetch maintenance/complaints
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
        },
      },
    },
  });

  // Fetch active tenants for contract endings
  const tenants = await prisma.user.findMany({
    where: {
      role: 'TENANT',
      NOT: { kamarId: null },
    },
    include: {
      kamar: {
        select: {
          nomorKamar: true,
        },
      },
    },
  });

  return (
    <KalenderClient
      user={user}
      initialInvoices={invoices}
      initialComplaints={complaints}
      initialTenants={tenants}
    />
  );
}

