/**
 * Archive Discussions Cron
 *
 * Archives established conversations after prolonged inactivity and removes
 * empty discussions sooner.
 * Call via: GET /api/cron/archive-discussions
 * SECURITY: In production, CRON_SECRET must be set and passed as Bearer token.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/src/db/client';
import { RATE_LIMITS } from '@/src/config/constants';
import { buildRateLimitResponse, checkRateLimit, getRateLimitIdentifier } from '@/src/security/rateLimiter';
import { hasValidBearerSecret } from '@/src/security/bearer-secret';

export const runtime = 'nodejs';

const DEFAULT_ARCHIVE_INACTIVITY_HOURS = 30 * 24;
const DEFAULT_EMPTY_INACTIVITY_HOURS = 24;
const parsedArchiveHours = Number(
  process.env.DISCUSSION_ARCHIVE_INACTIVITY_HOURS ??
    process.env.DISCUSSION_INACTIVITY_HOURS,
);
const parsedEmptyHours = Number(
  process.env.DISCUSSION_EMPTY_INACTIVITY_HOURS,
);
const archiveInactivityHours =
  Number.isFinite(parsedArchiveHours) && parsedArchiveHours > 0
    ? parsedArchiveHours
    : DEFAULT_ARCHIVE_INACTIVITY_HOURS;
const emptyInactivityHours =
  Number.isFinite(parsedEmptyHours) && parsedEmptyHours > 0
    ? parsedEmptyHours
    : DEFAULT_EMPTY_INACTIVITY_HOURS;
const ARCHIVE_THRESHOLD_MS = archiveInactivityHours * 60 * 60 * 1000;
const REMOVE_THRESHOLD_MS = emptyInactivityHours * 60 * 60 * 1000;

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      if (!cronSecret) {
        return NextResponse.json(
          { error: 'Cron endpoint not configured. Set CRON_SECRET in production.' },
          { status: 503 }
        );
      }
      if (!hasValidBearerSecret(authHeader, cronSecret)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else if (cronSecret && !hasValidBearerSecret(authHeader, cronSecret)) {
      // In dev/test: if CRON_SECRET is set, require it
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const identifier = getRateLimitIdentifier(request);
    const rateLimit = await checkRateLimit(
      `cron:archive-discussions:${identifier}`,
      RATE_LIMITS.ADMIN_WRITE
    );
    if (!rateLimit.allowed) {
      const { status, body, headers } = buildRateLimitResponse(rateLimit);
      return NextResponse.json(body, { status, headers });
    }

    const archiveCutoff = new Date(Date.now() - ARCHIVE_THRESHOLD_MS);
    const removeCutoff = new Date(Date.now() - REMOVE_THRESHOLD_MS);
    const candidateCutoff = new Date(
      Math.max(archiveCutoff.getTime(), removeCutoff.getTime())
    );
    const now = new Date();

    const candidates = await prisma.discussion.findMany({
      where: {
        archivedAt: null,
        lastActivityAt: { lt: candidateCutoff },
      },
      select: {
        id: true,
        userId: true,
        lastActivityAt: true,
        _count: { select: { replies: true } },
      },
    });

    let archivedCount = 0;
    let removedCount = 0;
    let skippedCount = 0;

    if (candidates.length === 0) {
      return NextResponse.json({
        archived: 0,
        removed: 0,
        skipped: 0,
        message: 'Archived 0, removed 0.',
      });
    }

    const removeCandidates = candidates.filter(
      (c) => c._count.replies === 0 && c.lastActivityAt < removeCutoff,
    );

    const removedIds: string[] = [];

    for (const candidate of removeCandidates) {
      try {
        const outcome = await prisma.$transaction(async (tx) => {
          const discussion = await tx.discussion.findUnique({
            where: { id: candidate.id },
            select: { id: true, userId: true, archivedAt: true, lastActivityAt: true },
          });

          if (!discussion || discussion.archivedAt) {
            return { status: 'skipped' as const };
          }
          if (discussion.lastActivityAt >= removeCutoff) {
            return { status: 'skipped' as const };
          }

          const hasReply = await tx.discussionReply.findFirst({
            where: { discussionId: discussion.id },
            select: { id: true },
          });
          if (hasReply) {
            return { status: 'skipped' as const };
          }

          await tx.discussion.delete({ where: { id: discussion.id } });
          return { status: 'removed' as const };
        });

        if (outcome.status === 'removed') {
          removedCount += 1;
          removedIds.push(candidate.id);
        } else {
          skippedCount += 1;
        }
      } catch (error) {
        skippedCount += 1;
        console.error('Error removing discussion:', error);
      }
    }

    try {
      const where = {
        archivedAt: null,
        lastActivityAt: { lt: archiveCutoff },
        ...(removedIds.length > 0 ? { id: { notIn: removedIds } } : {}),
      };
      const result = await prisma.discussion.updateMany({
        where,
        data: { archivedAt: now },
      });
      archivedCount = result.count;
    } catch (error) {
      console.error('Error archiving discussions:', error);
      skippedCount += Math.max(candidates.length - removedCount - skippedCount, 0);
    }

    const totalProcessed = archivedCount + removedCount;
    const impliedSkipped = Math.max(candidates.length - totalProcessed, 0);
    if (skippedCount < impliedSkipped) skippedCount = impliedSkipped;

    return NextResponse.json({
      archived: archivedCount,
      removed: removedCount,
      skipped: skippedCount,
      message: `Archived ${archivedCount}, removed ${removedCount}.`,
    });
  } catch (error) {
    console.error('Error archiving discussions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
