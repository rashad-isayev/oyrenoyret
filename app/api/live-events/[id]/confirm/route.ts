/** Live event confirmation and entry charge, committed atomically. */

import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/src/db/client';
import { getCurrentSession } from '@/src/modules/auth/utils/session';
import { roundCredits } from '@/src/modules/credits';
import { isStaff } from '@/src/lib/permissions';
import { RATE_LIMITS } from '@/src/config/constants';
import { buildRateLimitResponse, checkRateLimit, getRateLimitIdentifier } from '@/src/security/rateLimiter';
import { requireVerifiedEmailForWrite } from '@/src/modules/auth/utils/write-access';
import { isDbSchemaMismatch } from '@/src/db/schema-mismatch';

async function chargeAndConfirm(eventId: string, userId: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const event = await tx.liveEvent.findFirst({
          where: { id: eventId, deletedAt: null },
          select: { id: true, creditCost: true, date: true },
        });
        if (!event) throw new Error('EVENT_NOT_FOUND');
        if (event.date.getTime() <= Date.now()) throw new Error('EVENT_STARTED');

        const enrollment = await tx.liveEventEnrollment.findUnique({
          where: { liveEventId_userId: { liveEventId: event.id, userId } },
          select: { id: true, status: true },
        });
        if (!enrollment) throw new Error('ENROLLMENT_NOT_FOUND');
        if (enrollment.status === 'CANCELLED') throw new Error('ENROLLMENT_CANCELLED');

        const cost = roundCredits(event.creditCost);
        const existingCharge = await tx.creditTransaction.findUnique({
          where: {
            userId_type_referenceId: {
              userId,
              type: 'SPRINT_ENTRY',
              referenceId: event.id,
            },
          },
          select: { id: true, balanceAfter: true, amount: true },
        });

        if (enrollment.status === 'CONFIRMED') {
          const current = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { credits: true } });
          return { status: enrollment.status, balanceAfter: roundCredits(current.credits), creditsSpent: 0 };
        }

        let balanceAfter: number;
        let creditsSpent = 0;
        if (existingCharge) {
          balanceAfter = roundCredits(existingCharge.balanceAfter);
        } else {
          const charged = await tx.user.updateMany({
            where: { id: userId, credits: { gte: cost } },
            data: { credits: { decrement: cost } },
          });
          if (charged.count !== 1) throw new Error('INSUFFICIENT_CREDITS');
          const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { credits: true } });
          balanceAfter = roundCredits(user.credits);
          creditsSpent = cost;
          await tx.creditTransaction.create({
            data: {
              userId,
              amount: -cost,
              balanceAfter: user.credits,
              type: 'SPRINT_ENTRY',
              referenceId: event.id,
              metadata: { liveEventId: event.id, cost },
            },
          });
        }

        const confirmed = await tx.liveEventEnrollment.updateMany({
          where: { id: enrollment.id, status: 'PENDING' },
          data: { status: 'CONFIRMED', verifiedAt: new Date() },
        });
        if (confirmed.count !== 1) throw new Error('ENROLLMENT_STATE_CHANGED');

        return { status: 'CONFIRMED' as const, balanceAfter, creditsSpent };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034' && attempt < 2) {
        continue;
      }
      throw error;
    }
  }
  throw new Error('TRANSACTION_RETRY_EXHAUSTED');
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: paramIdRaw } = await params;
    const eventId = typeof paramIdRaw === 'string' ? paramIdRaw.trim() : '';
    const body = await request.json().catch(() => ({}));
    const bodyId = typeof body?.liveEventId === 'string' ? body.liveEventId.trim() : '';
    if (!eventId || (bodyId && bodyId !== eventId)) {
      return NextResponse.json({ error: 'Invalid live event id' }, { status: 400 });
    }
    if (body?.accepted !== true) {
      return NextResponse.json({ error: 'Registration rules must be accepted' }, { status: 400 });
    }

    const userId = await getCurrentSession();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const verified = await requireVerifiedEmailForWrite(userId);
    if (!verified.ok) {
      const message = 'error' in verified ? verified.error : 'Unauthorized';
      return NextResponse.json({ error: message, errorKey: verified.errorKey }, { status: verified.status });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (isStaff(user.role)) {
      return NextResponse.json({ error: 'Staff accounts cannot confirm live event registrations.' }, { status: 403 });
    }

    const identifier = getRateLimitIdentifier(request, userId);
    const rateLimit = await checkRateLimit(`live-events:confirm:${identifier}`, RATE_LIMITS.LIVE_EVENT);
    if (!rateLimit.allowed) {
      const { status, body: responseBody, headers } = buildRateLimitResponse(rateLimit);
      return NextResponse.json(responseBody, { status, headers });
    }

    try {
      return NextResponse.json(await chargeAndConfirm(eventId, userId));
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'EVENT_NOT_FOUND') return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      if (message === 'EVENT_STARTED') return NextResponse.json({ error: 'This event has started.' }, { status: 409 });
      if (message === 'ENROLLMENT_NOT_FOUND') return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
      if (message === 'ENROLLMENT_CANCELLED') return NextResponse.json({ error: 'Registration was cancelled' }, { status: 409 });
      if (message === 'INSUFFICIENT_CREDITS') return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 });
      if (message === 'ENROLLMENT_STATE_CHANGED') return NextResponse.json({ error: 'Registration state changed' }, { status: 409 });
      throw error;
    }
  } catch (error) {
    if (isDbSchemaMismatch(error)) {
      return NextResponse.json({ error: 'Registrations are temporarily unavailable.' }, { status: 503 });
    }
    console.error('Error confirming live event registration:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
