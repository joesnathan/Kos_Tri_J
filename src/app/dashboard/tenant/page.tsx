import { redirect } from 'next/navigation';
import { getUserFromSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getActiveInvoiceAction } from '@/app/actions/tenant';
import TenantDashboardClient from './TenantDashboardClient';

// Ensure this route is dynamic and never statically cached at build time
export const dynamic = 'force-dynamic';

export default async function TenantDashboardPage() {
  const user = await getUserFromSession();

  // Redirect to login if user is unauthenticated or has another role
  if (!user || user.role !== 'TENANT') {
    redirect('/login');
  }

  // Fetch active invoice and bank accounts for the tenant
  const result = await getActiveInvoiceAction();

  // Fetch full tenant details with room info
  const userWithRoom = await prisma.user.findUnique({
    where: { id: user.id },
    include: { kamar: true },
  });

  // Fetch tenant complaints list from Neon DB
  const complaints = await prisma.keluhan.findMany({
    where: { tenantId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  // Fetch boarding house profile settings
  let profilKos = await prisma.profilKos.findFirst();
  if (!profilKos) {
    profilKos = await prisma.profilKos.create({
      data: {
        namaKos: "Kos Tri J",
        nomorHp: "081234567890",
        alamat: "Jl. Mawar No. 12, Kebayoran Baru",
        kota: "Jakarta Selatan",
        kodePos: "12345",
        website: "https://kosmaju.com",
      },
    });
  }

  return (
    <TenantDashboardClient
      user={{
        id: user.id,
        nama: userWithRoom?.nama || user.nama,
        email: userWithRoom?.email || user.email,
        role: user.role,
        nomorHp: userWithRoom?.nomorHp || user.nomorHp,
        kamarId: userWithRoom?.kamarId || null,
        kamarName: userWithRoom?.kamar?.nomorKamar || 'Belum Ditentukan',
      }}
      initialInvoice={result.invoice || null}
      bankAccounts={result.bankAccounts || []}
      initialComplaints={complaints}
      initialProfilKos={profilKos}
    />
  );
}

