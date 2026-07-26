/**
 * Reset Password API
 *
 * Exchanges a valid reset token for a new password.
 */

import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/src/db/client';
import { RATE_LIMITS } from '@/src/config/constants';
import { buildRateLimitResponse, checkRateLimit, getRateLimitIdentifier } from '@/src/security/rateLimiter';
import { getPrivateNoStoreHeaders } from '@/src/lib/http-cache';
import { hashPassword, validatePasswordStrength } from '@/src/modules/auth/utils/password';
import { JSON_BODY_LIMITS, readJsonBody } from '@/src/security/json-body';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('base64url');
}

export async function POST(request: Request) {
  const identifier = getRateLimitIdentifier(request);
  const rateLimit = await checkRateLimit(`auth:reset-password:${identifier}`, RATE_LIMITS.AUTH_PASSWORD_RESET);
  if (!rateLimit.allowed) {
    const { status, body, headers } = buildRateLimitResponse(rateLimit);
    return NextResponse.json(body, { status, headers });
  }

  try {
    const bodyResult = await readJsonBody<{
      token?: unknown;
      password?: unknown;
    }>(request, JSON_BODY_LIMITS.SMALL);
    if (!bodyResult.ok) {
      return NextResponse.json(
        { success: false, error: bodyResult.error },
        { status: bodyResult.status, headers: getPrivateNoStoreHeaders() },
      );
    }
    const body = bodyResult.value;
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!/^[A-Za-z0-9_-]{43}$/.test(token) || !password) {
      return NextResponse.json(
        { success: false, errorKey: 'resetTokenInvalid' },
        { status: 400, headers: getPrivateNoStoreHeaders() }
      );
    }

    if (!validatePasswordStrength(password).valid) {
      return NextResponse.json(
        { success: false, errorKey: 'passwordWeak' },
        { status: 400, headers: getPrivateNoStoreHeaders() },
      );
    }

    const tokenHash = hashToken(token);
    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        usedAt: true,
        user: { select: { deletedAt: true } },
      },
    });

    if (
      !resetRecord ||
      resetRecord.usedAt ||
      resetRecord.expiresAt < new Date() ||
      resetRecord.user.deletedAt
    ) {
      return NextResponse.json(
        { success: false, errorKey: 'resetTokenInvalid' },
        { status: 400, headers: getPrivateNoStoreHeaders() }
      );
    }

    const passwordHash = await hashPassword(password);

    await prisma.$transaction(async (tx) => {
      const claimed = await tx.passwordResetToken.updateMany({
        where: {
          id: resetRecord.id,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1) throw new Error('RESET_TOKEN_ALREADY_USED');

      const updated = await tx.user.updateMany({
        where: { id: resetRecord.userId, deletedAt: null },
        data: { passwordHash },
      });
      if (updated.count !== 1) throw new Error('RESET_TOKEN_ALREADY_USED');

      await tx.authSession.deleteMany({ where: { userId: resetRecord.userId } });
    });

    return NextResponse.json({ success: true }, { headers: getPrivateNoStoreHeaders() });
  } catch (error) {
    if (error instanceof Error && error.message === 'RESET_TOKEN_ALREADY_USED') {
      return NextResponse.json(
        { success: false, errorKey: 'resetTokenInvalid' },
        { status: 400, headers: getPrivateNoStoreHeaders() },
      );
    }
    console.error('Error resetting password:', error);
    return NextResponse.json(
      { success: false, errorKey: 'resetPasswordFailed' },
      { status: 500, headers: getPrivateNoStoreHeaders() }
    );
  }
}
