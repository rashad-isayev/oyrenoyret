import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/src/modules/auth/utils/session';
import { prisma } from '@/src/db/client';
import { GUIDELINES_VERSION, RATE_LIMITS } from '@/src/config/constants';
import {
  buildRateLimitResponse,
  checkRateLimit,
  getRateLimitIdentifier,
} from '@/src/security/rateLimiter';
import { JSON_BODY_LIMITS, readJsonBody } from '@/src/security/json-body';

const progressSchema = z.object({
  step: z.number().int().min(0).max(3),
});

export async function POST(request: Request) {
  try {
    const userId = await getCurrentSession();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const identifier = getRateLimitIdentifier(request, userId);
    const rateLimit = await checkRateLimit(
      `onboarding:progress:${identifier}`,
      RATE_LIMITS.WRITE,
    );
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
    const parsed = progressSchema.safeParse(bodyResult.value);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid progress' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        status: 'ACTIVE',
        role: 'STUDENT',
        emailVerifiedAt: { not: null },
        guidelinesAcceptedAt: { not: null },
        guidelinesVersion: GUIDELINES_VERSION,
        tutorialCompletedAt: null,
        tutorialSkippedAt: null,
      },
      select: { tutorialStep: true },
    });
    if (!user) {
      return NextResponse.json(
        { error: 'Account setup is incomplete' },
        { status: 403 },
      );
    }
    if (user.tutorialStep < parsed.data.step) {
      await prisma.user.updateMany({
        where: {
          id: userId,
          tutorialStep: { lt: parsed.data.step },
          tutorialCompletedAt: null,
          tutorialSkippedAt: null,
        },
        data: { tutorialStep: parsed.data.step },
      });
    }

    return NextResponse.json({ success: true, step: parsed.data.step });
  } catch (error) {
    console.error('Failed to save onboarding progress:', error);
    return NextResponse.json(
      { error: 'Failed to save onboarding progress' },
      { status: 500 },
    );
  }
}
