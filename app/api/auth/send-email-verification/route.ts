/**
 * Send Email Verification API
 *
 * Sends a verification link to the currently authenticated user's email.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/src/db/client';
import { getCurrentSession } from '@/src/modules/auth/utils/session';
import { RATE_LIMITS } from '@/src/config/constants';
import { buildRateLimitResponse, checkRateLimit, getRateLimitIdentifier } from '@/src/security/rateLimiter';
import { getPrivateNoStoreHeaders } from '@/src/lib/http-cache';
import {
  hashEmailVerificationToken,
  isEmailVerificationToken,
  issueEmailVerificationToken,
} from '@/src/modules/auth/utils/email-verification';
import { sendAccountVerificationEmail } from '@/src/modules/auth/services/email';
import { getPublicErrorMessage } from '@/src/security/public-error';
import { getTrustedAppOrigin } from '@/src/security/request-origin';
import { JSON_BODY_LIMITS, readJsonBody } from '@/src/security/json-body';

export async function POST(request: Request) {
  try {
    const bodyResult = await readJsonBody<{ token?: unknown }>(
      request,
      JSON_BODY_LIMITS.SMALL,
      { allowEmpty: true },
    );
    if (!bodyResult.ok) {
      return NextResponse.json(
        { success: false, error: bodyResult.error },
        { status: bodyResult.status, headers: getPrivateNoStoreHeaders() },
      );
    }
    const body = bodyResult.value;
    const providedToken = typeof body.token === 'string' ? body.token.trim() : '';
    const sessionUserId = await getCurrentSession();

    let userId = sessionUserId;
    if (!userId && providedToken) {
      if (!isEmailVerificationToken(providedToken)) {
        return NextResponse.json(
          { success: false, errorKey: 'verifyEmailTokenInvalid' },
          { status: 400, headers: getPrivateNoStoreHeaders() },
        );
      }
      const tokenHash = hashEmailVerificationToken(providedToken);
      const record = await prisma.emailVerificationToken.findUnique({
        where: { tokenHash },
        select: { userId: true, email: true, expiresAt: true, usedAt: true },
      });
      if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
        return NextResponse.json(
          { success: false, errorKey: 'verifyEmailTokenInvalid' },
          { status: 400, headers: getPrivateNoStoreHeaders() },
        );
      }
      userId = record.userId;
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, errorKey: 'unauthorized' },
        { status: 401, headers: getPrivateNoStoreHeaders() },
      );
    }

    const identifier = getRateLimitIdentifier(request, userId);
    const rateLimit = await checkRateLimit(`auth:send-email-verification:${identifier}`, RATE_LIMITS.AUTH_EMAIL_VERIFICATION);
    if (!rateLimit.allowed) {
      const { status, body, headers } = buildRateLimitResponse(rateLimit);
      return NextResponse.json(body, { status, headers });
    }

    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, email: true, emailVerifiedAt: true },
    });
    if (!user) {
      return NextResponse.json(
        { success: false, errorKey: 'unauthorized' },
        { status: 401, headers: getPrivateNoStoreHeaders() },
      );
    }
    if (!sessionUserId && providedToken) {
      const tokenHash = hashEmailVerificationToken(providedToken);
      const record = await prisma.emailVerificationToken.findUnique({
        where: { tokenHash },
        select: { email: true, expiresAt: true, usedAt: true },
      });
      if (
        !record ||
        record.usedAt ||
        record.expiresAt.getTime() <= Date.now() ||
        record.email.toLowerCase() !== user.email.toLowerCase()
      ) {
        return NextResponse.json(
          { success: false, errorKey: 'verifyEmailTokenInvalid' },
          { status: 400, headers: getPrivateNoStoreHeaders() },
        );
      }
    }
    if (user.emailVerifiedAt) {
      return NextResponse.json({ success: true, alreadyVerified: true }, { headers: getPrivateNoStoreHeaders() });
    }

    const { token: verificationToken } = await issueEmailVerificationToken(userId);
    const origin = getTrustedAppOrigin(request);
    const verifyUrl = `${origin}/verify-email?token=${encodeURIComponent(verificationToken)}`;

    await sendAccountVerificationEmail(user.email, verifyUrl);
    return NextResponse.json({ success: true }, { headers: getPrivateNoStoreHeaders() });
  } catch (error) {
    console.error('Error sending email verification:', error);
    return NextResponse.json(
      { success: false, error: getPublicErrorMessage(error, 'Failed to send verification email') },
      { status: 500, headers: getPrivateNoStoreHeaders() }
    );
  }
}
