/**
 * Contact Messages API
 *
 * POST: Create a contact message (public)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/src/db/client';
import { getCurrentSession } from '@/src/modules/auth/utils/session';
import { sanitizeInput } from '@/src/security/validation';
import { RATE_LIMITS } from '@/src/config/constants';
import {
  buildRateLimitResponse,
  checkRateLimit,
  getRateLimitIdentifier,
  getTrustedClientIpFromHeaders,
} from '@/src/security/rateLimiter';
import { contactMessageSchema } from '@/src/modules/contact/schemas/contact-message';
import { JSON_BODY_LIMITS, readJsonBody } from '@/src/security/json-body';

export async function POST(request: Request) {
  try {
    const userId = await getCurrentSession();
    const identifier = getRateLimitIdentifier(request, userId);
    const rateLimit = await checkRateLimit(
      `contact:message:create:${identifier}`,
      RATE_LIMITS.CONTACT_MESSAGE,
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
    const parsed = contactMessageSchema.safeParse(bodyResult.value);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const name = sanitizeInput(parsed.data.name);
    const email = sanitizeInput(parsed.data.email);
    const subject = sanitizeInput(parsed.data.subject);
    const message = sanitizeInput(parsed.data.message);

    const ipAddress = getTrustedClientIpFromHeaders(request.headers);
    const userAgent = request.headers.get('user-agent')?.slice(0, 512) ?? null;

    await prisma.contactMessage.create({
      data: {
        userId: userId ?? null,
        name,
        email,
        subject,
        message,
        ipAddress,
        userAgent,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error creating contact message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
