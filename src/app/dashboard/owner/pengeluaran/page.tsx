import { redirect } from 'next/navigation';
import { getUserFromSession } from '@/lib/auth';
import PengeluaranClient from '@/app/dashboard/owner/pengeluaran/PengeluaranClient';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function OwnerPengeluaranPage() {
  const user = await getUserFromSession();

  if (!user || user.role !== 'OWNER') {
    redirect('/login');
  }

  const expenses = await prisma.pengeluaran.findMany({
    orderBy: { tanggal: 'desc' },
  });

  return <PengeluaranClient user={user} initialExpenses={expenses} />;
}

