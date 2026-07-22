/**
 * Registration Server Actions
 * 
 * Server-side actions for handling multi-step registration.
 * All actions validate input, check permissions, and update database.
 */

'use server';

import { prisma } from '@/src/db/client';
import { hashPassword } from '../utils/password';
import { getOrCreatePublicId } from '@/src/lib/public-id';
import {
  studentInfoSchema,
  parentInfoSchema,
  verificationCodeSchema,
  consentSchema,
  type StudentInfoInput,
  type ParentInfoInput,
  type VerificationCodeInput,
  type ConsentInput,
} from '../schemas/registration';
import {
  generateVerificationCode,
  getCodeExpiryTime,
  isCodeExpired,
  getMaxVerificationAttempts,
  hashVerificationCode,
  verifyVerificationCode,
} from '../utils/verification';
import { sendVerificationCode } from '../services/email';
import { createSession } from '../utils/session';
import {
  issueRegistrationToken,
  requireRegistrationToken,
  clearRegistrationToken,
} from '../utils/registration-token';
import { ensureDefaultCredits } from '@/src/modules/credits';
import { CONSENT_VERSION } from '@/src/config/constants';
import { headers } from 'next/headers';
import { recordDailyVisit } from '@/src/modules/visits';
import { getRandomAvatarVariant } from '@/src/lib/avatar';
import { getTrustedClientIpFromHeaders } from '@/src/security/rateLimiter';

/**
 * Step 1: Create student account with basic information
 */
export async function registerStudentInfo(data: StudentInfoInput) {
  try {
    const { checkRegistrationRateLimit } = await import('./rate-limit');
    const rateLimit = await checkRegistrationRateLimit();
    if (!rateLimit.allowed) {
      const minutes = Math.ceil(
        (rateLimit.resetAt.getTime() - Date.now()) / 1000 / 60
      );
      return {
        success: false,
        errorKey: 'registrationRateLimit',
        errorVars: { minutes },
      };
    }

    // Validate input
    const validated = studentInfoSchema.parse(data);

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (existingUser) {
      return {
        success: false,
        errorKey: 'emailExists',
      };
    }

    // Hash password
    const passwordHash = await hashPassword(validated.password);

    // Create user with INACTIVE status (will be activated after registration completes)
    const user = await prisma.user.create({
      data: {
        email: validated.email,
        passwordHash,
        firstName: validated.firstName,
        lastName: validated.lastName,
        grade: validated.grade,
        role: 'STUDENT',
        status: 'INACTIVE',
        registrationStep: 2, // Move to step 2
        avatarVariant: getRandomAvatarVariant(),
      },
    });
    await getOrCreatePublicId(user.id);
    await issueRegistrationToken(user.id);

    return {
      success: true,
      userId: user.id,
    };
  } catch (error) {
    return {
      success: false,
      errorKey: 'registrationUnexpected',
    };
  }
}

/**
 * Step 2: Add parent/guardian information
 */
export async function registerParentInfo(userId: string, data: ParentInfoInput) {
  try {
    const tokenCheck = await requireRegistrationToken(userId);
    if (!tokenCheck.ok) {
      return {
        success: false,
        errorKey: tokenCheck.errorKey,
      };
    }

    // Validate input
    const validated = parentInfoSchema.parse(data);

    // Get user to check student email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, status: true, registrationStep: true, deletedAt: true },
    });

    if (
      !user ||
      user.deletedAt ||
      user.status !== 'INACTIVE' ||
      ![2, 3].includes(user.registrationStep)
    ) {
      return {
        success: false,
        errorKey: 'userNotFound',
      };
    }

    // Check if parent email is different from student email
    if (validated.parentEmail === user.email) {
      return {
        success: false,
        errorKey: 'parentEmailSame',
      };
    }

    // Update user with parent information
    await prisma.user.update({
      where: { id: userId },
      data: {
        parentEmail: validated.parentEmail,
        parentFirstName: validated.parentFirstName,
        parentLastName: validated.parentLastName,
        registrationStep: 3, // Move to verification step
      },
    });

    // Invalidate any existing codes if the parent email was updated/re-submitted
    await prisma.guardianVerification.updateMany({
      where: {
        userId,
        used: false,
      },
      data: {
        used: true,
      },
    });
    await issueRegistrationToken(userId);

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      errorKey: 'registrationUnexpected',
    };
  }
}

/**
 * Step 3: Send verification code to parent email
 */
export async function sendParentVerificationCode(userId: string) {
  try {
    const tokenCheck = await requireRegistrationToken(userId);
    if (!tokenCheck.ok) {
      return {
        success: false,
        errorKey: tokenCheck.errorKey,
      };
    }

    // Check rate limit (server-side)
    const { checkVerificationResendRateLimit } = await import('./rate-limit');
    const rateLimit = await checkVerificationResendRateLimit();

    if (!rateLimit.allowed) {
      const minutes = Math.ceil(
        (rateLimit.resetAt.getTime() - Date.now()) / 1000 / 60
      );
      return {
        success: false,
        errorKey: 'verificationRateLimit',
        errorVars: { minutes },
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { parentEmail: true, status: true, registrationStep: true, deletedAt: true },
    });

    if (
      !user ||
      user.deletedAt ||
      !user.parentEmail ||
      user.status !== 'INACTIVE' ||
      user.registrationStep !== 3
    ) {
      return {
        success: false,
        errorKey: 'parentEmailNotFound',
      };
    }

    // Invalidate any existing unverified codes
    await prisma.guardianVerification.updateMany({
      where: {
        userId,
        verifiedAt: null,
        used: false,
      },
      data: {
        used: true, // Mark as used to invalidate
      },
    });

    // Generate new verification code
    const code = generateVerificationCode();
    const expiresAt = getCodeExpiryTime();

    // Store verification code
    await prisma.guardianVerification.create({
      data: {
        userId,
        parentEmail: user.parentEmail,
        codeHash: hashVerificationCode(userId, user.parentEmail, code),
        expiresAt,
      },
    });

    // Send email
    await sendVerificationCode(user.parentEmail, code);

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      errorKey: 'verificationSendFailed',
    };
  }
}

