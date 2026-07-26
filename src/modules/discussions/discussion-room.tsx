'use client';

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useReducedMotion } from 'framer-motion';
import {
  PiArrowDown as ArrowDown,
  PiArrowLeft as ArrowLeft,
  PiFlag as Flag,
  PiChatCircle as ChatCircle,
  PiDotsThree as MoreHorizontal,
  PiPaperPlaneTilt as Send,
  PiTrash as Trash,
  PiStopCircle as StopCircle,
  PiTimer as Timer,
} from 'react-icons/pi';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DashboardShell } from '@/src/components/ui/dashboard-shell';
import { Notice } from '@/components/ui/notice';
import {
  CompactRichText,
  type CompactRichTextImage,
  type CompactRichTextStats,
} from '@/src/components/rich-text/compact-rich-text';
import { PostAvatar } from './post-avatar';
import { DiscussionRichText } from './components/discussion-rich-text';
import { ReportButton } from '@/src/modules/reports/report-user-button';
import { AdminRemoveContentButton } from '@/src/modules/moderation/admin-remove-content-button';
import { EmptyState } from '@/src/components/ui/empty-state';
import { useCurrentUser } from '@/src/modules/auth/components/current-user-context';
import { useI18n } from '@/src/i18n/i18n-provider';
import { useSettings } from '@/src/components/settings/settings-provider';
import { getLocaleCode, type Locale } from '@/src/i18n';
import { getWriteRestrictionMessage } from '@/src/lib/write-restriction';
import {
  extractErrorMessage,
  formatErrorToast,
} from '@/src/lib/error-toast';
import { discussionRichTextHasContent } from '@/src/lib/discussion-rich-text';
import { appendDiscussionAttachmentsToHtml } from '@/src/lib/discussion-attachments';
import { MAX_DISCUSSION_IMAGES } from '@/src/config/uploads';
import { cn } from '@/src/lib/utils';
import { LiveStatusDot } from '@/src/components/ui/live-status-dot';
import { AnchoredMenu } from '@/src/components/ui/anchored-menu';
import { DISCUSSION_ROOM_ROW_GRID } from './discussion-card-styles';
import { getDiscussionContextTagOptions } from './discussion-context-tags';

interface DiscussionMessage {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  removedAt?: string | null;
  removedReason?: string | null;
}

interface TimelineMessage extends DiscussionMessage {
  kind: 'discussion' | 'reply';
}

interface DiscussionRoomData {
  id: string;
  title: string;
  content: string;
  tags: string[];
  authorId: string;
  authorName: string;
  createdAt: string;
  replies: DiscussionMessage[];
  archivedAt?: string | null;
  currentUserId?: string | null;
  removedAt?: string | null;
  removedReason?: string | null;
  unreadBoundaryId?: string | null;
  slowmodeSeconds: number;
  slowmodeRetryAfterSeconds: number;
}

type ConnectionState = 'connecting' | 'live' | 'reconnecting';
type ActiveActionMenu =
  | { type: 'discussion' }
  | { type: 'message'; id: string }
  | null;

const MAX_MESSAGE_LENGTH = 2000;
const NEAR_BOTTOM_THRESHOLD = 120;
const MESSAGE_GROUP_WINDOW_MS = 5 * 60 * 1000;

