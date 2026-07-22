/**
 * Discussions API
 *
 * GET: List discussions (includes archived; archived are read-only)
 * POST: Create new discussion (requires auth)
 */

import { NextResponse } from 'next/server';
import { isDbSchemaMismatch } from '@/src/db/schema-mismatch';
import { getPublicErrorMessage } from '@/src/security/public-error';
// NOTE: Keep heavy dependencies inside handlers to avoid module-init crashes.

export const runtime = 'nodejs';

function classifyDiscussionsListError(error: unknown): { status: number; code: string; message: string } {
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';
  const message = rawMessage || 'Internal server error';

  if (rawMessage.includes('DATABASE_URL is not set')) {
    return { status: 503, code: 'DB_NOT_CONFIGURED', message: 'Database is not configured.' };
  }

  if (isDbSchemaMismatch(error)) {
    return { status: 503, code: 'DB_SCHEMA_MISMATCH', message: 'Database schema is out of date.' };
  }

  return { status: 500, code: 'INTERNAL', message };
}

export async function GET(request: Request) {
  try {
    const { prisma } = await import('@/src/db/client');
    const { RATE_LIMITS } = await import('@/src/config/constants');
    const { getPrivateNoStoreHeaders } = await import('@/src/lib/http-cache');
    const { buildRateLimitResponse, checkRateLimit, getRateLimitIdentifier } = await import('@/src/security/rateLimiter');
    const { getCurrentSession } = await import('@/src/modules/auth/utils/session');
    const { sanitizeInput } = await import('@/src/security/validation');
    const { Prisma } = await import('@prisma/client');

    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subjectId');
    const topicId = searchParams.get('topicId');
    const subjectsParam = searchParams.get('subjects');
    const queryRaw = searchParams.get('q');
    const includeVotes = searchParams.get('includeVotes') === '1';
    const takeParam = Number(searchParams.get('take') ?? 50);
    const skipParam = Number(searchParams.get('skip') ?? 0);
    const take = Number.isFinite(takeParam) ? Math.min(Math.max(takeParam, 1), 100) : 50;
    const skip = Number.isFinite(skipParam) && skipParam > 0 ? skipParam : 0;

    const sessionUserId = await getCurrentSession().catch(() => null);
    const identifier = getRateLimitIdentifier(request, sessionUserId);
    const rateLimit = await checkRateLimit(`discussions:list:${identifier}`, RATE_LIMITS.GENERAL);
    if (!rateLimit.allowed) {
      const { status, body, headers } = buildRateLimitResponse(rateLimit);
      return NextResponse.json(body, { status, headers });
    }

    const subjectIds = subjectsParam
      ? subjectsParam.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const query = sanitizeInput(queryRaw ?? '').trim();
    const combinedSubjectIds = Array.from(
      new Set([
        ...subjectIds,
        ...(subjectId ? [subjectId] : []),
      ]),
    );

    type DiscussionBase = {
      id: string;
      title: string;
      content: string;
      subjectId: string | null;
      topicId: string | null;
      lastActivityAt: Date;
      archivedAt: Date | null;
      createdAt: Date;
      authorId: string;
      authorFirstName: string | null;
      authorLastName: string | null;
      authorAvatarVariant: string | null;
    };

    const discussions: DiscussionBase[] = await (async () => {
      const runFullText = async () => {
        type Row = DiscussionBase & { rank: number };
        const vectorExpr = Prisma.sql`to_tsvector('simple', concat_ws(' ', d.title, d.content))`;
        const baseWhere = Prisma.sql`d."removedAt" IS NULL`;
        const subjectFilter =
          combinedSubjectIds.length > 0
            ? Prisma.sql` AND d."subjectId" IN (${Prisma.join(combinedSubjectIds)})`
            : Prisma.empty;
        const topicFilter = topicId ? Prisma.sql` AND d."topicId" = ${topicId}` : Prisma.empty;

        const runQuery = async (tsQueryFn: 'websearch_to_tsquery' | 'plainto_tsquery') => {
          const tsQuery =
            tsQueryFn === 'websearch_to_tsquery'
              ? Prisma.sql`websearch_to_tsquery('simple', ${query})`
              : Prisma.sql`plainto_tsquery('simple', ${query})`;
          return prisma.$queryRaw<Row[]>(Prisma.sql`
              SELECT
                d.id,
                d.title,
                d.content,
                d."subjectId" as "subjectId",
                d."topicId" as "topicId",
                d."lastActivityAt" as "lastActivityAt",
                d."archivedAt" as "archivedAt",
                d."createdAt" as "createdAt",
                u.id as "authorId",
                u."firstName" as "authorFirstName",
                u."lastName" as "authorLastName",
                u."avatarVariant" as "authorAvatarVariant",
                ts_rank_cd(${vectorExpr}, ${tsQuery}) as rank
              FROM "Discussion" d
              JOIN "User" u ON u.id = d."userId"
              WHERE ${baseWhere}
                AND ${vectorExpr} @@ ${tsQuery}
                ${subjectFilter}
                ${topicFilter}
              ORDER BY rank DESC, d."lastActivityAt" DESC
              LIMIT ${take}
              OFFSET ${skip}
            `);
        };

        try {
          return await runQuery('websearch_to_tsquery');
        } catch {
          return await runQuery('plainto_tsquery');
        }
      };

      const runFindMany = async () => {
        const rows = await prisma.discussion.findMany({
          where: {
            removedAt: null,
            ...(combinedSubjectIds.length > 0 ? { subjectId: { in: combinedSubjectIds } } : {}),
            ...(topicId && { topicId }),
          },
          orderBy: { lastActivityAt: 'desc' },
          take,
          skip,
          select: {
            id: true,
            title: true,
            content: true,
            subjectId: true,
            topicId: true,
            lastActivityAt: true,
            archivedAt: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarVariant: true,
              },
            },
          },
        });

        return rows.map((row) => ({
          id: row.id,
          title: row.title,
          content: row.content,
          subjectId: row.subjectId,
          topicId: row.topicId,
          lastActivityAt: row.lastActivityAt,
          archivedAt: row.archivedAt,
          createdAt: row.createdAt,
          authorId: row.user.id,
          authorFirstName: row.user.firstName,
          authorLastName: row.user.lastName,
          authorAvatarVariant: row.user.avatarVariant,
        }));
      };

      try {
        return query ? await runFullText() : await runFindMany();
      } catch (error) {
        if (!isDbSchemaMismatch(error)) throw error;

        // Safe rollout fallback: if prod DB/client is behind (missing archivedAt/avatarVariant, etc.),
        // return a narrower shape instead of a hard 500.
        const rows = await prisma.discussion.findMany({
          where: {
            removedAt: null,
            ...(combinedSubjectIds.length > 0 ? { subjectId: { in: combinedSubjectIds } } : {}),
            ...(topicId && { topicId }),
            ...(query
              ? {
                  OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { content: { contains: query, mode: 'insensitive' } },
                  ],
                }
              : {}),
          },
          orderBy: { lastActivityAt: 'desc' },
          take,
          skip,
          select: {
            id: true,
            title: true,
            content: true,
            subjectId: true,
            topicId: true,
            lastActivityAt: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        return rows.map((row) => ({
          id: row.id,
          title: row.title,
          content: row.content,
          subjectId: row.subjectId,
          topicId: row.topicId,
          lastActivityAt: row.lastActivityAt,
          archivedAt: null,
          createdAt: row.createdAt,
          authorId: row.user.id,
          authorFirstName: row.user.firstName,
          authorLastName: row.user.lastName,
          authorAvatarVariant: null,
        }));
      }
    })();

    const discussionIds = discussions.map((d) => d.id);
    const voteScores = await (async () => {
      if (!discussionIds.length) return [];
      try {
        return await prisma.discussionVote.groupBy({
          by: ['discussionId'],
          where: { discussionId: { in: discussionIds } },
          _sum: { value: true },
        });
      } catch (error) {
        if (isDbSchemaMismatch(error)) return [];
        throw error;
      }
    })();
    const scoreMap = Object.fromEntries(
      voteScores.map((v) => [v.discussionId, v._sum.value ?? 0])
    );

    const replyCounts = await (async () => {
      if (!discussionIds.length) return [];
      try {
        return await prisma.discussionReply.groupBy({
          by: ['discussionId'],
          where: { discussionId: { in: discussionIds } },
          _count: { _all: true },
        });
      } catch (error) {
        if (isDbSchemaMismatch(error)) return [];
        throw error;
      }
    })();
    const replyCountMap = Object.fromEntries(
      replyCounts.map((row) => [row.discussionId, row._count._all])
    );

    const replyVoteScoresByDiscussion = await (async () => {
      if (!discussionIds.length) return [];
      try {
        return await prisma.$queryRaw<Array<{ discussionId: string; score: number | bigint | null }>>(
          Prisma.sql`
            SELECT r."discussionId", COALESCE(SUM(v.value), 0) AS score
            FROM "DiscussionReply" r
            JOIN "ReplyVote" v ON v."replyId" = r.id
            WHERE r."discussionId" IN (${Prisma.join(discussionIds)})
            GROUP BY r."discussionId"
          `,
        );
      } catch (error) {
        if (isDbSchemaMismatch(error)) return [];
        throw error;
      }
    })();
    const replyTotalsByDiscussion = Object.fromEntries(
      replyVoteScoresByDiscussion.map((row) => [row.discussionId, Number(row.score ?? 0)])
    );

    const currentUserId = includeVotes ? sessionUserId : null;
    const currentUserVotes = await (async () => {
      if (!includeVotes || !currentUserId || !discussionIds.length) return [];
      try {
        return await prisma.discussionVote.findMany({
          where: { userId: currentUserId, discussionId: { in: discussionIds } },
          select: { discussionId: true, value: true },
        });
      } catch (error) {
        if (isDbSchemaMismatch(error)) return [];
        throw error;
      }
    })();
    const currentUserVoteMap = Object.fromEntries(
      currentUserVotes.map((v) => [v.discussionId, v.value])
    );

    const result = discussions.map((d) => ({
      id: d.id,
      title: d.title,
      contentPreview: d.content
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 180),
      subjectId: d.subjectId,
      topicId: d.topicId,
      lastActivityAt: d.lastActivityAt,
      createdAt: d.createdAt,
      archivedAt: d.archivedAt,
      authorId: d.authorId,
      authorAvatarVariant: d.authorAvatarVariant,
      authorName:
        [d.authorFirstName, d.authorLastName].filter(Boolean).join(' ') ||
        'Student',
      replyCount: replyCountMap[d.id] ?? 0,
      voteScore: scoreMap[d.id] ?? 0,
      replyVoteScore: replyTotalsByDiscussion[d.id] ?? 0,
      totalPopularity: (scoreMap[d.id] ?? 0) + (replyTotalsByDiscussion[d.id] ?? 0),
      userVote: includeVotes ? currentUserVoteMap[d.id] ?? null : null,
    }));

    const headers = getPrivateNoStoreHeaders();
    return NextResponse.json(result, { headers });
  } catch (error) {
    const classified = classifyDiscussionsListError(error);
    console.error('Error fetching discussions:', error);
    return NextResponse.json(
      { error: classified.message, code: classified.code },
      {
        status: classified.status,
        headers: {
          'x-oy-error-code': classified.code,
        },
      },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { prisma } = await import('@/src/db/client');
    const { getCurrentSession } = await import('@/src/modules/auth/utils/session');
    const { calcDiscussionCreateCost, roundCredits } = await import('@/src/modules/credits');
    const { CONTENT_LIMITS, RATE_LIMITS } = await import('@/src/config/constants');
    const { MAX_DISCUSSION_IMAGES } = await import('@/src/config/uploads');
    const { sanitizeDiscussionRichTextHtml, sanitizeInput } = await import('@/src/security/validation');
    const { richTextHtmlToPlainText } = await import('@/src/lib/rich-text');
    const { countDiscussionImages, discussionRichTextHasContent } = await import('@/src/lib/discussion-rich-text');
    const { buildRateLimitResponse, checkRateLimit, getRateLimitIdentifier } = await import('@/src/security/rateLimiter');
    const { requireVerifiedEmailForWrite } = await import('@/src/modules/auth/utils/write-access');

    const userId = await getCurrentSession();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const verified = await requireVerifiedEmailForWrite(userId);
    if (!verified.ok) {
      const message = 'error' in verified ? verified.error : 'Unauthorized';
      return NextResponse.json(
        { error: message, errorKey: verified.errorKey },
        { status: verified.status }
      );
    }

    const identifier = getRateLimitIdentifier(request, userId);
    const rateLimit = await checkRateLimit(
      `discussions:create:${identifier}`,
      RATE_LIMITS.WRITE
    );
    if (!rateLimit.allowed) {
      const { status, body, headers } = buildRateLimitResponse(rateLimit);
      return NextResponse.json(body, { status, headers });
    }

    let body: { title?: unknown; content?: unknown; subjectId?: unknown; topicId?: unknown } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }
    const { title, content, subjectId, topicId } = body;

    if (!title || typeof title !== 'string' || !content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'title and content are required' },
        { status: 400 }
      );
    }

    const safeContent = sanitizeDiscussionRichTextHtml(String(content));
    const plainText = richTextHtmlToPlainText(safeContent);
    if (!discussionRichTextHasContent(safeContent)) {
      return NextResponse.json(
        { error: 'content is required' },
        { status: 400 }
      );
    }
    if (countDiscussionImages(safeContent) > MAX_DISCUSSION_IMAGES) {
      return NextResponse.json({ error: 'Too many images', max: MAX_DISCUSSION_IMAGES }, { status: 400 });
    }
    if (plainText.length > CONTENT_LIMITS.DISCUSSION_CONTENT_MAX) {
      return NextResponse.json(
        { error: 'content is too long', max: CONTENT_LIMITS.DISCUSSION_CONTENT_MAX },
        { status: 400 }
      );
    }

    const cost = roundCredits(calcDiscussionCreateCost());
    const safeSubjectId = subjectId && String(subjectId).trim()
      ? String(subjectId).trim()
      : null;
    const safeTopicId = topicId && String(topicId).trim()
      ? String(topicId).trim()
      : null;

    const safeTitle = sanitizeInput(String(title)).slice(0, CONTENT_LIMITS.DISCUSSION_TITLE_MAX);
    if (!safeTitle) return NextResponse.json({ error: 'title is required' }, { status: 400 });
    const slugPattern = /^[a-z0-9-]{1,64}$/i;
    if ((safeSubjectId && !slugPattern.test(safeSubjectId)) || (safeTopicId && !slugPattern.test(safeTopicId))) {
      return NextResponse.json({ error: 'Invalid subject or topic' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const deducted = await tx.user.updateMany({
        where: { id: userId, credits: { gte: cost } },
        data: { credits: { decrement: cost } },
      });
      if (deducted.count !== 1) throw new Error('INSUFFICIENT_CREDITS');

      const discussion = await tx.discussion.create({
        data: {
          userId,
          title: safeTitle,
          content: safeContent,
          subjectId: safeSubjectId,
          topicId: safeTopicId,
        },
        select: {
          id: true,
          title: true,
          content: true,
          subjectId: true,
          topicId: true,
          createdAt: true,
        },
      });
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { credits: true } });
      await tx.creditTransaction.create({
        data: {
          userId,
          amount: -cost,
          balanceAfter: user.credits,
          type: 'DISCUSSION_CREATE',
          referenceId: discussion.id,
          metadata: { discussionId: discussion.id },
        },
      });
      return { discussion, balanceAfter: roundCredits(user.credits) };
    });

    return NextResponse.json({
      ...result.discussion,
      creditsSpent: cost,
      balanceAfter: result.balanceAfter,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_CREDITS') {
      return NextResponse.json(
        { error: 'Insufficient credits' },
        { status: 402 },
      );
    }
    console.error('Error creating discussion:', error);
    return NextResponse.json(
      {
        error: getPublicErrorMessage(error, 'Internal server error'),
        code: 'DISCUSSION_CREATE_FAILED',
      },
      { status: 500 }
    );
  }
}
