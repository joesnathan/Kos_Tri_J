import { redirect } from 'next/navigation';
import { getUserFromSession } from '@/lib/auth';
import { getPendingInvoicesAction, getOwnerRevenueReportAction } from '@/app/actions/owner';
import OwnerDashboardClient from './OwnerDashboardClient';

// Ensure this route is dynamic and never statically cached at build time
export const dynamic = 'force-dynamic';

export default async function OwnerDashboardPage() {
  const user = await getUserFromSession();

  // Redirect to login if user is unauthenticated or has another role
  if (!user || user.role !== 'OWNER') {
    redirect('/login');
  }

  // Fetch pending invoices and owner revenue details
  const pendingResult = await getPendingInvoicesAction();
  const revenueResult = await getOwnerRevenueReportAction();

  return (
    <OwnerDashboardClient
      user={user}
      initialInvoices={pendingResult.invoices || []}
      initialRevenue={revenueResult.totalRevenue || 0}
      initialMonthlyRevenue={revenueResult.monthlyRevenue || []}
    />
  );
}
