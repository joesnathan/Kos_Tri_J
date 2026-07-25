import { redirect } from 'next/navigation';
import { getUserFromSession } from '@/lib/auth';
import { getOwnerRevenueReportAction } from '@/app/actions/owner';
import LaporanClient from '@/app/dashboard/owner/laporan/LaporanClient';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function OwnerLaporanPage() {
  const user = await getUserFromSession();

  if (!user || user.role !== 'OWNER') {
    redirect('/login');
  }

  // Load raw data for client calculation
  const rawLunas = await prisma.tagihan.findMany({
    where: { status: 'LUNAS' },
    select: { nominal: true, updatedAt: true }
  });

  const rawPiutang = await prisma.tagihan.findMany({
    where: { status: { in: ['BELUM_BAYAR', 'DITOLAK'] } },
    select: { nominal: true, createdAt: true }
  });

  const rawExpense = await prisma.pengeluaran.findMany({
    select: { nominal: true, tanggal: true }
  });

  const totalRevenue = rawLunas.reduce((sum, r) => sum + r.nominal, 0);
  const totalExpense = rawExpense.reduce((sum, e) => sum + e.nominal, 0);
  const totalPiutang = rawPiutang.reduce((sum, p) => sum + p.nominal, 0);

  // Load count of tenants who have outstanding invoices
  const unpaidTenantsCount = await prisma.user.count({
    where: {
      role: 'TENANT',
      tagihan: {
        some: { status: { in: ['BELUM_BAYAR', 'DITOLAK'] } },
      },
    },
  });

  return (
    <LaporanClient
      user={user}
      initialRevenue={totalRevenue}
      initialExpense={totalExpense}
      initialPiutang={totalPiutang}
      initialUnpaidCount={unpaidTenantsCount}
      rawLunas={rawLunas.map(item => ({
        nominal: item.nominal,
        updatedAt: item.updatedAt.toISOString(),
      }))}
      rawPiutang={rawPiutang.map(item => ({
        nominal: item.nominal,
        createdAt: item.createdAt.toISOString(),
      }))}
      rawExpense={rawExpense.map(item => ({
        nominal: item.nominal,
        tanggal: item.tanggal.toISOString(),
      }))}
      initialMonthlyRevenue={[]}
    />
  );
}

