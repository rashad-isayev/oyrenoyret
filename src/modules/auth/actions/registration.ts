/**
 * Registration Server Actions
 * 
 * Server-side actions for handling multi-step registration.
 * All actions validate input, check permissions, and update database.
 */

'use server';

import { Prisma } from '@prisma/client';
import { prisma } from '@/src/db/client';
import { hashPassword, verifyPassword } from '../utils/password';
import { getOrCreatePublicId } from '@/src/lib/public-id';
import {
  verificationCodeSchema,
  type VerificationCodeInput,
  onboardingAccountSchema,
  pendingOnboardingEmailSchema,
  onboardingGuidelinesSchema,
  type OnboardingAccountInput,
  type PendingOnboardingEmailInput,
  type OnboardingGuidelinesInput,
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
import { logDevelopmentVerificationCode } from '../utils/development-email-log';
import { createSession, getCurrentSession } from '../utils/session';
import { CONSENT_VERSION, GUIDELINES_VERSION } from '@/src/config/constants';
import { headers } from 'next/headers';
import { getRandomAvatarVariant } from '@/src/lib/avatar';
import { getTrustedClientIpFromHeaders } from '@/src/security/rateLimiter';
import { hasAcceptedCurrentGuidelines } from '@/src/modules/onboarding/account-setup-state';

async function issueOnboardingVerificationCode(
  userId: string,
  email: string,
) {
  const code = generateVerificationCode();
  const expiresAt = getCodeExpiryTime();

  await prisma.$transaction(async (tx) => {
    await tx.registrationVerification.updateMany({
      where: { userId, used: false },
      data: { used: true },
    });
    await tx.registrationVerification.create({
      data: {
        userId,
        email,
        codeHash: hashVerificationCode(userId, email, code),
        expiresAt,
      },
    });
  });

  logDevelopmentVerificationCode(email, code);
  await sendVerificationCode(email, code);
}

/**
 * Credentials are the durable account-creation boundary. Later setup stages
 * are independent milestones so a user can sign in and safely resume them.
 * Re-submitting from the correction flow updates only the current unfinished
 * account and invalidates any code issued for the previous email.
 */
export async function createOnboardingAccount(
  data: OnboardingAccountInput,
) {
  try {
    const { checkRegistrationRateLimit } = await import('./rate-limit');
    const rateLimit = await checkRegistrationRateLimit();
    if (!rateLimit.allowed) {
      const minutes = Math.ceil(
        (rateLimit.resetAt.getTime() - Date.now()) / 1000 / 60,
      );
      return {
        success: false as const,
        errorKey: 'registrationRateLimit',
        errorVars: { minutes },
      };
    }

    const validated = onboardingAccountSchema.parse(data);
    const sessionUserId = await getCurrentSession();
    const sessionUser = sessionUserId
      ? await prisma.user.findFirst({
          where: {
            id: sessionUserId,
            deletedAt: null,
            guidelinesAcceptedAt: null,
            registrationCompletedAt: null,
          },
          select: { id: true, email: true },
        })
      : null;
    if (sessionUserId && !sessionUser) {
      return { success: false as const, errorKey: 'unauthorized' };
    }
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
      select: { id: true, deletedAt: true },
    });
    if (
      existingUser &&
      (!sessionUser || existingUser.id !== sessionUser.id)
    ) {
      return {
        success: false as const,
        errorKey: 'emailExistsResume',
      };
    }

    const accountOwnerType =
      validated.declaredAge < 16 ? ('GUARDIAN' as const) : ('SELF' as const);
    const passwordHash = await hashPassword(validated.password);
    const accountData = {
      email: validated.email,
      passwordHash,
      firstName: validated.firstName,
      lastName: validated.lastName || null,
      role: 'STUDENT' as const,
      status: 'INACTIVE' as const,
      registrationStep: 2,
      learningMotivation: validated.learningMotivation,
      weeklyLearningGoal: validated.weeklyLearningGoal,
      declaredAge: validated.declaredAge,
      accountOwnerType,
      emailVerifiedAt: null,
      parentEmail:
        accountOwnerType === 'GUARDIAN' ? validated.email : null,
    };

    const account = sessionUser
      ? await prisma.user.update({
          where: { id: sessionUser.id },
          data: accountData,
          select: { id: true, email: true },
        })
      : await prisma.user.create({
          data: {
            ...accountData,
            onboardingStartedAt: new Date(),
            avatarVariant: getRandomAvatarVariant(),
          },
          select: { id: true, email: true },
        });

    await prisma.registrationVerification.updateMany({
      where: { userId: account.id, used: false },
      data: { used: true },
    });
    await getOrCreatePublicId(account.id);

    if (!sessionUser) {
      const headersList = await headers();
      const ipAddress =
        getTrustedClientIpFromHeaders(headersList) || undefined;
      const userAgent = headersList.get('user-agent') || undefined;
      await createSession(account.id, ipAddress, userAgent);
    }

    let codeSent = true;
    try {
      await issueOnboardingVerificationCode(account.id, account.email);
    } catch {
      codeSent = false;
    }

    return {
      success: true as const,
      userId: account.id,
      email: account.email,
      accountOwnerType,
      codeSent,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return {
        success: false as const,
        errorKey: 'emailExistsResume',
      };
    }
    console.error('Failed to create onboarding account:', error);
    return {
      success: false as const,
      errorKey: 'registrationUnexpected',
    };
  }
}

