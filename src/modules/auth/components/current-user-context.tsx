'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useMemo } from 'react';
import { hasAcceptedCurrentGuidelines } from '@/src/modules/onboarding/account-setup-state';

type CurrentUser = {
  id: string;
  publicId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatarVariant?: string | null;
  role?: string | null;
  emailVerifiedAt?: string | null;
  guidelinesAcceptedAt?: string | null;
  guidelinesVersion?: string | null;
  status?: string | null;
  suspensionUntil?: string | null;
  bannedAt?: string | null;
};

type CurrentUserContextValue = {
  user: CurrentUser;
  requiresEmailVerification: boolean;
  requiresGuidelinesAcceptance: boolean;
  canWrite: boolean;
  writeRestriction:
    | null
    | 'emailNotVerified'
    | 'guidelinesRequired'
    | 'accountSuspended'
    | 'accountBanned';
};

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

export function CurrentUserProvider({
  user,
  children,
}: {
  user: CurrentUser;
  children: ReactNode;
}) {
  const value = useMemo<CurrentUserContextValue>(() => {
    const requiresEmailVerification = !user.emailVerifiedAt;
    const requiresGuidelinesAcceptance =
      !requiresEmailVerification && !hasAcceptedCurrentGuidelines(user);
    const status = user.status ?? null;
    const writeRestriction: CurrentUserContextValue['writeRestriction'] =
      status === 'BANNED'
        ? 'accountBanned'
        : status === 'SUSPENDED'
          ? 'accountSuspended'
          : requiresEmailVerification
            ? 'emailNotVerified'
            : requiresGuidelinesAcceptance
              ? 'guidelinesRequired'
            : null;
    return {
      user,
      requiresEmailVerification,
      requiresGuidelinesAcceptance,
      canWrite: writeRestriction === null,
      writeRestriction,
    };
  }, [user]);

  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser() {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) {
    throw new Error('useCurrentUser must be used within CurrentUserProvider');
  }
  return ctx;
}

export function useOptionalCurrentUser() {
  return useContext(CurrentUserContext);
}
