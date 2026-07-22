/**
 * Materials API
 *
 * GET: List published materials by topic (public)
 * POST: Create new material (Studio, requires auth)
 */

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const DEFAULT_TAKE = 60;

async function findPublishedMaterialsPublic(options: {
  prisma: any;
  subjectId: string;
  topicId: string;
  take?: number;
  skip?: number;
}): Promise<any[]> {
  const { prisma, subjectId, topicId, take, skip } = options;
  const orderBy = { publishedAt: 'desc' } as const;

  const selectCore = {
    id: true,
    title: true,
    materialType: true,
    publishedAt: true,
    user: {
      select: {
        firstName: true,
        lastName: true,
      },
    },
  } as const;

  const selectWithRatings = {
    ...selectCore,
    ratingAvg: true,
    ratingCount: true,
  } as const;

  const where = {
    subjectId,
    topicId,
    status: 'PUBLISHED' as const,
    deletedAt: null,
    removedAt: null,
  };

  return (await prisma.material.findMany({
    where,
    orderBy,
    ...(take ? { take } : {}),
    ...(skip ? { skip } : {}),
    select: selectWithRatings as any,
  })) as any[];
}

async function findPublishedMaterialsWithAccess(options: {
  prisma: any;
  subjectId: string;
  topicId: string;
  take?: number;
  skip?: number;
}): Promise<any[]> {
  const { prisma, subjectId, topicId, take, skip } = options;
  const orderBy = { publishedAt: 'desc' } as const;

  const selectCore = {
    id: true,
    userId: true,
    title: true,
    materialType: true,
    publishedAt: true,
    user: {
      select: {
        firstName: true,
        lastName: true,
      },
    },
  } as const;

  const selectWithRatings = {
    ...selectCore,
    difficulty: true,
    questionCount: true,
    ratingAvg: true,
    ratingCount: true,
  } as const;

  const selectWithCounts = {
    ...selectWithRatings,
    _count: {
      select: { accesses: true },
    },
  } as const;

  const where = {
    subjectId,
    topicId,
    status: 'PUBLISHED' as const,
    deletedAt: null,
    removedAt: null,
  };

  return (await prisma.material.findMany({
    where,
    orderBy,
    ...(take ? { take } : {}),
    ...(skip ? { skip } : {}),
    select: selectWithCounts as any,
  })) as any[];
}

