/**
 * Onboarding Complete API
 *
 * Marks the current user's tutorial as completed.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/src/modules/auth/utils/session';
import { prisma } from '@/src/db/client';
import { GUIDELINES_VERSION, RATE_LIMITS } from '@/src/config/constants';
import { buildRateLimitResponse, checkRateLimit, getRateLimitIdentifier } from '@/src/security/rateLimiter';
import { JSON_BODY_LIMITS, readJsonBody } from '@/src/security/json-body';

const completionSchema = z.object({
  action: z.enum(['complete', 'skip']),
});

export async function POST(request: Request) {
  try {
    const userId = await getCurrentSession();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const identifier = getRateLimitIdentifier(request, userId);
    const rateLimit = await checkRateLimit(`onboarding:complete:${identifier}`, RATE_LIMITS.WRITE);
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
    const parsed = completionSchema.safeParse(bodyResult.value);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    const { action } = parsed.data;
    const now = new Date();

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        status: 'ACTIVE',
        role: 'STUDENT',
        emailVerifiedAt: { not: null },
        guidelinesAcceptedAt: { not: null },
        guidelinesVersion: GUIDELINES_VERSION,
      },
      select: { tutorialCompletedAt: true, tutorialSkippedAt: true },
    });
    if (!user) {
      return NextResponse.json(
        { error: 'Account setup is incomplete' },
        { status: 403 },
      );
    }
    if (user.tutorialCompletedAt || user.tutorialSkippedAt) {
      return NextResponse.json({ success: true, action });
    }

    await prisma.user.updateMany({
      where: {
        id: userId,
        tutorialCompletedAt: null,
        tutorialSkippedAt: null,
      },
      data:
        action === 'skip'
          ? {
              tutorialSkippedAt: now,
              registrationStep: 5,
            }
          : {
              tutorialCompletedAt: now,
              tutorialSkippedAt: null,
              tutorialStep: 4,
              registrationStep: 5,
            },
    });

    return NextResponse.json({ success: true, action });
  } catch (error) {
    console.error('Failed to complete onboarding tutorial:', error);
    return NextResponse.json({ error: 'Failed to complete tutorial' }, { status: 500 });
  }
}
