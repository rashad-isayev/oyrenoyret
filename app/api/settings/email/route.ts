/**
 * Settings: Email API
 *
 * Changes the current user's email and sends a verification email to the new address.
 */

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/src/db/client';
import { getPrivateNoStoreHeaders } from '@/src/lib/http-cache';
import { RATE_LIMITS } from '@/src/config/constants';
import { getCurrentSession } from '@/src/modules/auth/utils/session';
import { buildRateLimitResponse, checkRateLimit, getRateLimitIdentifier } from '@/src/security/rateLimiter';
import { verifyPassword } from '@/src/modules/auth/utils/password';
import { issueEmailVerificationToken } from '@/src/modules/auth/utils/email-verification';
import { sendAccountVerificationEmail } from '@/src/modules/auth/services/email';
import { getPublicErrorMessage } from '@/src/security/public-error';
import { getTrustedAppOrigin } from '@/src/security/request-origin';
import { requireAccountReadyForWrite } from '@/src/modules/auth/utils/write-access';
import { JSON_BODY_LIMITS, readJsonBody } from '@/src/security/json-body';

const schema = z.object({
  email: z.string().email().max(254).toLowerCase().trim(),
  currentPassword: z.string().min(1).max(72),
});

export async function POST(request: Request) {
  try {
    const userId = await getCurrentSession();
    if (!userId) {
      return NextResponse.json({ success: false, errorKey: 'unauthorized' }, { status: 401 });
    }

    const writeAccess = await requireAccountReadyForWrite(userId);
    if (!writeAccess.ok) {
      return NextResponse.json(
        { success: false, errorKey: writeAccess.errorKey },
        {
          status: writeAccess.status,
          headers: getPrivateNoStoreHeaders(),
        },
      );
    }

    const identifier = getRateLimitIdentifier(request, userId);
    const rateLimit = await checkRateLimit(`settings:email:${identifier}`, RATE_LIMITS.WRITE);
    if (!rateLimit.allowed) {
      const { status, body, headers } = buildRateLimitResponse(rateLimit);
      return NextResponse.json(body, { status, headers });
    }

    const bodyResult = await readJsonBody(request, JSON_BODY_LIMITS.SMALL);
    if (!bodyResult.ok) {
      return NextResponse.json(
        { success: false, error: bodyResult.error },
        { status: bodyResult.status, headers: getPrivateNoStoreHeaders() },
      );
    }
    const parsed = schema.safeParse(bodyResult.value);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid email payload' },
        { status: 400, headers: getPrivateNoStoreHeaders() },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        parentEmail: true,
        passwordHash: true,
      },
    });
    if (!user) {
      return NextResponse.json({ success: false, errorKey: 'unauthorized' }, { status: 401 });
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        { success: false, error: 'Password not set' },
        { status: 400, headers: getPrivateNoStoreHeaders() },
      );
    }

    const passwordValid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
    if (!passwordValid) {
      return NextResponse.json(
        { success: false, errorKey: 'invalidCredentials' },
        { status: 400, headers: getPrivateNoStoreHeaders() },
      );
    }

    const nextEmail = parsed.data.email;
    if (nextEmail.toLowerCase() === user.email.toLowerCase()) {
      return NextResponse.json(
        { success: true, unchanged: true },
        { headers: getPrivateNoStoreHeaders() },
      );
    }

    if (user.parentEmail && user.parentEmail.trim().toLowerCase() === nextEmail.toLowerCase()) {
      return NextResponse.json(
        { success: false, errorKey: 'parentEmailSame' },
        { status: 400, headers: getPrivateNoStoreHeaders() },
      );
    }

    try {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: {
            email: nextEmail,
            emailVerifiedAt: null,
          },
          select: { id: true },
        }),
        // An email address is an account-recovery identifier. Revoke every
        // existing session so a stolen session cannot silently retain access
        // after the identity change.
        prisma.authSession.deleteMany({ where: { userId } }),
      ]);
    } catch (error) {
      const isUnique = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
      if (isUnique) {
        return NextResponse.json(
          { success: false, errorKey: 'emailExists' },
          { status: 409, headers: getPrivateNoStoreHeaders() },
        );
      }
      throw error;
    }

    const { token } = await issueEmailVerificationToken(userId);
    const origin = getTrustedAppOrigin(request);
    const verifyUrl = `${origin}/verify-email?token=${encodeURIComponent(token)}`;

    await sendAccountVerificationEmail(nextEmail, verifyUrl);

    const response = NextResponse.json(
      {
        success: true,
        verificationSent: true,
        reauthenticationRequired: true,
      },
      { headers: getPrivateNoStoreHeaders() },
    );
    response.cookies.delete('session_token');
    return response;
  } catch (error) {
    console.error('Error updating email:', error);
    return NextResponse.json(
      { success: false, error: getPublicErrorMessage(error, 'Failed to update email') },
      { status: 500, headers: getPrivateNoStoreHeaders() },
    );
  }
}
