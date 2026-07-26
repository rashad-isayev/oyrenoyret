import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  PiWarningCircle as WarningCircle,
  PiChatCircle as MessageSquare,
} from 'react-icons/pi';
import { Button } from '@/components/ui/button';
import { DashboardShell } from '@/src/components/ui/dashboard-shell';
import { PageHeader } from '@/src/components/ui/page-header';
import { PageBody } from '@/src/components/ui/page-layout';
import { prisma } from '@/src/db/client';
import { getI18n } from '@/src/i18n/server';
import { isAdmin } from '@/src/lib/permissions';
import { getCurrentSession } from '@/src/modules/auth/utils/session';

export default async function AdminPage() {
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
  const adminCopy = messages.admin;

  const tools = [
    {
      href: '/admin/reports',
      title: messages.sidebar.reports,
      description: adminCopy.reportsCardDescription,
      icon: WarningCircle,
    },
    {
      href: '/admin/messages',
      title: messages.sidebar.contactMessages,
      description: adminCopy.messagesCardDescription,
      icon: MessageSquare,
    },
  ];

  return (
    <DashboardShell>
      <PageHeader title={messages.pages.admin} description={adminCopy.homeDescription} />
      <PageBody>
        <section className="grid gap-4 md:grid-cols-2">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <div key={tool.href} className="card-frame flex flex-col gap-4 bg-card p-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
                    <Icon className="h-4 w-4" />
                    {tool.title}
                  </div>
                  <p className="text-sm text-muted-foreground">{tool.description}</p>
                </div>
                <Button size="sm" variant="secondary-primary" className="self-start" asChild>
                  <Link href={tool.href}>{adminCopy.open}</Link>
                </Button>
              </div>
            );
          })}
        </section>
      </PageBody>
    </DashboardShell>
  );
}
