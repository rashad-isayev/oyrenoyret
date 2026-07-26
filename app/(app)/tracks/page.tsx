import { PiBooks as Books } from 'react-icons/pi';
import { DashboardShell } from '@/src/components/ui/dashboard-shell';
import { EmptyState } from '@/src/components/ui/empty-state';
import { PageHeader } from '@/src/components/ui/page-header';
import { PageBody } from '@/src/components/ui/page-layout';
import { getI18n } from '@/src/i18n/server';

export default async function TracksPage() {
  const { messages } = await getI18n();
  const copy = messages.app.tracks;

  return (
    <DashboardShell className="pb-8">
      <PageHeader title={copy.title} description={copy.description} />
      <PageBody>
        <EmptyState
          icon={<Books className="h-5 w-5" aria-hidden="true" />}
          title={copy.emptyTitle}
          description={copy.emptyDescription}
          size="spacious"
        />
      </PageBody>
    </DashboardShell>
  );
}
