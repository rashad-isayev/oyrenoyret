/**
 * Verify Email API
 *
 * Verifies a user's email address using a token from email.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/src/db/client';
import { RATE_LIMITS } from '@/src/config/constants';
import { getPrivateNoStoreHeaders } from '@/src/lib/http-cache';
import { hashEmailVerificationToken, isEmailVerificationToken } from '@/src/modules/auth/utils/email-verification';
import { buildRateLimitResponse, checkRateLimit, getRateLimitIdentifier } from '@/src/security/rateLimiter';

export async function POST(request: Request) {
  try {
    const identifier = getRateLimitIdentifier(request);
    const rateLimit = await checkRateLimit(`auth:verify-email:${identifier}`, RATE_LIMITS.AUTH_EMAIL_VERIFICATION);
    if (!rateLimit.allowed) {
      const { status, body, headers } = buildRateLimitResponse(rateLimit);
      return NextResponse.json(body, { status, headers: { ...headers, ...getPrivateNoStoreHeaders() } });
    }

    const body = (await request.json().catch(() => ({}))) as { token?: unknown };
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    if (!isEmailVerificationToken(token)) {
      return NextResponse.json(
        { success: false, errorKey: 'verifyEmailTokenInvalid' },
        { status: 400, headers: getPrivateNoStoreHeaders() }
      );
    }

    const tokenHash = hashEmailVerificationToken(token);
    const record = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, email: true, expiresAt: true, usedAt: true },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, errorKey: 'verifyEmailTokenInvalid' },
        { status: 400, headers: getPrivateNoStoreHeaders() }
      );
    }

    if (record.usedAt || record.expiresAt < new Date()) {
      const user = await prisma.user.findFirst({
        where: { id: record.userId, deletedAt: null },
        select: { id: true, email: true, emailVerifiedAt: true },
      });
      const isAlreadyVerified =
        user != null &&
        user.email.toLowerCase() === record.email.toLowerCase() &&
        Boolean(user.emailVerifiedAt);

      if (isAlreadyVerified) {
        return NextResponse.json(
          { success: true, alreadyVerified: true },
          { headers: getPrivateNoStoreHeaders() },
        );
      }

      return NextResponse.json(
        { success: false, errorKey: 'verifyEmailTokenInvalid' },
        { status: 400, headers: getPrivateNoStoreHeaders() }
      );
    }

    const user = await prisma.user.findFirst({
      where: { id: record.userId, deletedAt: null },
      select: { id: true, email: true },
    });
    if (!user || user.email.toLowerCase() !== record.email.toLowerCase()) {
      return NextResponse.json(
        { success: false, errorKey: 'verifyEmailTokenInvalid' },
        { status: 400, headers: getPrivateNoStoreHeaders() }
      );
    }

    await prisma.$transaction(async (tx) => {
      const claimed = await tx.emailVerificationToken.updateMany({
        where: {
          id: record.id,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1) throw new Error('EMAIL_TOKEN_ALREADY_USED');

      const updated = await tx.user.updateMany({
        where: { id: record.userId, deletedAt: null },
        data: { emailVerifiedAt: new Date() },
      });
      if (updated.count !== 1) throw new Error('EMAIL_TOKEN_ALREADY_USED');
    });

    return NextResponse.json({ success: true }, { headers: getPrivateNoStoreHeaders() });
  } catch (error) {
    if (error instanceof Error && error.message === 'EMAIL_TOKEN_ALREADY_USED') {
      return NextResponse.json(
        { success: false, errorKey: 'verifyEmailTokenInvalid' },
        { status: 400, headers: getPrivateNoStoreHeaders() },
      );
    }
    console.error('Error verifying email:', error);
    return NextResponse.json({ success: false, errorKey: 'verifyEmailFailed' }, { status: 500, headers: getPrivateNoStoreHeaders() });
  }
}
