import { redirect } from 'next/navigation';
import { getUserFromSession } from '@/lib/auth';
import FasilitasClient from '@/app/dashboard/owner/fasilitas/FasilitasClient';

export const dynamic = 'force-dynamic';

export default async function OwnerFasilitasPage() {
  const user = await getUserFromSession();

  if (!user || user.role !== 'OWNER') {
    redirect('/login');
  }

  return <FasilitasClient user={user} />;
}