/**
 * Correct the login email of an authenticated, unverified onboarding account.
 * Re-authentication prevents a stale or borrowed session from changing the
 * account identifier, while preserving the same durable user record.
 */
export async function changePendingOnboardingEmail(
  userId: string,
  data: PendingOnboardingEmailInput,
) {
  try {
    const sessionUserId = await getCurrentSession();
    if (!sessionUserId || sessionUserId !== userId) {
      return { success: false as const, errorKey: 'unauthorized' };
    }

    const { checkRegistrationRateLimit } = await import('./rate-limit');
    const rateLimit = await checkRegistrationRateLimit();
    if (!rateLimit.allowed) {
      const minutes = Math.ceil(
        (rateLimit.resetAt.getTime() - Date.now()) / 1000 / 60,
      );
      return {
        success: false as const,
        errorKey: 'registrationRateLimit',
        errorVars: { minutes },
      };
    }

    const validated = pendingOnboardingEmailSchema.parse(data);
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
        emailVerifiedAt: null,
        guidelinesAcceptedAt: null,
      },
      select: { id: true, email: true, passwordHash: true },
    });
    if (!user || !user.passwordHash) {
      return { success: false as const, errorKey: 'userNotFound' };
    }
    if (!(await verifyPassword(validated.password, user.passwordHash))) {
      return { success: false as const, errorKey: 'invalidCredentials' };
    }

    const emailOwner = await prisma.user.findUnique({
      where: { email: validated.email },
      select: { id: true },
    });
    if (emailOwner && emailOwner.id !== user.id) {
      return { success: false as const, errorKey: 'emailExistsResume' };
    }

    await prisma.$transaction(async (tx) => {
      const updated = await tx.user.updateMany({
        where: {
          id: user.id,
          deletedAt: null,
          emailVerifiedAt: null,
          guidelinesAcceptedAt: null,
        },
        data: { email: validated.email, registrationStep: 2 },
      });
      if (updated.count !== 1) throw new Error('ACCOUNT_STATE_CHANGED');

      await tx.registrationVerification.updateMany({
        where: { userId: user.id, used: false },
        data: { used: true },
      });
    });

    let codeSent = true;
    try {
      await issueOnboardingVerificationCode(user.id, validated.email);
    } catch {
      codeSent = false;
    }

    return {
      success: true as const,
      email: validated.email,
      codeSent,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return { success: false as const, errorKey: 'emailExistsResume' };
    }
    return { success: false as const, errorKey: 'registrationUnexpected' };
  }
}

export async function sendOnboardingVerificationCode(
  userId: string,
) {
  try {
    const sessionUserId = await getCurrentSession();
    if (!sessionUserId || sessionUserId !== userId) {
      return { success: false as const, errorKey: 'unauthorized' };
    }

    const { checkVerificationResendRateLimit } = await import('./rate-limit');
    const rateLimit = await checkVerificationResendRateLimit();
    if (!rateLimit.allowed) {
      const minutes = Math.ceil(
        (rateLimit.resetAt.getTime() - Date.now()) / 1000 / 60,
      );
      return {
        success: false as const,
        errorKey: 'verificationRateLimit',
        errorVars: { minutes },
      };
    }

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
        emailVerifiedAt: null,
      },
      select: { email: true },
    });
    if (!user) {
      return { success: false as const, errorKey: 'userNotFound' };
    }

    await issueOnboardingVerificationCode(userId, user.email);
    return { success: true as const };
  } catch {
    return {
      success: false as const,
      errorKey: 'verificationSendFailed',
    };
  }
}