export async function GET(request: Request) {
  try {
    const { prisma } = await import('@/src/db/client');
    const { RATE_LIMITS } = await import('@/src/config/constants');
    const { getPrivateNoStoreHeaders, getPublicCacheHeaders } = await import('@/src/lib/http-cache');
    const { buildRateLimitResponse, checkRateLimit, getRateLimitIdentifier } = await import('@/src/security/rateLimiter');
    const identifier = getRateLimitIdentifier(request);
    const rateLimit = await checkRateLimit(`materials:list:${identifier}`, RATE_LIMITS.GENERAL);
    if (!rateLimit.allowed) {
      const { status, body, headers } = buildRateLimitResponse(rateLimit);
      return NextResponse.json(body, { status, headers });
    }

    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subjectId');
    const topicId = searchParams.get('topicId');
    const takeRaw = searchParams.get('take');
    const skipRaw = searchParams.get('skip');
    const takeParam = takeRaw ? Number(takeRaw) : null;
    const skipParam = skipRaw ? Number(skipRaw) : null;
    const take =
      takeParam !== null && Number.isFinite(takeParam)
        ? Math.min(Math.max(takeParam, 1), 200)
        : DEFAULT_TAKE;
    const skip = skipParam !== null && Number.isFinite(skipParam) && skipParam > 0
      ? skipParam
      : undefined;
    const includeAccess =
      searchParams.get('includeAccess') === '1' ||
      searchParams.get('includeAccess') === 'true' ||
      searchParams.get('view') === 'catalog';

    if (!subjectId || !topicId) {
      return NextResponse.json(
        { error: 'subjectId and topicId are required' },
        { status: 400 }
      );
    }

    if (!includeAccess) {
      const materials = await findPublishedMaterialsPublic({ prisma, subjectId, topicId, take, skip });

      return NextResponse.json(
        materials.map((m) => ({
          id: m.id,
          title: m.title,
          materialType: m.materialType,
          publishedAt: m.publishedAt,
          ratingAvg: typeof m.ratingAvg === 'number' ? m.ratingAvg : 0,
          ratingCount: typeof m.ratingCount === 'number' ? m.ratingCount : 0,
          authorName: [m.user.firstName, m.user.lastName].filter(Boolean).join(' ') || 'Student',
        })),
        { headers: getPublicCacheHeaders() }
      );
    }

    const { getCurrentSession } = await import('@/src/modules/auth/utils/session');
    const { calcMaterialUnlockCost, getBalance, roundCredits } = await import('@/src/modules/credits');

    const materials = await findPublishedMaterialsWithAccess({ prisma, subjectId, topicId, take, skip });

    const userId = await getCurrentSession();
    const materialIds = materials.map((m) => m.id);
    const [unlockedForUser, balance] = await Promise.all([
      userId && materialIds.length > 0
        ? prisma.materialAccess.findMany({
            where: { userId, materialId: { in: materialIds } },
            select: { materialId: true },
          })
        : Promise.resolve([]),
      userId ? getBalance(userId) : Promise.resolve(0),
    ]);
    const unlockedIds = new Set(unlockedForUser.map((a) => a.materialId));

    const mappedMaterials = materials.map((m) => {
      const questionCount = m.materialType === 'PRACTICE_TEST'
        ? (typeof m.questionCount === 'number' ? m.questionCount : 0)
        : 0;
      // NOTE: List responses intentionally do not fetch full `content` (can be large and crash serverless functions).
      // Unlock cost is always computed server-side in `/api/materials/[materialId]/unlock`.
      const wordCount = 0;
      return {
        id: m.id,
        userId: m.userId,
        title: m.title,
        materialType: m.materialType,
        difficulty: m.difficulty ?? null,
        publishedAt: m.publishedAt,
        ratingAvg: typeof m.ratingAvg === 'number' ? m.ratingAvg : 0,
        ratingCount: typeof m.ratingCount === 'number' ? m.ratingCount : 0,
        user: m.user,
        _count: m._count ?? { accesses: 0 },
        estimatedCost: roundCredits(
          calcMaterialUnlockCost({
            materialType: m.materialType,
            questionCount,
            wordCount,
          })
        ),
      };
    });

    return NextResponse.json(
      {
        materials: mappedMaterials,
        unlockedIds: Array.from(unlockedIds),
        balance,
        userId,
      },
      { headers: getPrivateNoStoreHeaders() }
    );
  } catch (error) {
    console.error('Error fetching materials:', error);
    const message = error instanceof Error ? error.message : '';
    if (/DATABASE_URL is not set/i.test(message)) {
      return NextResponse.json(
        { error: 'Server misconfigured', code: 'DB_MISCONFIGURED' },
        { status: 500 }
      );
    }
    const code = error && typeof error === 'object' && 'code' in error ? String((error as any).code) : '';
    const looksLikeMissingMigration =
      code === 'P2021' ||
      code === 'P2022' ||
      code === 'P1012' ||
      code === '42P01' ||
      code === '42703' ||
      /column .* does not exist/i.test(message) ||
      /table .* does not exist/i.test(message);
    if (looksLikeMissingMigration) {
      return NextResponse.json(
        { error: 'Database schema out of date', code: 'DB_MIGRATION_REQUIRED' },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { prisma } = await import('@/src/db/client');
    const { getCurrentSession } = await import('@/src/modules/auth/utils/session');
    const { requireVerifiedEmailForWrite } = await import('@/src/modules/auth/utils/write-access');
    const { SUBJECTS, CONTENT_LIMITS, RATE_LIMITS } = await import('@/src/config/constants');
    const { CURRICULUM_TOPICS } = await import('@/src/config/curriculum');
    const { getPracticeTestQuestionCount } = await import('@/src/modules/materials/utils');
    const { buildRateLimitResponse, checkRateLimit, getRateLimitIdentifier } = await import('@/src/security/rateLimiter');
    const { sanitizeInput, sanitizePracticeTestContent, sanitizeRichTextHtml } = await import('@/src/security/validation');
    const { isDbSchemaMismatch } = await import('@/src/db/schema-mismatch');

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
      `materials:create:${identifier}`,
      RATE_LIMITS.WRITE
    );
    if (!rateLimit.allowed) {
      const { status, body, headers } = buildRateLimitResponse(rateLimit);
      return NextResponse.json(body, { status, headers });
    }

    const body = await request.json();
    const { subjectId, topicId, title, objectives, content, materialType } = body;

    if (!subjectId || !topicId || !title || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'subjectId, topicId, title, and content are required' },
        { status: 400 }
      );
    }

    const type = materialType === 'PRACTICE_TEST' ? 'PRACTICE_TEST' : 'TEXTUAL';
    const safeSubjectId = String(subjectId).trim();
    const safeTopicId = String(topicId).trim();
    const slugPattern = /^[a-z0-9-]{1,64}$/i;
    if (!slugPattern.test(safeSubjectId) || !slugPattern.test(safeTopicId)) {
      return NextResponse.json({ error: 'Invalid subject or topic' }, { status: 400 });
    }

    let dbSubject: { id: string } | null = null;
    let curriculumSchemaUnavailable = false;
    try {
      dbSubject = await prisma.subject.findFirst({
        where: { OR: [{ slug: safeSubjectId }, { slugAz: safeSubjectId }], deletedAt: null },
        select: { id: true },
      });
    } catch (error) {
      if (!isDbSchemaMismatch(error)) throw error;
      curriculumSchemaUnavailable = true;
      dbSubject = null;
    }
    if (dbSubject) {
      let dbTopic: { id: string } | null = null;
      try {
        dbTopic = await prisma.topic.findFirst({
          where: {
            subjectId: dbSubject.id,
            OR: [{ slug: safeTopicId }, { slugAz: safeTopicId }],
            deletedAt: null,
          },
          select: { id: true },
        });
      } catch (error) {
        if (!isDbSchemaMismatch(error)) throw error;
        dbTopic = null;
      }
      if (!dbTopic) {
        return NextResponse.json({ error: 'Invalid subject or topic' }, { status: 400 });
      }
    } else {
      if (!curriculumSchemaUnavailable) {
        const activeSubjectCount = await prisma.subject.count({ where: { deletedAt: null } });
        if (activeSubjectCount > 0) {
          return NextResponse.json({ error: 'Invalid subject or topic' }, { status: 400 });
        }
      }
      const subject = SUBJECTS.find((s) => s.id === safeSubjectId);
      const topics = subject
        ? CURRICULUM_TOPICS[subject.id as keyof typeof CURRICULUM_TOPICS]
        : null;
      const topic = topics?.find((t) => t.id === safeTopicId);
      if (!subject || !topic) {
        return NextResponse.json({ error: 'Invalid subject or topic' }, { status: 400 });
      }
    }

    let sanitizedContent: string;
    try {
      sanitizedContent =
        type === 'PRACTICE_TEST'
          ? sanitizePracticeTestContent(content)
          : sanitizeRichTextHtml(content);
    } catch {
      return NextResponse.json({ error: 'Invalid material content' }, { status: 400 });
    }
    sanitizedContent = sanitizedContent.slice(0, CONTENT_LIMITS.MATERIAL_CONTENT_MAX);
    const questionCount =
      type === 'PRACTICE_TEST' ? getPracticeTestQuestionCount(sanitizedContent) : 0;

    const material = await prisma.material.create({
      data: {
        userId,
        subjectId: safeSubjectId,
        topicId: safeTopicId,
        title: sanitizeInput(String(title)).slice(0, CONTENT_LIMITS.MATERIAL_TITLE_MAX),
        objectives: objectives != null ? sanitizeInput(String(objectives)).slice(0, 2000) : null,
        content: sanitizedContent,
        materialType: type,
        questionCount,
        status: 'DRAFT',
      },
      select: {
        id: true,
        subjectId: true,
        topicId: true,
        title: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json(material);
  } catch (error) {
    console.error('Error creating material:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: process.env.NODE_ENV === 'development' ? message : 'Internal server error' },
      { status: 500 }
    );
  }
}
