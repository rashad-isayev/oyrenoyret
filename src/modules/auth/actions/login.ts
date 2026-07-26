/**
 * Login Server Actions
 * 
 * Server-side actions for user authentication.
 */

'use server';

import { prisma } from '@/src/db/client';
import { verifyPassword } from '../utils/password';
import { loginSchema, type LoginInput } from '../schemas/registration';
import { createSession } from '../utils/session';
import { headers } from 'next/headers';
import { getTrustedClientIpFromHeaders } from '@/src/security/rateLimiter';
import { GUIDELINES_VERSION } from '@/src/config/constants';

/**
 * Authenticates a user and creates a session
 */
export async function login(data: LoginInput) {
  try {
    // Rate limit: prevent brute-force attacks
    const { checkLoginRateLimit } = await import('./rate-limit');
    const rateLimit = await checkLoginRateLimit();
    if (!rateLimit.allowed) {
      const minutes = Math.ceil(
        (rateLimit.resetAt.getTime() - Date.now()) / 1000 / 60
      );
      return {
        success: false,
        errorKey: 'loginRateLimit',
        errorVars: { minutes },
      };
    }

    // Validate input
    const validated = loginSchema.parse(data);

    const user = await prisma.user.findFirst({
      where: { email: validated.email, deletedAt: null },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        status: true,
        emailVerifiedAt: true,
        guidelinesAcceptedAt: true,
        guidelinesVersion: true,
      },
    });

    if (!user) {
      return {
        success: false,
        errorKey: 'invalidCredentials',
      };
    }

    // Check if user has password (not OAuth-only)
    if (!user.passwordHash) {
      return {
        success: false,
        errorKey: 'invalidCredentials',
      };
    }

    // Verify password
    const passwordValid = await verifyPassword(validated.password, user.passwordHash);

    if (!passwordValid) {
      return {
        success: false,
        errorKey: 'invalidCredentials',
      };
    }

    // Create session
    const headersList = await headers();
    const ipAddress = getTrustedClientIpFromHeaders(headersList) || undefined;
    const userAgent = headersList.get('user-agent') || undefined;

    await createSession(user.id, ipAddress, userAgent);
    // Redirect handled by client component
    return {
      success: true,
      userId: user.id,
      role: user.role,
      requiresActivation:
        !user.emailVerifiedAt ||
        !user.guidelinesAcceptedAt ||
        user.guidelinesVersion !== GUIDELINES_VERSION,
      destination: '/dashboard',
    };
  } catch {
    return {
      success: false,
      errorKey: 'loginFailed',
    };
  }
}
