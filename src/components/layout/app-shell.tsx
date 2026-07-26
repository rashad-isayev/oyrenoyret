'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { PiList as Menu } from 'react-icons/pi';
import { AppSidebar } from '@/src/components/layout/app-sidebar';
import { AccountTitle } from '@/src/components/layout/account-title';
import { Logo } from '@/src/components/ui/logo';
import { ProfileAvatar } from '@/src/components/layout/profile-avatar';
import { OnlinePresence } from '@/src/components/presence/online-presence';
import { cn } from '@/src/lib/utils';
import { useI18n } from '@/src/i18n/i18n-provider';
import { AccountSetupBanner } from '@/src/modules/onboarding/account-setup-banner';
import { getAccountSetupState } from '@/src/modules/onboarding/account-setup-state';
import { PlatformInteractionBoundary } from '@/src/modules/onboarding/platform-interaction-boundary';
import { DashboardShell } from '@/src/components/ui/dashboard-shell';
import { CurrentUserProvider } from '@/src/modules/auth/components/current-user-context';
import { AccountRestrictionDialog } from '@/src/components/moderation/account-restriction-dialog';
import { Button } from '@/components/ui/button';
import { useModalSurface } from '@/src/lib/use-modal-surface';

interface AppShellProps {
  children: ReactNode;
  displayName: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    avatarVariant?: string | null;
    email: string;
    role?: string;
    emailVerifiedAt?: string | null;
    guidelinesAcceptedAt?: string | null;
    guidelinesVersion?: string | null;
    accountOwnerType?: string | null;
    tutorialCompletedAt?: string | null;
    tutorialSkippedAt?: string | null;
    status?: string | null;
    suspensionUntil?: string | null;
    suspensionReason?: string | null;
    bannedAt?: string | null;
    banReason?: string | null;
  };
}

export function AppShell({
  children,
  displayName,
  user,
}: AppShellProps) {
  const pathname = usePathname();
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobileNavRef = useRef<HTMLDivElement | null>(null);
  const isDiscussionsRoute = pathname === '/discussions' || pathname.startsWith('/discussions/');
  const usesImmersiveMain = pathname.startsWith('/discussions/');
  const accountSetupState = getAccountSetupState(user);
  const requiresAccountActivation =
    accountSetupState === 'verify-email' ||
    accountSetupState === 'accept-guidelines';
  const removeMainPaddingY =
    isDiscussionsRoute &&
    pathname !== '/discussions';
  const isStaff = user.role === 'ADMIN' || user.role === 'TEACHER';
  const requiresProductTour =
    !requiresAccountActivation &&
    user.status === 'ACTIVE' &&
    !isStaff &&
    accountSetupState === 'product-tour';
  const systemNoticeState =
    requiresAccountActivation || requiresProductTour
      ? accountSetupState
      : null;
  const prevPathnameRef = useRef(pathname);
  useEffect(() => {
    const previous = prevPathnameRef.current;
    if (previous !== pathname && mobileNavOpen) {
      const id = requestAnimationFrame(() => setMobileNavOpen(false));
      prevPathnameRef.current = pathname;
      return () => cancelAnimationFrame(id);
    }
    prevPathnameRef.current = pathname;
    return;
  }, [pathname, mobileNavOpen]);

  useModalSurface({
    open: mobileNavOpen,
    onClose: () => setMobileNavOpen(false),
    containerRef: mobileNavRef,
  });

  return (
    <div className="app-canvas h-[100dvh] overflow-hidden">
      {isDiscussionsRoute ? <OnlinePresence /> : null}
      <AccountTitle displayName={displayName} />
      <CurrentUserProvider
        user={{
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          avatarVariant: user.avatarVariant,
          role: user.role,
          emailVerifiedAt: user.emailVerifiedAt,
          guidelinesAcceptedAt: user.guidelinesAcceptedAt,
          guidelinesVersion: user.guidelinesVersion,
          status: user.status ?? null,
          suspensionUntil: user.suspensionUntil ?? null,
          bannedAt: user.bannedAt ?? null,
        }}
      >
        <AccountRestrictionDialog
          status={user.status ?? null}
          suspensionUntil={user.suspensionUntil ?? null}
          suspensionReason={user.suspensionReason ?? null}
          banReason={user.banReason ?? null}
        />
        <div className="flex h-full min-h-0 w-full flex-col">
          <div className="flex h-[60px] shrink-0 items-center justify-between border-b border-border/70 bg-background/88 px-4 backdrop-blur-xl lg:hidden">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setMobileNavOpen(true)}
              aria-label={t('header.toggleMenu')}
              className="bg-secondary shadow-card"
            >
              <Menu className="h-[18px] w-[18px]" />
            </Button>
            <Logo size="sm" showText />
            <ProfileAvatar
              userId={user.id}
              firstName={user.firstName}
              lastName={user.lastName}
              avatarVariant={user.avatarVariant}
              size="sm"
              href="/settings/my-account"
              ariaLabel={t('settings.nav.myAccount')}
              title={t('settings.nav.myAccount')}
              showHoverCard={false}
              className="h-10 w-10"
            />
          </div>

          <div className="grid min-h-0 w-full flex-1 grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]">
            <AppSidebar user={user} className="hidden lg:flex" />
            <main
              className={cn(
                'min-h-0 min-w-0 overflow-x-hidden bg-background px-4 sm:px-6 lg:px-7 xl:px-8',
                usesImmersiveMain
                  ? 'flex flex-col overflow-y-hidden py-0'
                  : 'overflow-y-auto py-5 lg:py-6',
              )}
            >
              <div
                className={cn(
                  'mx-auto w-full max-w-[960px]',
                  usesImmersiveMain &&
                    'flex min-h-0 flex-1 flex-col',
                )}
              >
                {systemNoticeState ? (
                  <DashboardShell
                    width="standard"
                    className={cn(
                      'min-h-0 gap-0',
                      removeMainPaddingY ? 'pb-5 pt-5' : 'mb-5',
                    )}
                  >
                    <AccountSetupBanner
                      state={systemNoticeState}
                      userId={user.id}
                      guardianManaged={user.accountOwnerType === 'GUARDIAN'}
                      previouslyAcceptedGuidelines={Boolean(
                        user.guidelinesAcceptedAt,
                      )}
                    />
                  </DashboardShell>
                ) : null}
                <PlatformInteractionBoundary
                  locked={requiresAccountActivation}
                  className={cn(
                    usesImmersiveMain &&
                      'flex min-h-0 flex-1 flex-col',
                  )}
                >
                  {children}
                </PlatformInteractionBoundary>
              </div>
            </main>
          </div>
        </div>
      </CurrentUserProvider>

      <AnimatePresence>
        {mobileNavOpen ? (
          <motion.div
            className="fixed inset-0 z-50 lg:hidden"
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.18 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/45"
              onClick={() => setMobileNavOpen(false)}
              aria-label={t('header.closeNavigation')}
            />
            <motion.div
              ref={mobileNavRef}
              tabIndex={-1}
              className="app-rail absolute inset-y-0 left-0 w-[min(296px,88vw)] border-r border-border/70 shadow-float"
              initial={{ x: reduceMotion ? 0 : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: reduceMotion ? 0 : '-100%' }}
              transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.2, 0, 0, 1] }}
            >
              <AppSidebar
                user={user}
                className="h-full border-r-0"
                onClose={() => setMobileNavOpen(false)}
              />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
