/**
 * Login Server Actions
 * 
 * Server-side actions for user authentication.
 */

'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/src/db/client';
import { verifyPassword } from '../utils/password';
import { loginSchema, type LoginInput } from '../schemas/registration';
import { createSession } from '../utils/session';
import { headers } from 'next/headers';
import { recordDailyVisit } from '@/src/modules/visits';
import { getTrustedClientIpFromHeaders } from '@/src/security/rateLimiter';

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

    // Check if registration is complete.
    // SUSPENDED/BANNED users can still sign in (visitor/restricted access).
    if (user.status === 'INACTIVE') {
      return {
        success: false,
        errorKey: 'registrationIncomplete',
      };
    }

    const requiresGuardianChecks = user.role === 'STUDENT';

    // Check if consent is granted (students only)
    if (requiresGuardianChecks) {
      const consent = await prisma.parentalConsent.findFirst({
        where: {
          userId: user.id,
          status: 'GRANTED',
        },
      });

      if (!consent) {
        return {
          success: false,
          errorKey: 'parentalConsentRequired',
        };
      }
    }

    // Create session
    const headersList = await headers();
    const ipAddress = getTrustedClientIpFromHeaders(headersList) || undefined;
    const userAgent = headersList.get('user-agent') || undefined;

    await createSession(user.id, ipAddress, userAgent);
    await recordDailyVisit(user.id);

    // Redirect handled by client component
    return {
      success: true,
      userId: user.id,
      role: user.role,
    };
  } catch (error) {
    return {
      success: false,
      errorKey: 'loginFailed',
    };
  }
}

/**
 * Logs out the current user
 */
export async function logout() {
  const { deleteSession } = await import('../utils/session');
  const { cookies } = await import('next/headers');
  
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  
  if (token) {
    await deleteSession(token);
  }
  
  redirect('/');
}
