import { NextResponse } from 'next/server';
import { prisma } from '@/src/db/client';
import { getCurrentSession } from '@/src/modules/auth/utils/session';
import { isAdmin } from '@/src/lib/permissions';
import { getPrivateNoStoreHeaders } from '@/src/lib/http-cache';
import { isDbSchemaMismatch } from '@/src/db/schema-mismatch';
import { z } from 'zod';
import { RATE_LIMITS } from '@/src/config/constants';
import { buildRateLimitResponse, checkRateLimit, getRateLimitIdentifier } from '@/src/security/rateLimiter';
import { requireVerifiedEmailForWrite } from '@/src/modules/auth/utils/write-access';
import { JSON_BODY_LIMITS, readJsonBody } from '@/src/security/json-body';

type RemoveTargetType = 'DISCUSSION' | 'DISCUSSION_REPLY';

function safeReason(input: unknown): string | null {
  const text = typeof input === 'string' ? input.trim() : '';
  if (!text) return null;
  return text.slice(0, 2000);
}

const removeSchema = z.object({
  targetType: z.enum(['DISCUSSION', 'DISCUSSION_REPLY']),
  targetId: z.string().min(1).max(128),
  reason: z.string().trim().min(1).max(2000),
});

export async function POST(request: Request) {
  try {
    const adminId = await getCurrentSession();
    if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const verified = await requireVerifiedEmailForWrite(adminId);
    if (!verified.ok) {
      return NextResponse.json(
        { error: 'error' in verified ? verified.error : 'Unauthorized', errorKey: verified.errorKey },
        { status: verified.status },
      );
    }

    const admin = await prisma.user.findUnique({ where: { id: adminId }, select: { role: true } });
    if (!admin?.role || !isAdmin(admin.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const identifier = getRateLimitIdentifier(request, adminId);
    const rateLimit = await checkRateLimit(`admin:moderation:remove:${identifier}`, RATE_LIMITS.ADMIN_WRITE);
    if (!rateLimit.allowed) {
      const { status, body, headers } = buildRateLimitResponse(rateLimit);
      return NextResponse.json(body, { status, headers });
    }

    const bodyResult = await readJsonBody(request, JSON_BODY_LIMITS.SMALL);
    if (!bodyResult.ok) {
      return NextResponse.json(
        { error: bodyResult.error },
        { status: bodyResult.status },
      );
    }
    const parsed = removeSchema.safeParse(bodyResult.value);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const targetType = parsed.data.targetType as RemoveTargetType;
    const targetId = parsed.data.targetId;
    const reason = safeReason(parsed.data.reason);
    if (!reason) {
      return NextResponse.json({ error: 'Reason is required.' }, { status: 400 });
    }

    const now = new Date();

    if (targetType === 'DISCUSSION') {
    const discussion = await prisma.discussion.findUnique({
      where: { id: targetId },
      select: { id: true, userId: true, removedAt: true },
    });
    if (!discussion) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (discussion.removedAt) {
      return NextResponse.json({ error: 'This item was already removed.' }, { status: 409 });
    }

    const [updated] = await prisma.$transaction([
      prisma.discussion.update({
        where: { id: targetId },
        data: { removedAt: now, removedById: adminId, removedReason: reason },
        select: { id: true, removedAt: true },
      }),
      prisma.moderationAction.create({
        data: {
          actorId: adminId,
          targetUserId: discussion.userId,
          targetType: 'DISCUSSION',
          targetId,
          actionType: 'REMOVE_CONTENT',
          reason,
        },
        select: { id: true },
      }),
    ]);

      return NextResponse.json(updated, { headers: getPrivateNoStoreHeaders() });
    }

  // DISCUSSION_REPLY
  const reply = await prisma.discussionReply.findUnique({
    where: { id: targetId },
    select: { id: true, userId: true, discussionId: true, removedAt: true },
  });
  if (!reply) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (reply.removedAt) {
    return NextResponse.json({ error: 'This item was already removed.' }, { status: 409 });
  }

  const [updated] = await prisma.$transaction([
    prisma.discussionReply.update({
      where: { id: targetId },
      data: { removedAt: now, removedById: adminId, removedReason: reason },
      select: { id: true, removedAt: true },
    }),
    prisma.discussion.update({
      where: { id: reply.discussionId },
      data: { lastActivityAt: now },
      select: { id: true },
    }),
    prisma.moderationAction.create({
      data: {
        actorId: adminId,
        targetUserId: reply.userId,
        targetType: 'DISCUSSION_REPLY',
        targetId,
        actionType: 'REMOVE_CONTENT',
        reason,
      },
      select: { id: true },
    }),
  ]);

    return NextResponse.json(updated, { headers: getPrivateNoStoreHeaders() });
  } catch (error) {
    if (isDbSchemaMismatch(error)) {
      return NextResponse.json(
        { error: 'Content removal is temporarily unavailable. Apply database migrations first.' },
        { status: 503 },
      );
    }
    console.error('Remove content error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
