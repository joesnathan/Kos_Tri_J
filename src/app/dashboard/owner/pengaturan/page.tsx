import { redirect } from 'next/navigation';
import { getUserFromSession } from '@/lib/auth';
import PengaturanClient from '@/app/dashboard/owner/pengaturan/PengaturanClient';
import { getProfilKosAction } from '@/app/actions/owner';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function OwnerPengaturanPage() {
  const user = await getUserFromSession();

  if (!user || user.role !== 'OWNER') {
    redirect('/login');
  }

  const { profil } = await getProfilKosAction();
  const bankAccounts = await prisma.rekeningPemilik.findMany({
    orderBy: { createdAt: 'asc' },
  });

  const users = await prisma.user.findMany({
    orderBy: [
      { role: 'asc' },
      { nama: 'asc' },
    ],
  });

  return (
    <PengaturanClient
      user={user}
      initialProfilKos={profil}
      initialBankAccounts={bankAccounts}
      initialUsers={users}
    />
  );
}


