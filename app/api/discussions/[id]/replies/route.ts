/**
 * Discussion messages API - POST a message to the chronological room timeline
 */

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/src/db/client';
import { getCurrentSession } from '@/src/modules/auth/utils/session';
import { CONTENT_LIMITS, RATE_LIMITS } from '@/src/config/constants';
import { MAX_DISCUSSION_IMAGES } from '@/src/config/uploads';
import { sanitizeDiscussionRichTextHtml } from '@/src/security/validation';
import { richTextHtmlToPlainText } from '@/src/lib/rich-text';
import { countDiscussionImages, discussionRichTextHasContent } from '@/src/lib/discussion-rich-text';
import { buildRateLimitResponse, checkRateLimit, getRateLimitIdentifier } from '@/src/security/rateLimiter';
import { requireVerifiedEmailForWrite } from '@/src/modules/auth/utils/write-access';
import { isDbSchemaMismatch } from '@/src/db/schema-mismatch';
import {
  DISCUSSION_SLOWMODE_SECONDS,
  getDiscussionSlowmodeRetrySeconds,
} from '@/src/config/discussions';
import { JSON_BODY_LIMITS, readJsonBody } from '@/src/security/json-body';

export const runtime = 'nodejs';

const MESSAGE_TRANSACTION_ATTEMPTS = 3;

class DiscussionUnavailableError extends Error {}

class DiscussionSlowmodeError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super('Discussion slowmode is active');
  }
}

async function createDiscussionMessage({
  discussionId,
  userId,
  content,
}: {
  discussionId: string;
  userId: string;
  content: string;
}) {
  for (
    let attempt = 0;
    attempt < MESSAGE_TRANSACTION_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const discussion = await tx.discussion.findFirst({
            where: {
              id: discussionId,
              archivedAt: null,
              removedAt: null,
            },
            select: { id: true },
          });

          if (!discussion) {
            throw new DiscussionUnavailableError();
          }

          const participantState =
            await tx.discussionParticipantState.findUnique({
              where: {
                discussionId_userId: { discussionId, userId },
              },
              select: { lastSentAt: true },
            });
          const retryAfterSeconds =
            getDiscussionSlowmodeRetrySeconds(
              participantState?.lastSentAt,
            );
          if (retryAfterSeconds > 0) {
            throw new DiscussionSlowmodeError(retryAfterSeconds);
          }

          const reply = await tx.discussionReply.create({
            data: {
              discussionId,
              userId,
              content,
            },
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          });

          await tx.discussion.update({
            where: { id: discussionId },
            data: { lastActivityAt: reply.createdAt },
          });

          await tx.discussionParticipantState.upsert({
            where: {
              discussionId_userId: { discussionId, userId },
            },
            create: {
              discussionId,
              userId,
              lastReadReplyId: reply.id,
              lastReadAt: reply.createdAt,
              lastSentAt: reply.createdAt,
            },
            update: {
              lastReadReplyId: reply.id,
              lastReadAt: reply.createdAt,
              lastSentAt: reply.createdAt,
            },
          });

          return reply;
        },
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034' &&
        attempt < MESSAGE_TRANSACTION_ATTEMPTS - 1
      ) {
        continue;
      }
      throw error;
    }
  }

  throw new Error('DISCUSSION_MESSAGE_TRANSACTION_FAILED');
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
      `discussions:reply:${identifier}`,
      RATE_LIMITS.WRITE
    );
    if (!rateLimit.allowed) {
      const { status, body, headers } = buildRateLimitResponse(rateLimit);
      return NextResponse.json(body, { status, headers });
    }

    const { id: discussionId } = await params;
    const bodyResult = await readJsonBody<{ content?: unknown }>(
      request,
      JSON_BODY_LIMITS.RICH_TEXT,
    );
    if (!bodyResult.ok) {
      return NextResponse.json(
        { error: bodyResult.error },
        { status: bodyResult.status },
      );
    }
    const body = bodyResult.value;
    const { content } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'content is required' },
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
    if (plainText.length > CONTENT_LIMITS.REPLY_CONTENT_MAX) {
      return NextResponse.json(
        { error: 'content is too long', max: CONTENT_LIMITS.REPLY_CONTENT_MAX },
        { status: 400 }
      );
    }

    const reply = await createDiscussionMessage({
      discussionId,
      userId,
      content: safeContent,
    });

    return NextResponse.json({
      id: reply.id,
      content: reply.content,
      createdAt: reply.createdAt,
      authorId: reply.user.id,
      authorName:
        [reply.user.firstName, reply.user.lastName].filter(Boolean).join(' ') ||
        'Student',
      slowmodeRetryAfterSeconds: DISCUSSION_SLOWMODE_SECONDS,
    });
  } catch (error) {
    if (error instanceof DiscussionUnavailableError) {
      return NextResponse.json(
        { error: 'Discussion not found or archived' },
        { status: 404 },
      );
    }
    if (error instanceof DiscussionSlowmodeError) {
      return NextResponse.json(
        {
          error: 'Slowmode is active',
          code: 'DISCUSSION_SLOWMODE',
          retryAfterSeconds: error.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(error.retryAfterSeconds),
          },
        },
      );
    }
    console.error('Error creating reply:', error);
    if (isDbSchemaMismatch(error)) {
      return NextResponse.json(
        {
          error:
            'Messaging is temporarily unavailable because the database schema is out of date.',
          code: 'DB_SCHEMA_MISMATCH',
        },
        {
          status: 503,
          headers: { 'x-oy-error-code': 'DB_SCHEMA_MISMATCH' },
        },
      );
    }
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'DISCUSSION_MESSAGE_CREATE_FAILED',
      },
      { status: 500 }
    );
  }
}
