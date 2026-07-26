/**
 * Admin contact messages page
 *
 * Shows messages submitted from /contact.
 */

import { redirect } from 'next/navigation';
import { prisma } from '@/src/db/client';
import { getCurrentSession } from '@/src/modules/auth/utils/session';
import { isAdmin } from '@/src/lib/permissions';
import { DashboardShell } from '@/src/components/ui/dashboard-shell';
import { PageHeader } from '@/src/components/ui/page-header';
import { PageBody } from '@/src/components/ui/page-layout';
import { PiChatCircle as ChatCircle } from 'react-icons/pi';
import { EmptyState } from '@/src/components/ui/empty-state';
import { getSettingsPreferences } from '@/src/lib/settings-preferences-server';

export const dynamic = 'force-dynamic';

export default async function AdminMessagesPage() {
  const { timeZone } = await getSettingsPreferences();
  const userId = await getCurrentSession();
  if (!userId) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, status: true },
  });

  if (!user || !isAdmin(user.role) || user.status !== 'ACTIVE') {
    redirect('/dashboard');
  }

  const messages = await prisma.contactMessage.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      user: {
        select: {
          publicId: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  return (
    <DashboardShell>
      <PageHeader
        title="Contact Messages"
        description="Messages submitted from the public contact page."
      />

      <PageBody spacing="none">
        {messages.length === 0 ? (
          <EmptyState
            title="No messages yet"
            description="New messages from the contact page will appear here."
            icon={<ChatCircle className="h-5 w-5" aria-hidden="true" />}
            size="spacious"
          />
        ) : (
          <div className="space-y-3">
            {messages.map((message) => {
              const senderName =
                message.name ||
                [message.user?.firstName, message.user?.lastName].filter(Boolean).join(' ') ||
                null;
              const senderEmail = message.email || message.user?.email || '—';
              return (
                <article key={message.id} className="card-frame bg-card p-5">
                  <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {message.subject || 'No subject'}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {senderName ? `${senderName} • ` : ''}
                        {senderEmail}
                        {message.user?.publicId ? ` • ${message.user.publicId}` : ''}
                      </p>
                    </div>
                    <time className="text-xs text-muted-foreground">
                      {message.createdAt.toLocaleString('en-US', { timeZone })}
                    </time>
                  </header>
                  <div className="mt-3 whitespace-pre-wrap text-sm text-foreground">
                    {message.message}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </PageBody>
    </DashboardShell>
  );
}
