/** Live event enrollment. Seats are reserved transactionally. */

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

async function reserveSeat(eventId: string, userId: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const event = await tx.liveEvent.findFirst({
          where: { id: eventId, deletedAt: null },
          select: { id: true, creditCost: true, date: true, maxParticipants: true },
        });
        if (!event) throw new Error('EVENT_NOT_FOUND');
        if (event.date.getTime() <= Date.now()) throw new Error('EVENT_STARTED');

        const existing = await tx.liveEventEnrollment.findUnique({
          where: { liveEventId_userId: { liveEventId: event.id, userId } },
          select: { id: true, status: true, liveEventId: true },
        });
        if (existing && existing.status !== 'CANCELLED') {
          return { enrollment: existing, creditCost: event.creditCost };
        }

        if (event.maxParticipants != null) {
          const reservedCount = await tx.liveEventEnrollment.count({
            where: { liveEventId: event.id, status: { in: ['PENDING', 'CONFIRMED'] } },
          });
          if (reservedCount >= event.maxParticipants) throw new Error('EVENT_FULL');
        }

        const enrollment = existing
          ? await tx.liveEventEnrollment.update({
              where: { id: existing.id },
              data: { status: 'PENDING', verifiedAt: null },
              select: { id: true, status: true, liveEventId: true },
            })
          : await tx.liveEventEnrollment.create({
              data: { liveEventId: event.id, userId, status: 'PENDING' },
              select: { id: true, status: true, liveEventId: true },
            });

        return { enrollment, creditCost: event.creditCost };
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
    const body = await request.json().catch(() => ({} as { liveEventId?: string; eventId?: string }));
    const bodyId = typeof body.liveEventId === 'string'
      ? body.liveEventId.trim()
      : typeof body.eventId === 'string'
        ? body.eventId.trim()
        : '';
    if (!eventId || (bodyId && bodyId !== eventId)) {
      return NextResponse.json({ error: 'Invalid live event id' }, { status: 400 });
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
      return NextResponse.json({ error: 'Staff accounts cannot register for live events.' }, { status: 403 });
    }

    const identifier = getRateLimitIdentifier(request, userId);
    const rateLimit = await checkRateLimit(`live-events:enroll:${identifier}`, RATE_LIMITS.LIVE_EVENT);
    if (!rateLimit.allowed) {
      const { status, body: responseBody, headers } = buildRateLimitResponse(rateLimit);
      return NextResponse.json(responseBody, { status, headers });
    }

    try {
      const result = await reserveSeat(eventId, userId);
      return NextResponse.json({
        status: result.enrollment.status,
        enrollmentId: result.enrollment.id,
        eventId: result.enrollment.liveEventId,
        creditCost: roundCredits(result.creditCost),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'EVENT_NOT_FOUND') return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      if (message === 'EVENT_STARTED') {
        return NextResponse.json({ error: 'This event is no longer accepting registrations.' }, { status: 409 });
      }
      if (message === 'EVENT_FULL') {
        return NextResponse.json({ error: 'This event is full. Please try another session.' }, { status: 409 });
      }
      throw error;
    }
  } catch (error) {
    if (isDbSchemaMismatch(error)) {
      return NextResponse.json({ error: 'Registrations are temporarily unavailable.' }, { status: 503 });
    }
    console.error('Error registering for live event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
