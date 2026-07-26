/**
 * User Reports Admin Page
 */

import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/src/modules/auth/utils/session';
import { prisma } from '@/src/db/client';
import { isAdmin } from '@/src/lib/permissions';
import { DashboardShell } from '@/src/components/ui/dashboard-shell';
import { PageHeader } from '@/src/components/ui/page-header';
import { PageBody } from '@/src/components/ui/page-layout';
import { UserReportsAdminPanel } from '@/src/modules/reports/user-reports-admin-panel';
import { getI18n } from '@/src/i18n/server';

export default async function AdminReportsPage() {
  const userId = await getCurrentSession();
  if (!userId) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, status: true },
  });

  if (!user || !isAdmin(user.role) || user.status !== 'ACTIVE') {
    redirect('/dashboard');
  }

  const { messages } = await getI18n({ locale: 'en' });

  return (
    <DashboardShell>
      <PageHeader
        title={messages.pages.reports}
        description={messages.admin.reportsDescription}
      />
      <PageBody>
        <UserReportsAdminPanel />
      </PageBody>
    </DashboardShell>
  );
}
