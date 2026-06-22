import { redirect } from 'next/navigation';
import { getUserFromSession } from '@/lib/auth';
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

  return (
    <TenantDashboardClient
      user={user}
      initialInvoice={result.invoice || null}
      bankAccounts={result.bankAccounts || []}
    />
  );
}
