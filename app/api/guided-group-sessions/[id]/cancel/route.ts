/**
 * Guided Group Session Cancel API
 *
 * POST: Facilitator cancels their scheduled session.
 * If any learners are registered (pending/approved), facilitator receives a 1-credit penalty.
 * Creates notifications for facilitator + registered learners.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/src/db/client';
import { getCurrentSession } from '@/src/modules/auth/utils/session';
import { RATE_LIMITS } from '@/src/config/constants';
import { buildRateLimitResponse, checkRateLimit, getRateLimitIdentifier } from '@/src/security/rateLimiter';
import { requireVerifiedEmailForWrite } from '@/src/modules/auth/utils/write-access';
import { isDbSchemaMismatch } from '@/src/db/schema-mismatch';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idRaw } = await params;
    const sessionId = typeof idRaw === 'string' ? idRaw.trim() : '';
    if (!sessionId) {
      return NextResponse.json({ error: 'Session id is required.' }, { status: 400 });
    }

    const userId = await getCurrentSession();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const verified = await requireVerifiedEmailForWrite(userId);
    if (!verified.ok) {
      const message = 'error' in verified ? verified.error : 'Unauthorized';
      return NextResponse.json(
        { error: message, errorKey: verified.errorKey },
        { status: verified.status },
      );
    }

    const identifier = getRateLimitIdentifier(request, userId);
    const rateLimit = await checkRateLimit(`guided-group-sessions:cancel:${identifier}`, RATE_LIMITS.WRITE);
    if (!rateLimit.allowed) {
      const { status, body, headers } = buildRateLimitResponse(rateLimit);
      return NextResponse.json(body, { status, headers });
    }

    const session = await prisma.guidedGroupSession.findFirst({
      where: { id: sessionId, deletedAt: null },
      select: {
        id: true,
        title: true,
        facilitatorId: true,
        status: true,
        scheduledAt: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    }

    if (session.facilitatorId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (session.status !== 'SCHEDULED') {
      return NextResponse.json({ error: 'This session cannot be cancelled.' }, { status: 409 });
    }

    const now = new Date();
    if (session.scheduledAt.getTime() <= now.getTime()) {
      return NextResponse.json({ error: 'This session has already started.' }, { status: 409 });
    }

    const enrollments = await prisma.guidedGroupSessionEnrollment.findMany({
      where: { sessionId: session.id, status: { in: ['PENDING', 'APPROVED'] } },
      select: { userId: true },
    });

    const hasRegistrations = enrollments.length > 0;

    const outcome = await prisma.$transaction(async (tx) => {
      const cancelled = await tx.guidedGroupSession.updateMany({
        where: { id: session.id, status: 'SCHEDULED' },
        data: {
          status: 'CANCELLED',
          cancelledAt: now,
          cancelledById: userId,
          endedAt: now,
        },
      });
      if (cancelled.count !== 1) throw new Error('SESSION_STATE_CHANGED');

      await tx.guidedGroupSessionEnrollment.updateMany({
        where: { sessionId: session.id, status: { in: ['PENDING', 'APPROVED'] } },
        data: { status: 'CANCELLED', cancelledAt: now },
      });

      // Notices
      const noticeRows = [
        {
          userId,
          type: 'GUIDED_GROUP_SESSION_CANCELLED' as const,
          title: 'Guided group session cancelled',
          body: hasRegistrations
            ? `You cancelled "${session.title}". A 1-credit cancellation penalty was applied.`
            : `You cancelled "${session.title}".`,
          linkUrl: '/my-library/guided-group-sessions',
        },
        ...enrollments.map((e) => ({
          userId: e.userId,
          type: 'GUIDED_GROUP_SESSION_CANCELLED' as const,
          title: 'Guided group session cancelled',
          body: `"${session.title}" was cancelled by the facilitator.`,
          linkUrl: '/my-library/guided-group-sessions',
        })),
      ];

      await tx.moderationNotice.createMany({
        data: noticeRows,
      });

      let balanceAfter: number | null = null;
      if (hasRegistrations) {
        const charged = await tx.user.update({
          where: { id: userId },
          data: { credits: { decrement: 1 } },
          select: { credits: true },
        });
        await tx.creditTransaction.create({
          data: {
            userId,
            amount: -1,
            balanceAfter: charged.credits,
            type: 'GROUP_SESSION_CANCEL_PENALTY',
            referenceId: session.id,
            metadata: { sessionId: session.id, penalty: 1, reason: 'cancel_with_registrations' },
          },
        });
        balanceAfter = Math.round(charged.credits);
      }

      return { balanceAfter };
    });

    return NextResponse.json({ ok: true, balanceAfter: outcome.balanceAfter });
  } catch (error) {
    if (error instanceof Error && error.message === 'SESSION_STATE_CHANGED') {
      return NextResponse.json({ error: 'This session state changed. Please refresh.' }, { status: 409 });
    }
    if (isDbSchemaMismatch(error)) {
      return NextResponse.json(
        { error: 'This feature is temporarily unavailable. Apply database migrations first.' },
        { status: 503 },
      );
    }
    console.error('Error cancelling guided group session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