/**
 * Step 3: Verify parent email with code
 */
export async function verifyParentEmail(userId: string, data: VerificationCodeInput) {
  try {
    const tokenCheck = await requireRegistrationToken(userId);
    if (!tokenCheck.ok) {
      return {
        success: false,
        errorKey: tokenCheck.errorKey,
      };
    }

    // Validate input
    const validated = verificationCodeSchema.parse(data);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { parentEmail: true, status: true, registrationStep: true, deletedAt: true },
    });

    if (
      !user ||
      user.deletedAt ||
      !user.parentEmail ||
      user.status !== 'INACTIVE' ||
      user.registrationStep !== 3
    ) {
      return {
        success: false,
        errorKey: 'userOrParentNotFound',
      };
    }

    // Fetch the active record without querying by the user-supplied code.
    const verification = await prisma.guardianVerification.findFirst({
      where: {
        userId,
        parentEmail: user.parentEmail,
        used: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!verification) {
      return {
        success: false,
        errorKey: 'verificationInvalid',
      };
    }

    // Check if code is expired
    if (isCodeExpired(verification.expiresAt)) {
      return {
        success: false,
        errorKey: 'verificationExpired',
      };
    }

    // Check attempts
    if (verification.attempts >= getMaxVerificationAttempts()) {
      return {
        success: false,
        errorKey: 'verificationTooMany',
      };
    }

    if (!verifyVerificationCode(userId, user.parentEmail, validated.code, verification.codeHash)) {
      const failedAttempts = verification.attempts + 1;
      await prisma.guardianVerification.updateMany({
        where: { id: verification.id, used: false },
        data: {
          attempts: { increment: 1 },
          used: failedAttempts >= getMaxVerificationAttempts(),
        },
      });
      return {
        success: false,
        errorKey:
          failedAttempts >= getMaxVerificationAttempts() ? 'verificationTooMany' : 'verificationInvalid',
      };
    }

    await prisma.$transaction(async (tx) => {
      const claimed = await tx.guardianVerification.updateMany({
        where: {
          id: verification.id,
          used: false,
          attempts: { lt: getMaxVerificationAttempts() },
          expiresAt: { gt: new Date() },
        },
        data: { used: true, verifiedAt: new Date() },
      });
      if (claimed.count !== 1) throw new Error('VERIFICATION_CODE_ALREADY_USED');

      await tx.user.update({
        where: { id: userId },
        data: { registrationStep: 4 },
      });
    });
    await issueRegistrationToken(userId);

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      errorKey: 'verificationFailed',
    };
  }
}

/**
 * Step 4: Grant parental consent
 */
export async function grantParentalConsent(userId: string, data: ConsentInput) {
  try {
    const tokenCheck = await requireRegistrationToken(userId);
    if (!tokenCheck.ok) {
      return {
        success: false,
        errorKey: tokenCheck.errorKey,
      };
    }

    // Validate input
    const validated = consentSchema.parse(data);

    if (!validated.consentGranted) {
      return {
        success: false,
        errorKey: 'consentRequired',
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { parentEmail: true, status: true, registrationStep: true, deletedAt: true },
    });

    if (
      !user ||
      user.deletedAt ||
      !user.parentEmail ||
      user.status !== 'INACTIVE' ||
      user.registrationStep !== 4
    ) {
      return {
        success: false,
        errorKey: 'userOrParentNotFound',
      };
    }

    const parentEmail = user.parentEmail;

    // Require parent email verification before consent can be granted
    const verified = await prisma.guardianVerification.findFirst({
      where: {
        userId,
        parentEmail,
        verifiedAt: { not: null },
      },
      orderBy: {
        verifiedAt: 'desc',
      },
    });

    if (!verified) {
      return {
        success: false,
        errorKey: 'parentEmailNotVerified',
      };
    }

    // Grant the idempotent starting balance before atomically claiming the final step.
    await ensureDefaultCredits(userId);

    await prisma.$transaction(async (tx) => {
      const claimed = await tx.user.updateMany({
        where: { id: userId, status: 'INACTIVE', registrationStep: 4 },
        data: { status: 'ACTIVE', registrationStep: 5 },
      });
      if (claimed.count !== 1) throw new Error('REGISTRATION_ALREADY_COMPLETED');

      await tx.parentalConsent.create({
        data: {
          userId,
          parentEmail,
          status: 'GRANTED',
          consentVersion: CONSENT_VERSION,
          grantedAt: new Date(),
        },
      });
    });

    // Create session and redirect
    const headersList = await headers();
    const ipAddress = getTrustedClientIpFromHeaders(headersList) || undefined;
    const userAgent = headersList.get('user-agent') || undefined;

    await createSession(userId, ipAddress, userAgent);
    await recordDailyVisit(userId);
    await clearRegistrationToken();

    // Email verification is not sent automatically after registration.
    // Users can request it manually via the "Verify my email" button.

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      errorKey: 'consentFailed',
    };
  }
}