function formatMessageTime(
  iso: string,
  locale: Locale,
  timeZone: string,
) {
  return new Intl.DateTimeFormat(getLocaleCode(locale), {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function getMessageDateKey(
  iso: string,
  locale: Locale,
  timeZone: string,
) {
  const parts = new Intl.DateTimeFormat(getLocaleCode(locale), {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso));
  const values = new Map(
    parts.map((part) => [part.type, part.value]),
  );
  return [
    values.get('year'),
    values.get('month'),
    values.get('day'),
  ].join('-');
}

function formatMessageDate(
  iso: string,
  locale: Locale,
  timeZone: string,
) {
  const date = new Date(iso);
  const localeCode = getLocaleCode(locale);
  const longDate = new Intl.DateTimeFormat(localeCode, {
    timeZone,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);

  // Some embedded browser runtimes expose a reduced ICU dataset and return
  // placeholders such as "M07" instead of a localized month name. Keep the
  // separator readable without maintaining a second, hardcoded month table.
  if (!/(?:^|\s)M\d{1,2}(?:\s|$)/.test(longDate)) {
    return longDate;
  }

  return new Intl.DateTimeFormat(localeCode, {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function isGroupedMessage(
  previous: TimelineMessage | undefined,
  current: TimelineMessage,
) {
  if (
    !previous ||
    previous.kind === 'discussion' ||
    current.kind === 'discussion' ||
    previous.authorId !== current.authorId
  ) {
    return false;
  }
  return (
    new Date(current.createdAt).getTime() -
      new Date(previous.createdAt).getTime() <=
    MESSAGE_GROUP_WINDOW_MS
  );
}

export function DiscussionRoom() {
  const params = useParams();
  const reduceMotion = useReducedMotion();
  const { locale, messages, t } = useI18n();
  const { timeZone } = useSettings();
  const { user: currentUser, canWrite, writeRestriction } = useCurrentUser();
  const copy = messages.discussions.detail;
  const displayTagMap = useMemo(
    () =>
      new Map<string, string>(
        getDiscussionContextTagOptions(
          messages.discussions.contextTags,
        ).map((tag) => [tag.id, tag.tag]),
      ),
    [messages.discussions.contextTags],
  );
  const discussionId = params.id as string;
  const isAdmin = currentUser.role === 'ADMIN';

  const [discussion, setDiscussion] = useState<DiscussionRoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [connection, setConnection] =
    useState<ConnectionState>('connecting');
  const [composerValue, setComposerValue] = useState('');
  const [composerStats, setComposerStats] = useState<CompactRichTextStats>({
    words: 0,
    characters: 0,
  });
  const [attachments, setAttachments] = useState<CompactRichTextImage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [endDiscussionOpen, setEndDiscussionOpen] = useState(false);
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  const [deletingMessage, setDeletingMessage] = useState(false);
  const [unseenMessages, setUnseenMessages] = useState(0);
  const [activeActionMenu, setActiveActionMenu] =
    useState<ActiveActionMenu>(null);
  const [sessionUnreadBoundaryId, setSessionUnreadBoundaryId] =
    useState<string | null>(null);
  const [slowmodeEndsAt, setSlowmodeEndsAt] =
    useState<number | null>(null);
  const [clockNow, setClockNow] = useState(() => Date.now());

  const timelineRef = useRef<HTMLDivElement>(null);
  const composerFooterRef = useRef<HTMLElement>(null);
  const discussionActionsRef = useRef<HTMLDivElement>(null);
  const messageActionsRef = useRef<HTMLDivElement>(null);
  const loadedOnceRef = useRef(false);
  const stickToBottomRef = useRef(true);
  const previousMessageCountRef = useRef(0);
  const refreshInFlightRef = useRef(false);
  const refreshQueuedRef = useRef(false);
  const sessionUnreadBoundaryRef = useRef<string | null>(null);
  const markedReadReplyRef = useRef<string | null | undefined>(
    undefined,
  );
  const roomWasHiddenRef = useRef(false);

  const updateSessionUnreadBoundary = useCallback(
    (messageId: string | null) => {
      sessionUnreadBoundaryRef.current = messageId;
      setSessionUnreadBoundaryId(messageId);
    },
    [],
  );

  const setSlowmodeFromSeconds = useCallback((seconds: number) => {
    setSlowmodeEndsAt(
      seconds > 0 ? Date.now() + seconds * 1000 : null,
    );
    setClockNow(Date.now());
  }, []);

  const markReadThrough = useCallback(
    async (lastReadReplyId: string | null) => {
      if (markedReadReplyRef.current === lastReadReplyId) return;
      const previousCursor = markedReadReplyRef.current;
      markedReadReplyRef.current = lastReadReplyId;

      try {
        const response = await fetch(
          `/api/discussions/${discussionId}/read`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lastReadReplyId }),
          },
        );
        if (!response.ok) {
          markedReadReplyRef.current = previousCursor;
        }
      } catch {
        markedReadReplyRef.current = previousCursor;
      }
    },
    [discussionId],
  );

  const isNearBottom = useCallback(() => {
    const timeline = timelineRef.current;
    if (!timeline) return true;
    return (
      timeline.scrollHeight - timeline.scrollTop - timeline.clientHeight <=
      NEAR_BOTTOM_THRESHOLD
    );
  }, []);

  const scrollToLatest = useCallback(
    (behavior: ScrollBehavior = 'smooth') => {
      const timeline = timelineRef.current;
      if (!timeline) return;
      timeline.scrollTo({
        top: timeline.scrollHeight,
        behavior: reduceMotion ? 'auto' : behavior,
      });
      stickToBottomRef.current = true;
      setUnseenMessages(0);
    },
    [reduceMotion],
  );

  useEffect(() => {
    const footer = composerFooterRef.current;
    if (!footer || typeof ResizeObserver === 'undefined') return;

    let previousHeight = footer.getBoundingClientRect().height;
    let frameId: number | undefined;
    const observer = new ResizeObserver(([entry]) => {
      const nextHeight = entry?.contentRect.height ?? previousHeight;
      if (Math.abs(nextHeight - previousHeight) < 0.5) return;
      previousHeight = nextHeight;

      if (!stickToBottomRef.current) return;
      if (frameId !== undefined) {
        window.cancelAnimationFrame(frameId);
      }
      frameId = window.requestAnimationFrame(() => {
        scrollToLatest('auto');
      });
    });

    observer.observe(footer);
    return () => {
      observer.disconnect();
      if (frameId !== undefined) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [discussion?.id, scrollToLatest]);

  const fetchDiscussion = useCallback(async () => {
    if (refreshInFlightRef.current) {
      refreshQueuedRef.current = true;
      return;
    }
    refreshInFlightRef.current = true;
    const firstLoad = !loadedOnceRef.current;
    stickToBottomRef.current =
      firstLoad || isNearBottom();

    try {
      const response = await fetch(`/api/discussions/${discussionId}`, {
        cache: 'no-store',
      });
      if (!response.ok) {
        if (response.status === 404) {
          setDiscussion(null);
          return;
        }
        throw new Error('DISCUSSION_LOAD_FAILED');
      }
      const data = (await response.json()) as DiscussionRoomData;
      if (
        (firstLoad || roomWasHiddenRef.current) &&
        data.unreadBoundaryId &&
        !sessionUnreadBoundaryRef.current
      ) {
        updateSessionUnreadBoundary(data.unreadBoundaryId);
      }
      setSlowmodeFromSeconds(
        data.slowmodeRetryAfterSeconds ?? 0,
      );
      setDiscussion(data);
      if (document.visibilityState === 'visible') {
        roomWasHiddenRef.current = false;
        const lastReadReplyId =
          data.replies[data.replies.length - 1]?.id ?? null;
        void markReadThrough(lastReadReplyId);
      }
    } catch {
      if (!loadedOnceRef.current) setDiscussion(null);
    } finally {
      loadedOnceRef.current = true;
      refreshInFlightRef.current = false;
      setLoading(false);
      if (refreshQueuedRef.current) {
        refreshQueuedRef.current = false;
        window.setTimeout(() => {
          void fetchDiscussion();
        }, 0);
      }
    }
  }, [
    discussionId,
    isNearBottom,
    markReadThrough,
    setSlowmodeFromSeconds,
    updateSessionUnreadBoundary,
  ]);

  useEffect(() => {
    void fetchDiscussion();
  }, [fetchDiscussion]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        roomWasHiddenRef.current = true;
        return;
      }
      void fetchDiscussion();
    };

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange,
    );
    return () =>
      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      );
  }, [fetchDiscussion]);

  useEffect(() => {
    if (!slowmodeEndsAt) return;

    const updateClock = () => {
      const now = Date.now();
      setClockNow(now);
      if (now >= slowmodeEndsAt) {
        setSlowmodeEndsAt(null);
      }
    };
    updateClock();
    const interval = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(interval);
  }, [slowmodeEndsAt]);

  useEffect(() => {
    const source = new EventSource(
      `/api/discussions/${discussionId}/stream`,
    );
    setConnection('connecting');

    const handleReady = () => setConnection('live');
    const handleRevision = () => {
      setConnection('live');
      void fetchDiscussion();
    };
    const handleRemoved = () => {
      source.close();
      void fetchDiscussion();
    };

    source.addEventListener('ready', handleReady);
    source.addEventListener('revision', handleRevision);
    source.addEventListener('removed', handleRemoved);
    source.onopen = () => setConnection('live');
    source.onerror = () => setConnection('reconnecting');

    return () => {
      source.removeEventListener('ready', handleReady);
      source.removeEventListener('revision', handleRevision);
      source.removeEventListener('removed', handleRemoved);
      source.close();
    };
  }, [discussionId, fetchDiscussion]);

  useEffect(() => {
    if (!activeActionMenu) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        discussionActionsRef.current &&
        discussionActionsRef.current.contains(event.target as Node)
      ) {
        return;
      }
      if (
        messageActionsRef.current &&
        messageActionsRef.current.contains(event.target as Node)
      ) {
        return;
      }
      setActiveActionMenu(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveActionMenu(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeActionMenu]);

  useEffect(() => {
    const count = discussion?.replies.length ?? 0;
    const added = Math.max(0, count - previousMessageCountRef.current);

    if (stickToBottomRef.current) {
      requestAnimationFrame(() => {
        scrollToLatest(loadedOnceRef.current ? 'smooth' : 'auto');
      });
    } else if (added > 0) {
      setUnseenMessages((current) => current + added);
    }

    previousMessageCountRef.current = count;
  }, [discussion?.replies.length, scrollToLatest]);

  const canInteract =
    canWrite && !discussion?.archivedAt && !discussion?.removedAt;
  const isRoomOpen = !discussion?.archivedAt && !discussion?.removedAt;
  const completeMessage = appendDiscussionAttachmentsToHtml(
    composerValue,
    attachments,
  );
  const slowmodeRemainingSeconds = slowmodeEndsAt
    ? Math.max(0, Math.ceil((slowmodeEndsAt - clockNow) / 1000))
    : 0;

  const submitMessage = async () => {
    if (!canWrite) {
      toast.error(
        getWriteRestrictionMessage(
          writeRestriction,
          messages.auth.errors.emailNotVerified,
        ),
      );
      return;
    }
    if (!canInteract || submitting) return;
    if (slowmodeRemainingSeconds > 0) {
      toast.error(
        copy.slowmodeWait.replace(
          '{{seconds}}',
          String(slowmodeRemainingSeconds),
        ),
      );
      return;
    }
    if (!discussionRichTextHasContent(completeMessage)) return;

    setSubmitting(true);
    stickToBottomRef.current = true;
    try {
      const response = await fetch(
        `/api/discussions/${discussionId}/replies`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: completeMessage.trim() }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (
        response.status === 429 &&
        payload?.code === 'DISCUSSION_SLOWMODE'
      ) {
        const retryAfterSeconds = Math.max(
          1,
          Number(payload.retryAfterSeconds) || 1,
        );
        setSlowmodeFromSeconds(retryAfterSeconds);
        toast.error(
          copy.slowmodeWait.replace(
            '{{seconds}}',
            String(retryAfterSeconds),
          ),
        );
        return;
      }
      if (!response.ok) {
        throw new Error(extractErrorMessage(payload) ?? '');
      }
      setComposerValue('');
      setComposerStats({ words: 0, characters: 0 });
      setAttachments([]);
      updateSessionUnreadBoundary(null);
      if (typeof payload?.id === 'string') {
        markedReadReplyRef.current = payload.id;
      }
      setSlowmodeFromSeconds(
        Number(payload?.slowmodeRetryAfterSeconds) ||
          discussion?.slowmodeSeconds ||
          0,
      );
      await fetchDiscussion();
    } catch (error) {
      toast.error(
        formatErrorToast(
          copy.failedReply,
          error instanceof Error ? error.message : null,
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const endDiscussion = async () => {
    if (!discussion || ending) return;
    setEnding(true);
    try {
      const response = await fetch(
        `/api/discussions/${discussion.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'end' }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(extractErrorMessage(payload) ?? '');
      }
      toast.success(copy.endedDiscussion);
      await fetchDiscussion();
    } catch (error) {
      toast.error(
        formatErrorToast(
          copy.failedEndDiscussion,
          error instanceof Error ? error.message : null,
        ),
      );
    } finally {
      setEnding(false);
      setEndDiscussionOpen(false);
    }
  };

  const deleteMessage = async () => {
    if (!deleteMessageId || deletingMessage) return;
    setDeletingMessage(true);
    try {
      const response = await fetch(
        `/api/discussions/replies/${deleteMessageId}`,
        { method: 'DELETE' },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(extractErrorMessage(payload) ?? '');
      }
      toast.success(copy.deletedReply);
      setDeleteMessageId(null);
      await fetchDiscussion();
    } catch (error) {
      toast.error(
        formatErrorToast(
          copy.failedDelete,
          error instanceof Error ? error.message : null,
        ),
      );
    } finally {
      setDeletingMessage(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell
        width="full"
        className="h-full min-h-0 gap-0"
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex h-[76px] shrink-0 items-center gap-3 border-b border-border/60">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <div className="flex-1 space-y-5 overflow-hidden py-6">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              </div>
            ))}
          </div>
          <Skeleton className="mb-4 h-24 w-full rounded-xl" />
        </div>
      </DashboardShell>
    );
  }

  if (!discussion) {
    return (
      <DashboardShell
        width="full"
        className="h-full min-h-0 justify-center"
      >
        <EmptyState
          title={copy.notFound}
          icon={<ChatCircle className="h-5 w-5" aria-hidden="true" />}
          description={
            <Button asChild variant="secondary" size="sm">
              <Link href="/discussions">{copy.back}</Link>
            </Button>
          }
        />
      </DashboardShell>
    );
  }

  const connectionLabel =
    connection === 'live'
      ? copy.liveStatus
      : connection === 'reconnecting'
        ? copy.reconnecting
        : copy.connecting;
  const discussionActionsOpen = activeActionMenu?.type === 'discussion';
  const timelineMessages: TimelineMessage[] = [
    {
      kind: 'discussion',
      id: discussion.id,
      content: discussion.content,
      authorId: discussion.authorId,
      authorName: discussion.authorName,
      createdAt: discussion.createdAt,
      removedAt: discussion.removedAt,
      removedReason: discussion.removedReason,
    },
    ...discussion.replies.map((message) => ({
      ...message,
      kind: 'reply' as const,
    })),
  ];
  const slowmodeDuration =
    discussion.slowmodeSeconds % 60 === 0
      ? copy.slowmodeMinutes.replace(
          '{{count}}',
          String(discussion.slowmodeSeconds / 60),
        )
      : copy.slowmodeSeconds.replace(
          '{{count}}',
          String(discussion.slowmodeSeconds),
        );

  return (
    <DashboardShell
      width="full"
      className="h-full min-h-0 gap-0"
    >
      <section
        className="flex h-full min-h-0 flex-col"
        aria-labelledby="discussion-room-title"
      >
        <header
          className={cn(
            DISCUSSION_ROOM_ROW_GRID,
            'edge-elevation-bottom relative z-10 min-h-[76px] shrink-0 items-start bg-background py-3',
          )}
        >
          <Button
            asChild
            variant="ghost"
            size="icon-sm"
            className="mt-0.5 h-8 w-8"
          >
            <Link href="/discussions" aria-label={copy.back}>
              <ArrowLeft
                className="h-4 w-4"
                aria-hidden="true"
              />
            </Link>
          </Button>

          <div className="min-w-0 flex-1">
            <h1
              id="discussion-room-title"
              className="truncate text-base font-semibold leading-6 tracking-[-0.015em]"
              title={discussion.title}
            >
              {discussion.title}
            </h1>
            <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5',
                  connection === 'live' && 'text-[hsl(var(--success))]',
                  connection === 'reconnecting' &&
                    'text-[hsl(var(--warning))]',
                )}
                aria-live="polite"
              >
                <LiveStatusDot
                  className={cn(
                    connection === 'reconnecting' &&
                      'text-[hsl(var(--warning))]',
                    connection === 'connecting' &&
                      'text-muted-foreground',
                  )}
                />
                {connectionLabel}
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <ChatCircle className="h-3.5 w-3.5" aria-hidden="true" />
                {t('discussions.messagesLabel', {
                  count: timelineMessages.length,
                })}
              </span>
            </div>
          </div>
        </header>

        <div className="relative min-h-0 flex-1">
          <div
            ref={timelineRef}
            className="scroll-area-stable h-full overflow-y-auto overscroll-contain pb-5 pt-4"
            onScroll={() => {
              const nearBottom = isNearBottom();
              stickToBottomRef.current = nearBottom;
              if (nearBottom) setUnseenMessages(0);
            }}
          >
            <div
              className={cn(
                DISCUSSION_ROOM_ROW_GRID,
                'mb-4 items-start',
              )}
            >
              <span aria-hidden="true" />
              <div className="min-w-0">
                <p className="break-words text-lg font-semibold leading-7 tracking-[-0.02em] text-foreground">
                  {discussion.title}
                </p>
                {discussion.tags.length > 0 ? (
                  <div
                    className="mt-2 flex flex-wrap gap-1.5"
                    aria-label={
                      messages.discussions.createDialog.contextLabel
                    }
                  >
                    {discussion.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium leading-5 text-muted-foreground"
                      >
                        #{displayTagMap.get(tag) ?? tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <div
              className="px-1 sm:px-0"
              role="log"
              aria-live="polite"
              aria-relevant="additions"
              aria-label={copy.messagesTitle}
            >
              {timelineMessages.map((message, index) => {
                const isOpeningMessage = message.kind === 'discussion';
                const isAuthor = message.authorId === discussion.authorId;
                const previousMessage = timelineMessages[index - 1];
                const startsNewDay =
                  !previousMessage ||
                  getMessageDateKey(
                    previousMessage.createdAt,
                    locale,
                    timeZone,
                  ) !==
                    getMessageDateKey(
                      message.createdAt,
                      locale,
                      timeZone,
                    );
                const isUnreadBoundary =
                  message.kind === 'reply' &&
                  message.id === sessionUnreadBoundaryId;
                const grouped =
                  !isAuthor &&
                  !startsNewDay &&
                  !isUnreadBoundary &&
                  isGroupedMessage(previousMessage, message);
                const actionsOpen = isOpeningMessage
                  ? discussionActionsOpen
                  : activeActionMenu?.type === 'message' &&
                    activeActionMenu.id === message.id;

                return (
                  <Fragment key={`${message.kind}:${message.id}`}>
                    {startsNewDay || isUnreadBoundary ? (
                      <div
                        role="separator"
                        aria-label={
                          isUnreadBoundary
                            ? `${formatMessageDate(
                                message.createdAt,
                                locale,
                                timeZone,
                              )}, ${copy.newDivider}`
                            : formatMessageDate(
                                message.createdAt,
                                locale,
                                timeZone,
                              )
                        }
                        className={cn(
                          'flex items-center gap-2 px-3',
                          index === 0 ? 'mb-3' : 'mb-2 mt-5',
                        )}
                      >
                        <span
                          className={cn(
                            'h-px flex-1',
                            isUnreadBoundary
                              ? 'bg-destructive/75'
                              : 'bg-border/80',
                          )}
                          aria-hidden="true"
                        />
                        {startsNewDay ? (
                          <time
                            dateTime={message.createdAt}
                            className={cn(
                              'shrink-0 text-[11px] font-semibold',
                              isUnreadBoundary
                                ? 'text-destructive'
                                : 'text-muted-foreground',
                            )}
                          >
                            {formatMessageDate(
                              message.createdAt,
                              locale,
                              timeZone,
                            )}
                          </time>
                        ) : null}
                        {startsNewDay ? (
                          <span
                            className={cn(
                              'h-px flex-1',
                              isUnreadBoundary
                                ? 'bg-destructive/75'
                                : 'bg-border/80',
                            )}
                            aria-hidden="true"
                          />
                        ) : null}
                        {isUnreadBoundary ? (
                          <span className="shrink-0 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold uppercase leading-4 text-destructive-foreground">
                            {copy.newDivider}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  <article
                    className={cn(
                      DISCUSSION_ROOM_ROW_GRID,
                      'group relative rounded-lg transition-colors duration-200 hover:bg-secondary/45',
                      grouped ? 'py-1' : 'mt-3 py-2 first:mt-0',
                    )}
                  >
                    <div className="w-8 shrink-0">
                      {grouped ? (
                        <time
                          dateTime={message.createdAt}
                          className="invisible block pt-1 text-[10px] text-muted-foreground group-hover:visible"
                        >
                          {formatMessageTime(
                            message.createdAt,
                            locale,
                            timeZone,
                          )}
                        </time>
                      ) : (
                        <PostAvatar
                          userId={message.authorId}
                          authorName={message.authorName}
                          size="sm"
                          className="h-8 w-8"
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      {!grouped ? (
                        <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-sm font-semibold">
                            {message.authorName}
                          </span>
                          {isAuthor ? (
                            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold leading-4 text-primary">
                              {copy.authorBadge}
                            </span>
                          ) : null}
                          <time
                            dateTime={message.createdAt}
                            className="text-[11px] text-muted-foreground"
                          >
                            {formatMessageTime(
                              message.createdAt,
                              locale,
                              timeZone,
                            )}
                          </time>
                        </div>
                      ) : (
                        <span className="sr-only">
                          {message.authorName}
                        </span>
                      )}

                      {message.removedAt ? (
                        message.removedReason === 'author_deleted' ? (
                          <p className="text-sm italic leading-5 text-muted-foreground">
                            {copy.deletedMessagePlaceholder}
                          </p>
                        ) : (
                          <Notice
                            tone="warning"
                            size="sm"
                            title={copy.removedByModerators}
                          >
                            {message.removedReason ?? undefined}
                          </Notice>
                        )
                      ) : (
                        <DiscussionRichText content={message.content} />
                      )}

                      {isOpeningMessage && discussion.archivedAt ? (
                        <Notice
                          className="mt-3"
                          size="sm"
                          title={copy.archivedTitle}
                        >
                          {copy.archivedDescription}
                        </Notice>
                      ) : null}
                    </div>

                    {!message.removedAt ? (
                      <div
                        ref={
                          actionsOpen
                            ? isOpeningMessage
                              ? discussionActionsRef
                              : messageActionsRef
                            : undefined
                        }
                        className="absolute right-2 top-1"
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => {
                            setActiveActionMenu((current) => {
                              if (isOpeningMessage) {
                                return current?.type === 'discussion'
                                  ? null
                                  : { type: 'discussion' };
                              }
                              return current?.type === 'message' &&
                                current.id === message.id
                                ? null
                                : { type: 'message', id: message.id };
                            });
                          }}
                          aria-label={
                            isOpeningMessage
                              ? copy.actionMenu
                              : copy.messageActionMenu
                          }
                          aria-haspopup="menu"
                          aria-expanded={actionsOpen}
                          className={cn(
                            'h-7 w-7 bg-background/95 text-muted-foreground opacity-0 shadow-card transition-opacity group-focus-within:opacity-100 group-hover:opacity-100',
                            actionsOpen &&
                              'bg-secondary text-foreground opacity-100',
                          )}
                        >
                          <MoreHorizontal
                            className="h-4 w-4"
                            aria-hidden="true"
                          />
                        </Button>

                        <AnchoredMenu
                          open={actionsOpen}
                          triggerRef={
                            isOpeningMessage
                              ? discussionActionsRef
                              : messageActionsRef
                          }
                          collisionBoundaryRef={timelineRef}
                          onDismiss={() => setActiveActionMenu(null)}
                        >
                            <ReportButton
                              reportedUserId={message.authorId}
                              reportedUserPublicId={null}
                              reportedUserName={message.authorName}
                              targetType={
                                isOpeningMessage
                                  ? 'DISCUSSION'
                                  : 'DISCUSSION_REPLY'
                              }
                              targetId={message.id}
                              buttonVariant="ghost"
                              buttonClassName="h-8 w-full justify-start px-2.5 text-xs"
                              buttonRole="menuitem"
                              onBeforeOpen={() => setActiveActionMenu(null)}
                              buttonIcon={
                                <Flag
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                              }
                            />
                            {isOpeningMessage &&
                            discussion.currentUserId === message.authorId &&
                            !discussion.archivedAt ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setActiveActionMenu(null);
                                  setEndDiscussionOpen(true);
                                }}
                                className="h-8 w-full justify-start px-2.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                                role="menuitem"
                              >
                                <StopCircle
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                                {copy.endDiscussion}
                              </Button>
                            ) : null}
                            {!isOpeningMessage &&
                            discussion.currentUserId === message.authorId ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setActiveActionMenu(null);
                                  setDeleteMessageId(message.id);
                                }}
                                className="h-8 w-full justify-start px-2.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                                role="menuitem"
                              >
                                <Trash
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                                {copy.deleteReply}
                              </Button>
                            ) : null}
                        </AnchoredMenu>

                        {isAdmin ? (
                          <div className="mt-1 rounded-lg bg-background/95 p-1 opacity-0 shadow-card transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                            <AdminRemoveContentButton
                              targetType={
                                isOpeningMessage
                                  ? 'DISCUSSION'
                                  : 'DISCUSSION_REPLY'
                              }
                              targetId={message.id}
                              label={copy.remove}
                              buttonVariant="outline"
                              onRemoved={() => void fetchDiscussion()}
                            />
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                  </Fragment>
                );
              })}
            </div>
          </div>

          {unseenMessages > 0 ? (
            <Button
              type="button"
              size="sm"
              className="absolute bottom-3 left-1/2 -translate-x-1/2 shadow-float"
              onClick={() => scrollToLatest()}
            >
              <ArrowDown className="h-4 w-4" aria-hidden="true" />
              {copy.newMessages.replace(
                '{{count}}',
                String(unseenMessages),
              )}
            </Button>
          ) : null}
        </div>

        <footer
          ref={composerFooterRef}
          className="edge-elevation-top relative shrink-0 bg-background pb-2 pt-3"
        >
          {isRoomOpen ? (
            <>
              <div className="relative z-10 flex items-end gap-2">
                <div
                  data-ui-control="message-composer"
                  data-disabled={!canWrite || submitting || undefined}
                  className="min-w-0 flex-1"
                  onKeyDown={(event) => {
                    if (
                      event.key === 'Enter' &&
                      !event.shiftKey &&
                      !event.nativeEvent.isComposing &&
                      (event.target as HTMLElement).closest(
                        '[contenteditable="true"]',
                      )
                    ) {
                      event.preventDefault();
                      void submitMessage();
                    }
                  }}
                >
                  <CompactRichText
                    value={composerValue}
                    onChange={setComposerValue}
                    onStatsChange={setComposerStats}
                    placeholder={copy.replyPlaceholder}
                    ariaLabel={copy.replyPlaceholder}
                    minHeightClass="min-h-11"
                    maxHeightClass="max-h-36"
                    maxCharacters={MAX_MESSAGE_LENGTH}
                    rootClassName="min-w-0"
                    toolbarVisibility="focus"
                    toolbarPreset="discussion"
                    countsVisibility="none"
                    disabled={!canWrite || submitting}
                    imageUploadEndpoint="/api/uploads/discussions/sign"
                    imageMode="attachments"
                    imageMaxImages={MAX_DISCUSSION_IMAGES}
                    attachments={attachments}
                    onAttachmentsChange={setAttachments}
                  />
                </div>
                <div className="flex h-11 shrink-0 items-center">
                  <Button
                    type="button"
                    size="icon-sm"
                    onClick={() => void submitMessage()}
                    aria-label={submitting ? copy.sending : copy.postReply}
                    title={submitting ? copy.sending : copy.postReply}
                    disabled={
                      !canWrite ||
                      submitting ||
                      slowmodeRemainingSeconds > 0 ||
                      !discussionRichTextHasContent(completeMessage) ||
                      composerStats.characters > MAX_MESSAGE_LENGTH
                    }
                  >
                    <Send className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
              <div className="relative z-10 mt-1.5 flex items-center justify-end gap-1.5 px-1 text-[11px] text-muted-foreground">
                <Timer className="h-3.5 w-3.5" aria-hidden="true" />
                <span aria-live="polite">
                  {slowmodeRemainingSeconds > 0
                    ? copy.slowmodeCountdown.replace(
                        '{{seconds}}',
                        String(slowmodeRemainingSeconds),
                      )
                    : copy.slowmodeEnabled.replace(
                        '{{duration}}',
                        slowmodeDuration,
                      )}
                </span>
              </div>
            </>
          ) : (
            <Notice size="sm" title={copy.archivedTitle}>
              {discussion.removedAt
                ? copy.removedByModerators
                : copy.archivedDescription}
            </Notice>
          )}
        </footer>
      </section>

      <AlertDialog
        open={endDiscussionOpen}
        onOpenChange={setEndDiscussionOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.endDialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {copy.endDialogDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={ending}>
              {copy.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="danger"
              onClick={endDiscussion}
              disabled={ending}
            >
              {ending ? copy.endingDiscussion : copy.endConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(deleteMessageId)}
        onOpenChange={(open) => {
          if (!open) setDeleteMessageId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {copy.deleteReplyDialogTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {copy.deleteReplyDialogDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingMessage}>
              {copy.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="danger"
              onClick={deleteMessage}
              disabled={deletingMessage}
            >
              {deletingMessage ? copy.deleting : copy.deleteConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardShell>
  );
}
