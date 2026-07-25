import { redirect } from 'next/navigation';
import { getUserFromSession } from '@/lib/auth';
import AnalitikClient from '@/app/dashboard/owner/analitik/AnalitikClient';

export const dynamic = 'force-dynamic';

export default async function OwnerAnalitikPage() {
  const user = await getUserFromSession();

  if (!user || user.role !== 'OWNER') {
    redirect('/login');
  }

  return <AnalitikClient user={user} />;
}
