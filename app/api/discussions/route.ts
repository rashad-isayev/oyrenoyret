/**
 * Discussions API
 *
 * GET: List discussions (includes archived; archived are read-only)
 * POST: Create new discussion (requires auth)
 */

import { NextResponse } from 'next/server';
import { isDbSchemaMismatch } from '@/src/db/schema-mismatch';
import { getPublicErrorMessage } from '@/src/security/public-error';
import {
  MAX_DISCUSSION_CONTEXT_TAGS,
  MIN_DISCUSSION_CONTEXT_TAGS,
  normalizeDiscussionContextTagFilter,
  normalizeDiscussionContextTags,
} from '@/src/modules/discussions/discussion-context-tags';
import { getDiscussionMessageCount } from '@/src/modules/discussions/discussion-message-count';
import { JSON_BODY_LIMITS, readJsonBody } from '@/src/security/json-body';
// NOTE: Keep heavy dependencies inside handlers to avoid module-init crashes.

export const runtime = 'nodejs';

function classifyDiscussionsListError(error: unknown): { status: number; code: string; message: string } {
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

export async function GET(request: Request) {
  try {
    const { prisma } = await import('@/src/db/client');
    const { RATE_LIMITS } = await import('@/src/config/constants');
    const { getPrivateNoStoreHeaders } = await import('@/src/lib/http-cache');
    const { buildRateLimitResponse, checkRateLimit, getRateLimitIdentifier } = await import('@/src/security/rateLimiter');
    const { getCurrentSession } = await import('@/src/modules/auth/utils/session');
    const { requirePlatformContentAccess } = await import('@/src/modules/auth/utils/write-access');
    const { sanitizeInput } = await import('@/src/security/validation');
    const { Prisma } = await import('@prisma/client');

    const { searchParams } = new URL(request.url);
    const tagsParam = searchParams.get('tags');
    const queryRaw = searchParams.get('q');
    if ((queryRaw?.length ?? 0) > 200) {
      return NextResponse.json(
        { error: 'Search query is too long.' },
        { status: 400, headers: getPrivateNoStoreHeaders() },
      );
    }
    const takeParam = Number(searchParams.get('take') ?? 50);
    const skipParam = Number(searchParams.get('skip') ?? 0);
    const take = Number.isFinite(takeParam) ? Math.min(Math.max(takeParam, 1), 100) : 50;
    const skip =
      Number.isSafeInteger(skipParam) && skipParam > 0
        ? Math.min(skipParam, 10_000)
        : 0;

    const sessionUserId = await getCurrentSession();
    if (!sessionUserId) {
      return NextResponse.json(
        { error: 'Unauthorized', errorKey: 'unauthorized' },
        { status: 401, headers: getPrivateNoStoreHeaders() },
      );
    }
    const contentAccess = await requirePlatformContentAccess(sessionUserId);
    if (!contentAccess.ok) {
      return NextResponse.json(
        {
          error: 'error' in contentAccess ? contentAccess.error : 'Unauthorized',
          errorKey: contentAccess.errorKey,
        },
        { status: contentAccess.status, headers: getPrivateNoStoreHeaders() },
      );
    }
    const identifier = getRateLimitIdentifier(request, sessionUserId);
    const rateLimit = await checkRateLimit(`discussions:list:${identifier}`, RATE_LIMITS.GENERAL);
    if (!rateLimit.allowed) {
      const { status, body, headers } = buildRateLimitResponse(rateLimit);
      return NextResponse.json(body, { status, headers });
    }

    const query = sanitizeInput(queryRaw ?? '').trim();
    const contextTags = normalizeDiscussionContextTagFilter(
      tagsParam?.split(',') ?? [],
    );

    type DiscussionBase = {
      id: string;
      title: string;
      content: string;
      tags: string[];
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
        const contextTagFilter =
          contextTags.length > 0
            ? Prisma.sql` AND d."tags" && ARRAY[${Prisma.join(contextTags)}]::TEXT[]`
            : Prisma.empty;

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
                d.tags,
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
                ${contextTagFilter}
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
            ...(contextTags.length > 0 ? { tags: { hasSome: contextTags } } : {}),
          },
          orderBy: { lastActivityAt: 'desc' },
          take,
          skip,
          select: {
            id: true,
            title: true,
            content: true,
            tags: true,
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
          tags: row.tags,
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
        if (contextTags.length > 0) return [];

        const rows = await prisma.discussion.findMany({
          where: {
            removedAt: null,
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
          tags: [],
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
    const replyCounts = await (async () => {
      if (!discussionIds.length) return [];
      try {
        return await prisma.discussionReply.groupBy({
          by: ['discussionId'],
          where: {
            discussionId: { in: discussionIds },
          },
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

    const result = discussions.map((d) => {
      const replyCount = replyCountMap[d.id] ?? 0;
      return {
        id: d.id,
        title: d.title,
        contentPreview: d.content
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 180),
        tags: d.tags,
        lastActivityAt: d.lastActivityAt,
        createdAt: d.createdAt,
        archivedAt: d.archivedAt,
        authorId: d.authorId,
        authorAvatarVariant: d.authorAvatarVariant,
        authorName:
          [d.authorFirstName, d.authorLastName].filter(Boolean).join(' ') ||
          'Student',
        replyCount,
        messageCount: getDiscussionMessageCount(replyCount),
      };
    });

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

    const bodyResult = await readJsonBody<{
      title?: unknown;
      content?: unknown;
      tags?: unknown;
    }>(request, JSON_BODY_LIMITS.RICH_TEXT);
    if (!bodyResult.ok) {
      return NextResponse.json(
        { error: bodyResult.error },
        { status: bodyResult.status },
      );
    }
    const body = bodyResult.value;
    const { title, content, tags } = body;

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

    const safeTags = normalizeDiscussionContextTags(tags);

    if (safeTags.length < MIN_DISCUSSION_CONTEXT_TAGS) {
      return NextResponse.json(
        { error: 'At least one context tag is required' },
        { status: 400 },
      );
    }
    if (
      !Array.isArray(tags) ||
      tags.length > MAX_DISCUSSION_CONTEXT_TAGS ||
      safeTags.length !== new Set(tags.map((tag) => String(tag).trim().toLowerCase())).size
    ) {
      return NextResponse.json(
        { error: 'Invalid context tags', max: MAX_DISCUSSION_CONTEXT_TAGS },
        { status: 400 },
      );
    }

    const safeTitle = sanitizeInput(String(title));
    if (!safeTitle) return NextResponse.json({ error: 'title is required' }, { status: 400 });
    if (safeTitle.length > CONTENT_LIMITS.DISCUSSION_TITLE_MAX) {
      return NextResponse.json(
        {
          error: 'title is too long',
          max: CONTENT_LIMITS.DISCUSSION_TITLE_MAX,
        },
        { status: 400 },
      );
    }
    const discussion = await prisma.discussion.create({
      data: {
        userId,
        title: safeTitle,
        content: safeContent,
        tags: safeTags,
      },
      select: {
        id: true,
        title: true,
        content: true,
        tags: true,
        createdAt: true,
      },
    });

    return NextResponse.json(discussion);
  } catch (error) {
    if (isDbSchemaMismatch(error)) {
      return NextResponse.json(
        {
          error: 'Discussion publishing is temporarily unavailable because the database schema is out of date.',
          code: 'DB_SCHEMA_MISMATCH',
        },
        {
          status: 503,
          headers: {
            'x-oy-error-code': 'DB_SCHEMA_MISMATCH',
          },
        },
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
