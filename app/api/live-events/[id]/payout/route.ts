/** Atomically pays verified sprint participants after an event ends (admin only). */

import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/src/db/client';
import { getCurrentSession } from '@/src/modules/auth/utils/session';
import { isAdmin } from '@/src/lib/permissions';
import { calcSprintPayout, roundCredits } from '@/src/modules/credits';
import { requireVerifiedEmailForWrite } from '@/src/modules/auth/utils/write-access';
import { isDbSchemaMismatch } from '@/src/db/schema-mismatch';
import { RATE_LIMITS } from '@/src/config/constants';
import { buildRateLimitResponse, checkRateLimit, getRateLimitIdentifier } from '@/src/security/rateLimiter';

type WinnerInput = { rank: 1 | 2 | 3; value: string };
type ResolvedWinner = WinnerInput & { userId: string; email: string | null };

function normalizeValue(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, 254) : '';
}

async function resolveUser(value: string) {
  if (!value) return null;
  return prisma.user.findFirst({
    where: value.includes('@')
      ? { email: value.toLowerCase(), deletedAt: null, status: 'ACTIVE' }
      : { OR: [{ id: value }, { publicId: value }], deletedAt: null, status: 'ACTIVE' },
    select: { id: true, email: true },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const adminId = await getCurrentSession();
    if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const verified = await requireVerifiedEmailForWrite(adminId);
    if (!verified.ok) {
      const message = 'error' in verified ? verified.error : 'Unauthorized';
      return NextResponse.json({ error: message, errorKey: verified.errorKey }, { status: verified.status });
    }

    const admin = await prisma.user.findUnique({ where: { id: adminId }, select: { role: true } });
    if (!admin || !isAdmin(admin.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const identifier = getRateLimitIdentifier(request, adminId);
    const rateLimit = await checkRateLimit(`live-events:payout:${identifier}`, RATE_LIMITS.ADMIN_WRITE);
    if (!rateLimit.allowed) {
      const { status, body, headers } = buildRateLimitResponse(rateLimit);
      return NextResponse.json(body, { status, headers });
    }

    const { id } = await params;
    const liveEvent = await prisma.liveEvent.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, type: true, creditCost: true, date: true, durationMinutes: true },
    });
    if (!liveEvent) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    if (liveEvent.type !== 'PROBLEM_SPRINT') {
      return NextResponse.json({ error: 'Payouts are only for problem sprints.' }, { status: 400 });
    }
    const eventEndsAt = liveEvent.date.getTime() + liveEvent.durationMinutes * 60_000;
    if (Date.now() < eventEndsAt) {
      return NextResponse.json({ error: 'Payouts are available only after the sprint ends.' }, { status: 409 });
    }

    const body = await request.json().catch(() => ({}));
    const winners: WinnerInput[] = [
      { rank: 1, value: normalizeValue(body?.first) },
      { rank: 2, value: normalizeValue(body?.second) },
      { rank: 3, value: normalizeValue(body?.third) },
    ].filter((winner): winner is WinnerInput => Boolean(winner.value));
    if (winners.length === 0) {
      return NextResponse.json({ error: 'At least one winner is required.' }, { status: 400 });
    }

    const resolved: ResolvedWinner[] = [];
    for (const winner of winners) {
      const user = await resolveUser(winner.value);
      if (!user) {
        return NextResponse.json({ error: `Eligible user not found for rank ${winner.rank}.` }, { status: 404 });
      }
      const eligible = await prisma.liveEventEnrollment.findFirst({
        where: {
          liveEventId: liveEvent.id,
          userId: user.id,
          status: 'CONFIRMED',
          liveEvent: { submissions: { some: { userId: user.id, deletedAt: null } } },
        },
        select: { id: true },
      });
      if (!eligible) {
        return NextResponse.json(
          { error: `Rank ${winner.rank} must be a confirmed participant with a submission.` },
          { status: 400 },
        );
      }
      resolved.push({ ...winner, userId: user.id, email: user.email });
    }

    if (new Set(resolved.map((winner) => winner.userId)).size !== resolved.length) {
      return NextResponse.json({ error: 'Winners must be unique for each rank.' }, { status: 400 });
    }

    try {
      const payouts = await prisma.$transaction(async (tx) => {
        const results: Array<{ rank: 1 | 2 | 3; userId: string; email: string | null; amount: number; balanceAfter: number }> = [];
        for (const winner of resolved) {
          const referenceId = `${liveEvent.id}:rank:${winner.rank}`;
          const priorRank = await tx.creditTransaction.findFirst({
            where: { type: 'SPRINT_PAYOUT', referenceId },
            select: { id: true },
          });
          const priorWinner = await tx.creditTransaction.findFirst({
            where: {
              userId: winner.userId,
              type: 'SPRINT_PAYOUT',
              referenceId: { startsWith: `${liveEvent.id}:rank:` },
            },
            select: { id: true },
          });
          if (priorRank || priorWinner) throw new Error('PAYOUT_ALREADY_EXISTS');

          const amount = roundCredits(calcSprintPayout(liveEvent.creditCost, winner.rank));
          const updated = await tx.user.update({
            where: { id: winner.userId },
            data: { credits: { increment: amount } },
            select: { credits: true },
          });
          await tx.creditTransaction.create({
            data: {
              userId: winner.userId,
              amount,
              balanceAfter: updated.credits,
              type: 'SPRINT_PAYOUT',
              referenceId,
              metadata: { liveEventId: liveEvent.id, rank: winner.rank, cost: liveEvent.creditCost },
            },
          });
          results.push({
            rank: winner.rank,
            userId: winner.userId,
            email: winner.email,
            amount,
            balanceAfter: roundCredits(updated.credits),
          });
        }
        return results;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      return NextResponse.json({ payouts });
    } catch (error) {
      if (
        (error instanceof Error && error.message === 'PAYOUT_ALREADY_EXISTS') ||
        (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2002' || error.code === 'P2034'))
      ) {
        return NextResponse.json({ error: 'One or more payouts already exist. No credits were changed.' }, { status: 409 });
      }
      throw error;
    }
  } catch (error) {
    if (isDbSchemaMismatch(error)) {
      return NextResponse.json({ error: 'Sprint payouts are temporarily unavailable.' }, { status: 503 });
    }
    console.error('Error granting sprint payout:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
