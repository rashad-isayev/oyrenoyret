'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  PiArrowRight as ArrowRight,
  PiChatCircle as MessageSquare,
} from 'react-icons/pi';
import { PostAvatar } from './post-avatar';
import { formatRelativeTime } from './relative-time';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/src/i18n/i18n-provider';
import { EmptyState } from '@/src/components/ui/empty-state';
import { useSettings } from '@/src/components/settings/settings-provider';
import { getDiscussionContextTagOptions } from '@/src/modules/discussions/discussion-context-tags';
import {
  DISCUSSION_CARD_INTERACTIVE,
  DISCUSSION_CARD_SURFACE,
} from '@/src/modules/discussions/discussion-card-styles';
import { cn } from '@/src/lib/utils';

interface Discussion {
  id: string;
  title: string;
  contentPreview: string;
  authorId?: string;
  authorAvatarVariant?: string | null;
  authorName: string;
  replyCount: number;
  messageCount: number;
  createdAt: string;
  lastActivityAt: string;
  tags: string[];
}

interface DiscussionListProps {
  refreshKey?: number;
  query?: string;
  tags?: string[];
}

export function DiscussionList({
  refreshKey = 0,
  query = '',
  tags = [],
}: DiscussionListProps) {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<{ code?: string; message?: string } | null>(null);
  const hasLoadedRef = useRef(false);
  const { locale, messages, t } = useI18n();
  const { timeZone } = useSettings();
  const copy = messages.discussions.list;
  const reduceMotion = useReducedMotion();
  const contextTags = useMemo(
    () => getDiscussionContextTagOptions(messages.discussions.contextTags),
    [messages.discussions.contextTags],
  );
  const displayTagMap = useMemo(
    () => new Map<string, string>(contextTags.map((tag) => [tag.id, tag.tag])),
    [contextTags],
  );
  const tagQuery = tags.join(',');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    const params = new URLSearchParams();
    if (tagQuery) params.set('tags', tagQuery);
    if (query) params.set('q', query);
    params.set('take', '50');

    (async () => {
      try {
        const res = await fetch(`/api/discussions?${params.toString()}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!res.ok) {
          const errorCode = res.headers.get('x-oy-error-code') ?? undefined;
          const payload = await res.json().catch(() => ({}));
          setDiscussions([]);
          setLoadError({
            code: (payload?.code as string | undefined) ?? errorCode,
            message: (payload?.error as string | undefined) ?? undefined,
          });
          return;
        }
        const data = await res.json();
        setDiscussions(Array.isArray(data) ? data : []);
      } catch {
        if (controller.signal.aborted) return;
        setDiscussions([]);
        setLoadError({ code: 'NETWORK_ERROR' });
      } finally {
        if (!controller.signal.aborted) {
          hasLoadedRef.current = true;
          setLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [refreshKey, query, tagQuery]);

  const initialLoading = loading && !hasLoadedRef.current;

  if (initialLoading) {
    return (
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          duration: reduceMotion ? 0 : 0.3,
          ease: [0.16, 1, 0.3, 1],
        }}
        aria-busy="true"
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex min-h-32 gap-2.5 rounded-xl border border-border/50 bg-card/20 p-3"
            >
              <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-2/5" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </motion.section>
    );
  }

  const hasQuery = Boolean(query.trim()) || tags.length > 0;
  const contentKey = loadError
    ? 'error'
    : discussions.length === 0
      ? `empty:${query}:${tagQuery || 'all'}`
      : `results:${discussions.map((discussion) => discussion.id).join(',')}`;

  return (
    <section className="relative" aria-busy={loading}>
      <AnimatePresence initial={false}>
        {loading ? (
          <motion.div
            key="discussion-filter-progress"
            className="absolute -top-1 left-0 right-0 z-10 h-px overflow-hidden rounded-full bg-primary/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            aria-hidden="true"
          >
            <motion.span
              className="block h-full w-1/3 rounded-full bg-primary/60"
              initial={{ x: '-110%' }}
              animate={{ x: reduceMotion ? '0%' : '310%' }}
              transition={{
                duration: reduceMotion ? 0 : 1.1,
                ease: 'easeInOut',
                repeat: reduceMotion ? 0 : Infinity,
              }}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.div
        animate={{ opacity: loading ? 0.62 : 1 }}
        transition={{
          duration: reduceMotion ? 0 : 0.24,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={contentKey}
            initial={{
              opacity: 0,
              y: reduceMotion ? 0 : 5,
            }}
            animate={{ opacity: 1, y: 0 }}
            exit={{
              opacity: 0,
              y: reduceMotion ? 0 : -3,
            }}
            transition={{
              duration: reduceMotion ? 0 : 0.28,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {loadError ? (
              <EmptyState
                title={copy.loadFailed}
                icon={<MessageSquare className="h-5 w-5" aria-hidden="true" />}
                description={
                  <>
                    {loadError.code ? (
                      <p>
                        {copy.errorCode}:{' '}
                        <span className="font-mono">{loadError.code}</span>
                      </p>
                    ) : null}
                    {loadError.message ? <p>{loadError.message}</p> : null}
                  </>
                }
              />
            ) : discussions.length === 0 ? (
              <EmptyState
                title={hasQuery ? copy.noFound : copy.noDiscussions}
                description={
                  hasQuery ? copy.noFoundHint : copy.noDiscussionsHint
                }
                icon={
                  <MessageSquare
                    className="h-5 w-5"
                    aria-hidden="true"
                  />
                }
                size="spacious"
              />
            ) : (
              <div className="grid items-stretch gap-2 sm:grid-cols-2">
                {discussions.map((d, index) => (
                  <motion.article
                    layout={!reduceMotion}
                    key={d.id}
                    initial={{
                      opacity: 0,
                      y: reduceMotion ? 0 : 6,
                    }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: reduceMotion ? 0 : 0.26,
                      delay: reduceMotion
                        ? 0
                        : Math.min(index * 0.035, 0.18),
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="min-w-0"
                  >
                    <Link
                      href={`/discussions/${d.id}`}
                      className={cn(
                        DISCUSSION_CARD_SURFACE,
                        DISCUSSION_CARD_INTERACTIVE,
                        'group/room flex h-full min-h-32 gap-2.5 p-3',
                      )}
                    >
                      <PostAvatar
                        userId={d.authorId ?? d.id}
                        authorName={d.authorName}
                        avatarVariant={d.authorAvatarVariant}
                        size="xs"
                        className="h-8 w-8"
                      />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex min-w-0 items-start gap-2">
                          <h2 className="min-w-0 flex-1 truncate text-sm font-semibold leading-5 tracking-[-0.01em] text-foreground">
                            {d.title}
                          </h2>
                          <ArrowRight
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"
                            data-directional-arrow="forward"
                            aria-hidden="true"
                          />
                        </div>
                        <p className="truncate text-[11px] leading-4 text-muted-foreground">
                          <span className="font-medium text-foreground/75">
                            {d.authorName}
                          </span>
                          <span className="px-1.5" aria-hidden="true">
                            ·
                          </span>
                          <span>
                            {formatRelativeTime(
                              d.lastActivityAt,
                              locale,
                              timeZone,
                            )}
                          </span>
                        </p>
                        {d.contentPreview ? (
                          <p className="mt-1.5 line-clamp-2 whitespace-pre-line text-xs leading-[1.125rem] text-foreground/70">
                            {d.contentPreview}
                          </p>
                        ) : null}
                        <div className="mt-auto flex min-w-0 items-center gap-1.5 overflow-hidden pt-2">
                          <div className="flex min-w-0 items-center gap-1 overflow-hidden">
                            {d.tags?.map((discussionTag) => (
                              <span
                                key={discussionTag}
                                className="truncate rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium leading-4 text-muted-foreground"
                              >
                                #
                                {displayTagMap.get(discussionTag) ??
                                  discussionTag}
                              </span>
                            ))}
                          </div>
                          <span
                            className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-muted-foreground"
                            aria-label={t('discussions.messagesLabel', {
                              count: d.messageCount,
                            })}
                          >
                            <MessageSquare
                              className="h-3 w-3"
                              aria-hidden="true"
                            />
                            <span aria-hidden="true">{d.messageCount}</span>
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.article>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </section>
  );
}
