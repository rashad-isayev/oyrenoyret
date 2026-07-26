/**
 * Discussions Page
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { DashboardShell } from '@/src/components/ui/dashboard-shell';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/src/components/ui/page-header';
import { PageBody } from '@/src/components/ui/page-layout';
import { CreateDiscussionDialog } from '@/src/modules/discussions/create-discussion-dialog';
import { DiscussionList } from '@/src/modules/discussions/discussion-list';
import { DiscussionFilters } from '@/src/modules/discussions/discussion-filters';
import { useI18n } from '@/src/i18n/i18n-provider';
import { useCurrentUser } from '@/src/modules/auth/components/current-user-context';
import { LiveStatusDot } from '@/src/components/ui/live-status-dot';

export default function DiscussionsPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const searchTimer = useRef<NodeJS.Timeout | null>(null);
  const { t, messages } = useI18n();
  const copy = messages.discussions.page;
  const { canWrite } = useCurrentUser();
  useEffect(() => {
    let active = true;
    const ping = async () => {
      try {
        const res = await fetch('/api/online-users', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (active && typeof data?.count === 'number') {
          setOnlineCount(data.count);
        }
      } catch {
        if (active) setOnlineCount(null);
      }
    };

    ping();
    const interval = setInterval(ping, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const trimmed = searchQuery.trim();
    searchTimer.current = setTimeout(() => {
      setSubmittedQuery(trimmed);
    }, trimmed ? 250 : 0);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [searchQuery]);

  const submitSearch = () => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setSubmittedQuery(searchQuery.trim());
  };

  return (
    <DashboardShell>
      <PageHeader
        title={copy.title}
        description={copy.description}
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowCreate(true)} disabled={!canWrite}>
            {copy.newPost}
          </Button>
        }
      />

      <PageBody spacing="compact">
        <DiscussionFilters
          inputRef={inputRef}
          query={searchQuery}
          selectedTags={selectedTags}
          onQueryChange={setSearchQuery}
          onSelectedTagsChange={setSelectedTags}
          onSubmit={submitSearch}
          onClear={() => {
            setSearchQuery('');
            setSubmittedQuery('');
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
        />

        <div className="flex flex-wrap items-center justify-start gap-x-4 gap-y-2 px-1 text-xs text-muted-foreground">
          {onlineCount !== null ? (
            <div className="flex shrink-0 items-center gap-2">
              <LiveStatusDot />
              <span>
                {t('discussions.page.onlineNow', {
                  count: onlineCount,
                })}
              </span>
            </div>
          ) : null}
        </div>

        <DiscussionList
          refreshKey={refreshKey}
          query={submittedQuery}
          tags={selectedTags}
        />
      </PageBody>

      <CreateDiscussionDialog
        open={showCreate && canWrite}
        onOpenChange={(open) => setShowCreate(open && canWrite)}
        onCreated={() => setRefreshKey((k) => k + 1)}
      />
    </DashboardShell>
  );
}
