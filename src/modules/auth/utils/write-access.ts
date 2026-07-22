import { prisma } from '@/src/db/client';

type AccountWriteAccessResult =
  | { ok: true }
  | { ok: false; status: 401; errorKey: 'unauthorized' }
  | { ok: false; status: 403; errorKey: 'emailNotVerified' | 'accountSuspended' | 'accountBanned'; error: string };

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

export async function requireVerifiedEmailForWrite(
  userId: string,
): Promise<AccountWriteAccessResult> {
  const active = await requireActiveAccountForWrite(userId);
  if (!active.ok) return active;

  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { emailVerifiedAt: true },
  });
  if (!user) return { ok: false, status: 401, errorKey: 'unauthorized' };
  if (!user.emailVerifiedAt) {
    return { ok: false, status: 403, errorKey: 'emailNotVerified', error: 'Email not verified.' };
  }
  return { ok: true };
}
