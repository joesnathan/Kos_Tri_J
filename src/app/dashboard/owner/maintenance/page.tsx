import { redirect } from 'next/navigation';
import { getUserFromSession } from '@/lib/auth';
import MaintenanceClient from '@/app/dashboard/owner/maintenance/MaintenanceClient';

export const dynamic = 'force-dynamic';

export default async function OwnerMaintenancePage() {
  const user = await getUserFromSession();

  if (!user || user.role !== 'OWNER') {
    redirect('/login');
  }

  return <MaintenanceClient user={user} />;
}
