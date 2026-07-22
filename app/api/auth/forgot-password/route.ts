/**
 * Forgot Password API
 *
 * Accepts an email address and (if an account exists) sends a password reset link.
 * Always returns success to avoid leaking account existence.
 */

import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/src/db/client';
import { RATE_LIMITS } from '@/src/config/constants';
import { buildRateLimitResponse, checkRateLimit, getRateLimitIdentifier } from '@/src/security/rateLimiter';
import { getPrivateNoStoreHeaders } from '@/src/lib/http-cache';
import { sendPasswordResetEmail } from '@/src/modules/auth/services/email';
import { getTrustedAppOrigin } from '@/src/security/request-origin';

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

function createResetToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('base64url');
  return { token, tokenHash };
}

export async function POST(request: Request) {
  const identifier = getRateLimitIdentifier(request);
  const rateLimit = await checkRateLimit(`auth:forgot-password:${identifier}`, RATE_LIMITS.AUTH_PASSWORD_RESET);
  if (!rateLimit.allowed) {
    const { status, body, headers } = buildRateLimitResponse(rateLimit);
    return NextResponse.json(body, { status, headers });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { email?: unknown };
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email || email.length > 254 || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ success: true }, { headers: getPrivateNoStoreHeaders() });
    }

    const user = await prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: { id: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ success: true }, { headers: getPrivateNoStoreHeaders() });
    }

    const { token, tokenHash } = createResetToken();
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

    await prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          usedAt: null,
        },
        data: {
          usedAt: new Date(),
        },
      });

      await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });
    });

    const origin = getTrustedAppOrigin(request);
    const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(token)}`;
    await sendPasswordResetEmail(user.email, resetUrl);

    return NextResponse.json({ success: true }, { headers: getPrivateNoStoreHeaders() });
  } catch (error) {
    console.error('Error sending password reset email:', error);
    // In production, still return success to prevent account enumeration.
    return NextResponse.json({ success: true }, { headers: getPrivateNoStoreHeaders() });
  }
}
