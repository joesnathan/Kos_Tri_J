import prisma from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DashboardClient from '@/app/dashboard/owner/DashboardClient';

export const dynamic = 'force-dynamic';

export default async function OwnerDashboardPage() {
  const user = await getUserFromSession();

  if (!user || user.role !== 'OWNER') {
    redirect('/login');
  }

  // 1. Kamar stats
  const totalRooms = await prisma.kamar.count();
  const occupiedRooms = await prisma.kamar.count({ where: { status: 'Terisi' } });
  const vacantRooms = await prisma.kamar.count({ where: { status: 'Kosong' } });
  const maintenanceRooms = await prisma.kamar.count({ where: { status: 'Perbaikan' } });

  // 2. Revenue stats (from LUNAS invoices)
  const revenueAggregation = await prisma.tagihan.aggregate({
    where: { status: 'LUNAS' },
    _sum: { nominal: true },
  });
  const totalRevenue = revenueAggregation._sum.nominal || 0;

  // 3. Active tenants
  const activeTenants = await prisma.user.count({
    where: { role: 'TENANT', NOT: { kamarId: null } },
  });

  // 4. Pending invoices count
  const pendingInvoicesCount = await prisma.tagihan.count({
    where: { status: 'MENUNGGU_VERIFIKASI' },
  });

  // 5. Invoices unpaid count
  const unpaidInvoicesCount = await prisma.tagihan.count({
    where: { status: 'BELUM_BAYAR' },
  });

  // 6. Monthly revenue report data
  const monthlyGroups = await prisma.tagihan.groupBy({
    by: ['bulanTagihan'],
    where: { status: 'LUNAS' },
    _sum: { nominal: true },
    _count: { id: true },
    orderBy: { bulanTagihan: 'asc' },
  });
  const monthlyRevenue = monthlyGroups.map((group) => ({
    bulanTagihan: group.bulanTagihan,
    total: group._sum.nominal || 0,
    count: group._count.id,
  }));

  // 7. Room status grid list
  const roomsList = await prisma.kamar.findMany({
    include: {
      users: {
        select: { nama: true },
      },
    },
    orderBy: { nomorKamar: 'asc' },
  });

  // 8. Recent activities from LogAktivitas
  const recentActivities = await prisma.logAktivitas.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  // 9. Payment due list (BELUM_BAYAR / DITOLAK invoices)
  const paymentsDue = await prisma.tagihan.findMany({
    where: {
      OR: [
        { status: 'BELUM_BAYAR' },
        { status: 'DITOLAK' },
      ],
    },
    include: {
      user: {
        select: { nama: true, nomorHp: true },
      },
    },
    orderBy: { createdAt: 'asc' },
    take: 5,
  });

  // 10. Bank accounts
  const bankAccounts = await prisma.rekeningPemilik.findMany();

  // 11. Complaints list from database
  const complaintsList = await prisma.keluhan.findMany({
    include: {
      tenant: {
        select: { nama: true }
      },
      kamar: {
        select: { nomorKamar: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // 12. Actual Expenses from database
  const expensesAggregation = await prisma.pengeluaran.aggregate({
    _sum: { nominal: true },
  });
  const totalExpenses = expensesAggregation._sum.nominal || 0;

  return (
    <DashboardClient
      user={user}
      stats={{
        totalRooms,
        occupiedRooms,
        vacantRooms,
        maintenanceRooms,
        totalRevenue,
        activeTenants,
        pendingInvoicesCount,
        unpaidInvoicesCount,
        totalExpenses,
      }}
      monthlyRevenue={monthlyRevenue}
      roomsList={roomsList}
      recentActivities={recentActivities.map((a: any) => ({
        id: a.id,
        tipe: a.tipe,
        deskripsi: a.deskripsi,
        createdAt: a.createdAt.toISOString()
      }))}
      paymentsDue={paymentsDue}
      bankAccounts={bankAccounts}
      complaintsList={complaintsList}
    />
  );
}
