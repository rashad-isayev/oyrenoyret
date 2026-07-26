/**
 * Live discussion revision stream.
 *
 * Message writes continue through the normal authenticated HTTP endpoint.
 * This one-way SSE channel only announces that the canonical discussion
 * snapshot changed, which keeps authorization and rendering logic centralized.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/src/db/client';
import { getCurrentSession } from '@/src/modules/auth/utils/session';
import { RATE_LIMITS } from '@/src/config/constants';
import {
  buildRateLimitResponse,
  checkRateLimit,
  getRateLimitIdentifier,
} from '@/src/security/rateLimiter';
import { requirePlatformContentAccess } from '@/src/modules/auth/utils/write-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STREAM_LIFETIME_MS = 55_000;
const REVISION_POLL_MS = 10_000;
const HEARTBEAT_MS = 15_000;

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

async function getDiscussionRevision(discussionId: string) {
  const discussion = await prisma.discussion.findUnique({
    where: { id: discussionId },
    select: {
      id: true,
      userId: true,
      updatedAt: true,
      lastActivityAt: true,
      archivedAt: true,
      removedAt: true,
    },
  });

  if (!discussion) return null;
  return {
    ownerId: discussion.userId,
    removed: Boolean(discussion.removedAt),
    revision: [
      discussion.updatedAt.toISOString(),
      discussion.lastActivityAt.toISOString(),
      discussion.archivedAt?.toISOString() ?? '',
      discussion.removedAt?.toISOString() ?? '',
    ].join(':'),
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getCurrentSession();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const contentAccess = await requirePlatformContentAccess(userId);
  if (!contentAccess.ok) {
    return NextResponse.json(
      {
        error: 'error' in contentAccess ? contentAccess.error : 'Unauthorized',
        errorKey: contentAccess.errorKey,
      },
      { status: contentAccess.status },
    );
  }

  const identifier = getRateLimitIdentifier(request, userId);
  const rateLimit = await checkRateLimit(
    `discussions:stream:${identifier}`,
    RATE_LIMITS.STREAM_CONNECT,
  );
  if (!rateLimit.allowed) {
    const { status, body, headers } = buildRateLimitResponse(rateLimit);
    return NextResponse.json(body, { status, headers });
  }

  const { id: discussionId } = await params;
  const [initialState, currentUser] = await Promise.all([
    getDiscussionRevision(discussionId),
    prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    }),
  ]);
  if (
    !initialState ||
    (initialState.removed &&
      initialState.ownerId !== userId &&
      currentUser?.role !== 'ADMIN')
  ) {
    return NextResponse.json(
      { error: 'Discussion not found' },
      { status: 404 },
    );
  }

  const encoder = new TextEncoder();
  const signal = request.signal;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (value: string) => controller.enqueue(encoder.encode(value));
      const sendEvent = (event: string, data: unknown) => {
        send(`event: ${event}\n`);
        send(`data: ${JSON.stringify(data)}\n\n`);
      };

      send('retry: 3000\n\n');
      sendEvent('ready', { revision: initialState.revision });

      let revision = initialState.revision;
      let lastHeartbeat = Date.now();
      const startedAt = Date.now();

      while (
        !signal.aborted &&
        Date.now() - startedAt < STREAM_LIFETIME_MS
      ) {
        await sleep(REVISION_POLL_MS, signal);
        if (signal.aborted) break;

        try {
          const nextState = await getDiscussionRevision(discussionId);
          if (!nextState) {
            sendEvent('removed', {});
            break;
          }
          if (
            nextState.removed &&
            nextState.ownerId !== userId &&
            currentUser?.role !== 'ADMIN'
          ) {
            sendEvent('removed', {});
            break;
          }
          if (nextState.revision !== revision) {
            revision = nextState.revision;
            sendEvent('revision', { revision });
          }

          if (Date.now() - lastHeartbeat >= HEARTBEAT_MS) {
            lastHeartbeat = Date.now();
            send(`: heartbeat ${lastHeartbeat}\n\n`);
          }
        } catch {
          sendEvent('stream-error', { code: 'REVISION_READ_FAILED' });
          break;
        }
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