export async function verifyOnboardingEmail(
  userId: string,
  data: VerificationCodeInput,
) {
  try {
    const sessionUserId = await getCurrentSession();
    if (!sessionUserId || sessionUserId !== userId) {
      return { success: false as const, errorKey: 'unauthorized' };
    }

    const validated = verificationCodeSchema.parse(data);
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { email: true, emailVerifiedAt: true },
    });
    if (!user) {
      return { success: false as const, errorKey: 'userNotFound' };
    }
    if (user.emailVerifiedAt) {
      return { success: true as const };
    }
    const verification = await prisma.registrationVerification.findFirst({
      where: {
        userId,
        email: user.email,
        used: false,
        verifiedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!verification) {
      return { success: false as const, errorKey: 'verificationInvalid' };
    }
    if (isCodeExpired(verification.expiresAt)) {
      return { success: false as const, errorKey: 'verificationExpired' };
    }
    if (verification.attempts >= getMaxVerificationAttempts()) {
      return { success: false as const, errorKey: 'verificationTooMany' };
    }

    if (
      !verifyVerificationCode(
        userId,
        user.email,
        validated.code,
        verification.codeHash,
      )
    ) {
      const failedAttempts = verification.attempts + 1;
      await prisma.registrationVerification.updateMany({
        where: {
          id: verification.id,
          used: false,
          attempts: verification.attempts,
        },
        data: { attempts: { increment: 1 } },
      });
      return {
        success: false as const,
        errorKey:
          failedAttempts >= getMaxVerificationAttempts()
            ? 'verificationTooMany'
            : 'verificationInvalid',
      };
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.registrationVerification.updateMany({
        where: {
          id: verification.id,
          used: false,
          expiresAt: { gt: now },
          attempts: { lt: getMaxVerificationAttempts() },
        },
        data: { used: true, verifiedAt: now },
      });
      if (claimed.count !== 1) throw new Error('VERIFICATION_ALREADY_USED');

      const updated = await tx.user.updateMany({
        where: { id: userId, emailVerifiedAt: null, deletedAt: null },
        data: { emailVerifiedAt: now, registrationStep: 3 },
      });
      if (updated.count !== 1) throw new Error('VERIFICATION_ALREADY_USED');
    });

    return { success: true as const };
  } catch {
    return { success: false as const, errorKey: 'verificationFailed' };
  }
}

export async function acceptOnboardingGuidelines(
  userId: string,
  data: OnboardingGuidelinesInput,
) {
  try {
    const sessionUserId = await getCurrentSession();
    if (!sessionUserId || sessionUserId !== userId) {
      return { success: false as const, errorKey: 'unauthorized' };
    }
    const validated = onboardingGuidelinesSchema.parse(data);

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
        emailVerifiedAt: { not: null },
      },
    });
    if (!user) {
      return { success: false as const, errorKey: 'userNotFound' };
    }
    const isInitialAcceptance = !user.guidelinesAcceptedAt;
    if (
      isInitialAcceptance &&
      user.accountOwnerType === 'GUARDIAN' &&
      validated.guardianAuthorityAccepted !== true
    ) {
      return { success: false as const, errorKey: 'consentRequired' };
    }
    const destination =
      user.tutorialCompletedAt || user.tutorialSkippedAt
        ? '/dashboard'
        : '/welcome/onboarding';

    if (hasAcceptedCurrentGuidelines(user)) {
      if (user.status === 'INACTIVE') {
        await prisma.user.updateMany({
          where: { id: userId, status: 'INACTIVE', deletedAt: null },
          data: { status: 'ACTIVE' },
        });
      }
      return { success: true as const, destination };
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      const updated = await tx.user.updateMany({
        where: {
          id: userId,
          deletedAt: null,
          emailVerifiedAt: { not: null },
        },
        data: {
          ...(user.status === 'INACTIVE' ? { status: 'ACTIVE' as const } : {}),
          ...(isInitialAcceptance
            ? {
                registrationStep: 4,
                registrationCompletedAt: now,
              }
            : {}),
          guidelinesAcceptedAt: now,
          guidelinesVersion: GUIDELINES_VERSION,
        },
      });
      if (updated.count !== 1) throw new Error('GUIDELINES_ALREADY_UPDATED');

      if (isInitialAcceptance && user.accountOwnerType === 'GUARDIAN') {
        const existingConsent = await tx.parentalConsent.findFirst({
          where: { userId, status: 'GRANTED' },
          select: { id: true },
        });
        if (!existingConsent) {
          await tx.parentalConsent.create({
            data: {
              userId,
              parentEmail: user.email,
              status: 'GRANTED',
              consentVersion: CONSENT_VERSION,
              grantedAt: now,
            },
          });
        }
      }
    });

    return { success: true as const, destination };
  } catch (error) {
    console.error('Failed to accept onboarding guidelines:', error);
    return { success: false as const, errorKey: 'consentFailed' };
  }
}
