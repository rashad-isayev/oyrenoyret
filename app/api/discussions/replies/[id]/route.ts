/**
 * Discussion message API
 *
 * Messages belong directly to a discussion timeline. There is intentionally no
 * message-detail or nested-reply read surface.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/src/db/client';
import { getCurrentSession } from '@/src/modules/auth/utils/session';
import { RATE_LIMITS } from '@/src/config/constants';
import { getPrivateNoStoreHeaders } from '@/src/lib/http-cache';
import {
  buildRateLimitResponse,
  checkRateLimit,
  getRateLimitIdentifier,
} from '@/src/security/rateLimiter';

export const runtime = 'nodejs';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentSession();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { requireVerifiedEmailForWrite } = await import(
      '@/src/modules/auth/utils/write-access'
    );
    const verified = await requireVerifiedEmailForWrite(userId);
    if (!verified.ok) {
      return NextResponse.json(
        {
          error: 'error' in verified ? verified.error : 'Unauthorized',
          errorKey: verified.errorKey,
        },
        { status: verified.status },
      );
    }

    const identifier = getRateLimitIdentifier(request, userId);
    const rateLimit = await checkRateLimit(
      `discussions:message:delete:${identifier}`,
      RATE_LIMITS.WRITE,
    );
    if (!rateLimit.allowed) {
      const { status, body, headers } = buildRateLimitResponse(rateLimit);
      return NextResponse.json(body, { status, headers });
    }

    const { id: messageId } = await params;
    const message = await prisma.discussionReply.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        userId: true,
        discussionId: true,
        removedAt: true,
      },
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }
    if (message.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (message.removedAt) {
      return NextResponse.json(
        { ok: true, alreadyDeleted: true },
        { headers: getPrivateNoStoreHeaders() },
      );
    }

    const deletedAt = new Date();
    await prisma.$transaction([
      prisma.discussionReply.update({
        where: { id: messageId },
        data: {
          removedAt: deletedAt,
          removedById: userId,
          removedReason: 'author_deleted',
        },
        select: { id: true },
      }),
      prisma.discussion.update({
        where: { id: message.discussionId },
        data: { lastActivityAt: deletedAt },
        select: { id: true },
      }),
    ]);

    return NextResponse.json(
      { ok: true, deleted: true, removedAt: deletedAt },
      { headers: getPrivateNoStoreHeaders() },
    );
  } catch (error) {
    console.error('Error deleting discussion message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
