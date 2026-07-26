import { prisma } from '@/src/db/client';
import { getAccountSetupState } from '@/src/modules/onboarding/account-setup-state';

type AccountWriteAccessResult =
  | { ok: true }
  | { ok: false; status: 401; errorKey: 'unauthorized' }
  | {
      ok: false;
      status: 403;
      errorKey:
        | 'emailNotVerified'
        | 'guidelinesRequired'
        | 'accountSuspended'
        | 'accountBanned';
      error: string;
    };

type AccountContentAccessResult =
  | { ok: true }
  | { ok: false; status: 401; errorKey: 'unauthorized' }
  | {
      ok: false;
      status: 403;
      errorKey: 'accountBanned';
      error: string;
    };

/**
 * Checks whether an authenticated account may read protected platform content.
 *
 * Suspended accounts retain read-only access so the existing suspension UX can
 * explain the restriction. Banned and deleted accounts must not bypass the app
 * shell by calling protected APIs directly.
 */
export async function requirePlatformContentAccess(
  userId: string,
): Promise<AccountContentAccessResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { status: true, deletedAt: true },
  });

  if (!user || user.deletedAt) {
    return { ok: false, status: 401, errorKey: 'unauthorized' };
  }

  if (user.status === 'BANNED') {
    return {
      ok: false,
      status: 403,
      errorKey: 'accountBanned',
      error: 'Account banned.',
    };
  }

  return { ok: true };
}

export async function requireActiveAccountForWrite(
  userId: string,
): Promise<AccountWriteAccessResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { status: true, suspensionUntil: true, deletedAt: true },
  });

  if (!user || user.deletedAt) return { ok: false, status: 401, errorKey: 'unauthorized' };

  // Account restrictions apply to all roles.
  if (user.status === 'BANNED') {
    return { ok: false, status: 403, errorKey: 'accountBanned', error: 'Account banned.' };
  }

  if (user.status === 'SUSPENDED') {
    const until = user.suspensionUntil;
    if (until && until.getTime() <= Date.now()) {
      // Suspension window expired; lift it opportunistically.
      await prisma.user.update({
        where: { id: userId },
        data: { status: 'ACTIVE', suspensionUntil: null, suspensionReason: null },
        select: { id: true },
      });
    } else {
      return {
        ok: false,
        status: 403,
        errorKey: 'accountSuspended',
        error: 'Account suspended.',
      };
    }
  }

  return { ok: true };
}

export async function requireAccountReadyForWrite(
  userId: string,
): Promise<AccountWriteAccessResult> {
  const active = await requireActiveAccountForWrite(userId);
  if (!active.ok) return active;

  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      emailVerifiedAt: true,
      guidelinesAcceptedAt: true,
      guidelinesVersion: true,
    },
  });
  if (!user) return { ok: false, status: 401, errorKey: 'unauthorized' };
  const accountSetupState = getAccountSetupState(user);
  if (accountSetupState === 'verify-email') {
    return { ok: false, status: 403, errorKey: 'emailNotVerified', error: 'Email not verified.' };
  }
  if (accountSetupState === 'accept-guidelines') {
    return {
      ok: false,
      status: 403,
      errorKey: 'guidelinesRequired',
      error: 'Community guidelines must be accepted.',
    };
  }
  return { ok: true };
}

/**
 * Backwards-compatible name for existing route imports. New code should use
 * `requireAccountReadyForWrite`, which reflects that both verification and
 * rules acceptance are enforced.
 */
export const requireVerifiedEmailForWrite = requireAccountReadyForWrite;
