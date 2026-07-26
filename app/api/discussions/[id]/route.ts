/**
 * Single Discussion API - GET discussion with one chronological message stream
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/src/db/client';
import { getCurrentSession } from '@/src/modules/auth/utils/session';
import { RATE_LIMITS } from '@/src/config/constants';
import { getPrivateNoStoreHeaders } from '@/src/lib/http-cache';
import { buildRateLimitResponse, checkRateLimit, getRateLimitIdentifier } from '@/src/security/rateLimiter';
import { isDbSchemaMismatch } from '@/src/db/schema-mismatch';
import { getPublicErrorMessage } from '@/src/security/public-error';
import { requirePlatformContentAccess } from '@/src/modules/auth/utils/write-access';
import { JSON_BODY_LIMITS, readJsonBody } from '@/src/security/json-body';
import {
  DISCUSSION_SLOWMODE_SECONDS,
  getDiscussionSlowmodeRetrySeconds,
} from '@/src/config/discussions';

export const runtime = 'nodejs';

function classifyDiscussionDetailError(error: unknown): { status: number; code: string; message: string } {
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';
  if (rawMessage.includes('DATABASE_URL is not set')) {
    return { status: 503, code: 'DB_NOT_CONFIGURED', message: 'Database is not configured.' };
  }

  if (isDbSchemaMismatch(error)) {
    return { status: 503, code: 'DB_SCHEMA_MISMATCH', message: 'Database schema is out of date.' };
  }

  return {
    status: 500,
    code: 'INTERNAL',
    message: getPublicErrorMessage(error),
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUserId = await getCurrentSession();
    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Unauthorized', errorKey: 'unauthorized' },
        { status: 401, headers: getPrivateNoStoreHeaders() },
      );
    }
    const contentAccess = await requirePlatformContentAccess(currentUserId);
    if (!contentAccess.ok) {
      return NextResponse.json(
        {
          error: 'error' in contentAccess ? contentAccess.error : 'Unauthorized',
          errorKey: contentAccess.errorKey,
        },
        { status: contentAccess.status, headers: getPrivateNoStoreHeaders() },
      );
    }
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { role: true },
    });
    const isAdminUser = currentUser?.role === 'ADMIN';

    const identifier = getRateLimitIdentifier(request, currentUserId);
    const rateLimit = await checkRateLimit(`discussions:detail:${identifier}`, RATE_LIMITS.GENERAL);
    if (!rateLimit.allowed) {
      const { status, body, headers } = buildRateLimitResponse(rateLimit);
      return NextResponse.json(body, { status, headers });
    }

    const discussion = await prisma.discussion.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        content: true,
        tags: true,
        lastActivityAt: true,
        archivedAt: true,
        removedAt: true,
        removedReason: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        replies: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            content: true,
            createdAt: true,
            removedAt: true,
            removedReason: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!discussion) {
      return NextResponse.json({ error: 'Discussion not found' }, { status: 404 });
    }
    if (discussion.removedAt && !(isAdminUser || (currentUserId && discussion.user.id === currentUserId))) {
      return NextResponse.json({ error: 'Discussion not found' }, { status: 404 });
    }

    const participantState = await prisma.discussionParticipantState.findUnique({
      where: {
        discussionId_userId: {
          discussionId: discussion.id,
          userId: currentUserId,
        },
      },
      select: {
        lastReadAt: true,
        lastReadReplyId: true,
        lastSentAt: true,
      },
    });

    const lastReadReplyIndex = participantState?.lastReadReplyId
      ? discussion.replies.findIndex(
          (reply) => reply.id === participantState.lastReadReplyId,
        )
      : -1;
    const firstUnreadReply =
      participantState == null
        ? null
        : lastReadReplyIndex >= 0
          ? discussion.replies[lastReadReplyIndex + 1] ?? null
          : participantState.lastReadAt
            ? discussion.replies.find(
                (reply) =>
                  reply.createdAt.getTime() >
                  participantState.lastReadAt!.getTime(),
              ) ?? null
            : null;

    const formatReply = (r: (typeof discussion.replies)[0]) => ({
      id: r.id,
      content: r.removedAt ? '' : r.content,
      createdAt: r.createdAt,
      removedAt: r.removedAt,
      removedReason: r.removedReason,
      authorId: r.user.id,
      authorName:
        [r.user.firstName, r.user.lastName].filter(Boolean).join(' ') ||
        'Student',
    });

    return NextResponse.json({
      id: discussion.id,
      title: discussion.title,
      content: discussion.content,
      tags: discussion.tags,
      lastActivityAt: discussion.lastActivityAt,
      createdAt: discussion.createdAt,
      archivedAt: discussion.archivedAt,
      removedAt: discussion.removedAt,
      removedReason: discussion.removedReason,
      authorId: discussion.user.id,
      authorName:
        [discussion.user.firstName, discussion.user.lastName].filter(Boolean).join(' ') ||
        'Student',
      replies: discussion.replies.map(formatReply),
      currentUserId,
      unreadBoundaryId: firstUnreadReply?.id ?? null,
      slowmodeSeconds: DISCUSSION_SLOWMODE_SECONDS,
      slowmodeRetryAfterSeconds:
        getDiscussionSlowmodeRetrySeconds(participantState?.lastSentAt),
    }, { headers: getPrivateNoStoreHeaders() });
  } catch (error) {
    const classified = classifyDiscussionDetailError(error);
    console.error('Error fetching discussion:', error);
    return NextResponse.json(
      { error: classified.message, code: classified.code },
      { status: classified.status, headers: { 'x-oy-error-code': classified.code } },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentSession();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { requireVerifiedEmailForWrite } = await import('@/src/modules/auth/utils/write-access');
    const verified = await requireVerifiedEmailForWrite(userId);
    if (!verified.ok) {
      return NextResponse.json(
        { error: 'error' in verified ? verified.error : 'Unauthorized', errorKey: verified.errorKey },
        { status: verified.status },
      );
    }

    const identifier = getRateLimitIdentifier(request, userId);
    const rateLimit = await checkRateLimit(`discussions:update:${identifier}`, RATE_LIMITS.WRITE);
    if (!rateLimit.allowed) {
      const { status, body, headers } = buildRateLimitResponse(rateLimit);
      return NextResponse.json(body, { status, headers });
    }

    const { id } = await params;
    const bodyResult = await readJsonBody<{ action?: unknown }>(
      request,
      JSON_BODY_LIMITS.SMALL,
    );
    if (!bodyResult.ok) {
      return NextResponse.json(
        { error: bodyResult.error },
        { status: bodyResult.status, headers: getPrivateNoStoreHeaders() },
      );
    }
    const body = bodyResult.value;
    const action = typeof body?.action === 'string' ? body.action : null;

    if (action !== 'end') {
      return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
    }

    const discussion = await prisma.discussion.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        archivedAt: true,
        removedAt: true,
      },
    });

    if (!discussion || discussion.removedAt) {
      return NextResponse.json({ error: 'Discussion not found' }, { status: 404 });
    }

    if (discussion.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (discussion.archivedAt) {
      return NextResponse.json(
        { ok: true, alreadyEnded: true, archivedAt: discussion.archivedAt },
        { headers: getPrivateNoStoreHeaders() },
      );
    }

    const ended = await prisma.discussion.update({
      where: { id },
      data: { archivedAt: new Date() },
      select: { id: true, archivedAt: true },
    });

    return NextResponse.json(
      { ok: true, ended: true, archivedAt: ended.archivedAt },
      { headers: getPrivateNoStoreHeaders() },
    );
  } catch (error) {
    const classified = classifyDiscussionDetailError(error);
    console.error('Error ending discussion:', error);
    return NextResponse.json(
      { error: classified.message, code: classified.code },
      { status: classified.status, headers: { 'x-oy-error-code': classified.code } },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentSession();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { requireVerifiedEmailForWrite } = await import('@/src/modules/auth/utils/write-access');
    const verified = await requireVerifiedEmailForWrite(userId);
    if (!verified.ok) {
      return NextResponse.json(
        { error: 'error' in verified ? verified.error : 'Unauthorized', errorKey: verified.errorKey },
        { status: verified.status },
      );
    }

    const identifier = getRateLimitIdentifier(request, userId);
    const rateLimit = await checkRateLimit(`discussions:delete:${identifier}`, RATE_LIMITS.WRITE);
    if (!rateLimit.allowed) {
      const { status, body, headers } = buildRateLimitResponse(rateLimit);
      return NextResponse.json(body, { status, headers });
    }

    const { id } = await params;
    const discussion = await prisma.discussion.findUnique({
      where: { id },
      select: { id: true, userId: true, archivedAt: true, removedAt: true },
    });

    if (!discussion || discussion.archivedAt) {
      return NextResponse.json({ error: 'Discussion not found' }, { status: 404 });
    }

    if (discussion.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (discussion.removedAt) {
      return NextResponse.json({ ok: true, alreadyDeleted: true }, { headers: getPrivateNoStoreHeaders() });
    }

    const now = new Date();
    const replyCount = await prisma.discussionReply.count({ where: { discussionId: id } });

    if (replyCount === 0) {
      await prisma.discussion.delete({ where: { id } });

      return NextResponse.json(
        { ok: true, deleted: true },
        { headers: getPrivateNoStoreHeaders() },
      );
    }

    await prisma.discussion.update({
      where: { id },
      data: { removedAt: now, removedById: userId, removedReason: 'author_deleted' },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, deleted: true }, { headers: getPrivateNoStoreHeaders() });
  } catch (error) {
    console.error('Error deleting discussion:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
