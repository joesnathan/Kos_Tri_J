import prisma from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import PenggunaClient from '@/app/dashboard/owner/pengguna/PenggunaClient';

export const dynamic = 'force-dynamic';

export default async function OwnerPenggunaPage() {
  const user = await getUserFromSession();

  if (!user || user.role !== 'OWNER') {
    redirect('/login');
  }

  // Load all users in the system ordered by role and name
  const users = await prisma.user.findMany({
    orderBy: [
      { role: 'asc' },
      { nama: 'asc' },
    ],
  });

  return <PenggunaClient user={user} initialUsers={users} />;
}
