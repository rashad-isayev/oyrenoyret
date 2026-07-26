import Link from 'next/link';
import { PiBooks as Books, PiChatCircle as ChatCircle } from 'react-icons/pi';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { DashboardShell } from '@/src/components/ui/dashboard-shell';
import { PageHeader } from '@/src/components/ui/page-header';
import { PageBody } from '@/src/components/ui/page-layout';
import { getI18n } from '@/src/i18n/server';
import { getAppUser } from '@/src/modules/auth/utils/app-user';
import { getCurrentSession } from '@/src/modules/auth/utils/session';

export default async function DashboardPage() {
  const userId = await getCurrentSession();
  if (!userId) redirect('/login');

  const [{ messages }, user] = await Promise.all([getI18n(), getAppUser(userId)]);
  const copy = messages.app.dashboard;
  const displayName = user?.firstName || copy.fallbackName;

  return (
    <DashboardShell className="pb-8">
      <PageHeader
        title={`${copy.welcome}, ${displayName}`}
        description={copy.description}
      />
      <PageBody>
        <div className="grid gap-4 md:grid-cols-2">
          <section className="card-frame flex flex-col gap-4 bg-card p-5">
            <Books className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <div className="space-y-1">
              <h2 className="font-semibold text-foreground">{messages.app.tracks.title}</h2>
              <p className="text-sm text-muted-foreground">{messages.app.tracks.description}</p>
            </div>
            <Button size="sm" variant="secondary-primary" className="mt-auto self-start" asChild>
              <Link href="/tracks">{copy.openTracks}</Link>
            </Button>
          </section>

          <section className="card-frame flex flex-col gap-4 bg-card p-5">
            <ChatCircle className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <div className="space-y-1">
              <h2 className="font-semibold text-foreground">{messages.discussions.page.title}</h2>
              <p className="text-sm text-muted-foreground">{messages.discussions.page.description}</p>
            </div>
            <Button size="sm" variant="secondary-primary" className="mt-auto self-start" asChild>
              <Link href="/discussions">{copy.openDiscussions}</Link>
            </Button>
          </section>
        </div>
      </PageBody>
    </DashboardShell>
  );
}
