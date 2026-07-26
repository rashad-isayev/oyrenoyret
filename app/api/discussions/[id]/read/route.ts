import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/src/db/client';
import { RATE_LIMITS } from '@/src/config/constants';
import { getCurrentSession } from '@/src/modules/auth/utils/session';
import { getPrivateNoStoreHeaders } from '@/src/lib/http-cache';
import {
  buildRateLimitResponse,
  checkRateLimit,
  getRateLimitIdentifier,
} from '@/src/security/rateLimiter';
import { requirePlatformContentAccess } from '@/src/modules/auth/utils/write-access';
import { JSON_BODY_LIMITS, readJsonBody } from '@/src/security/json-body';

export const runtime = 'nodejs';

const READ_CURSOR_TRANSACTION_ATTEMPTS = 3;

async function updateReadCursor({
  discussionId,
  userId,
  lastReadReplyId,
  lastReadAt,
}: {
  discussionId: string;
  userId: string;
  lastReadReplyId: string | null;
  lastReadAt: Date;
}) {
  for (
    let attempt = 0;
    attempt < READ_CURSOR_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const existing =
            await tx.discussionParticipantState.findUnique({
              where: {
                discussionId_userId: { discussionId, userId },
              },
              select: { lastReadAt: true, lastReadReplyId: true },
            });

          if (
            existing?.lastReadAt &&
            existing.lastReadAt.getTime() >= lastReadAt.getTime()
          ) {
            return existing;
          }

          return tx.discussionParticipantState.upsert({
            where: {
              discussionId_userId: { discussionId, userId },
            },
            create: {
              discussionId,
              userId,
              lastReadReplyId,
              lastReadAt,
            },
            update: {
              lastReadReplyId,
              lastReadAt,
            },
            select: { lastReadAt: true, lastReadReplyId: true },
          });
        },
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034' &&
        attempt < READ_CURSOR_TRANSACTION_ATTEMPTS - 1
      ) {
        continue;
      }
      throw error;
    }
  }

  throw new Error('READ_CURSOR_UPDATE_FAILED');
}

export async function POST(
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
      { status: contentAccess.status, headers: getPrivateNoStoreHeaders() },
    );
  }

  const identifier = getRateLimitIdentifier(request, userId);
  const rateLimit = await checkRateLimit(
    `discussions:read:${identifier}`,
    RATE_LIMITS.GENERAL,
  );
  if (!rateLimit.allowed) {
    const { status, body, headers } = buildRateLimitResponse(rateLimit);
    return NextResponse.json(body, { status, headers });
  }

  const { id: discussionId } = await params;
  const bodyResult = await readJsonBody<{ lastReadReplyId?: unknown }>(
    request,
    JSON_BODY_LIMITS.SMALL,
  );
  if (!bodyResult.ok) {
    return NextResponse.json(
      { error: bodyResult.error },
      {
        status: bodyResult.status,
        headers: getPrivateNoStoreHeaders(),
      },
    );
  }
  const body = bodyResult.value;
  const requestedReplyId =
    typeof body?.lastReadReplyId === 'string'
      ? body.lastReadReplyId
      : null;

  const [discussion, currentUser] = await Promise.all([
    prisma.discussion.findUnique({
      where: { id: discussionId },
      select: {
        id: true,
        userId: true,
        createdAt: true,
        removedAt: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    }),
  ]);

  if (
    !discussion ||
    (discussion.removedAt &&
      discussion.userId !== userId &&
      currentUser?.role !== 'ADMIN')
  ) {
    return NextResponse.json(
      { error: 'Discussion not found' },
      { status: 404 },
    );
  }

  const reply = requestedReplyId
    ? await prisma.discussionReply.findFirst({
        where: {
          id: requestedReplyId,
          discussionId,
        },
        select: { id: true, createdAt: true },
      })
    : null;

  if (requestedReplyId && !reply) {
    return NextResponse.json(
      { error: 'Read cursor is not part of this discussion' },
      { status: 400 },
    );
  }

  const state = await updateReadCursor({
    discussionId,
    userId,
    lastReadReplyId: reply?.id ?? null,
    lastReadAt: reply?.createdAt ?? discussion.createdAt,
  });

  return NextResponse.json(
    {
      ok: true,
      lastReadReplyId: state.lastReadReplyId,
      lastReadAt: state.lastReadAt,
    },
    { headers: getPrivateNoStoreHeaders() },
  );
}
