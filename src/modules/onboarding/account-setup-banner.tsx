'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { PiArrowRight as ArrowRight } from 'react-icons/pi';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { acceptOnboardingGuidelines } from '@/src/modules/auth/actions/registration';
import { resolveAuthError } from '@/src/modules/auth/utils/resolve-auth-error';
import { useI18n } from '@/src/i18n/i18n-provider';
import { cn } from '@/src/lib/utils';
import type { AccountSetupState } from './account-setup-state';
import { CommunityRulesDialog } from './community-rules-dialog';

interface AccountSetupBannerProps {
  state: Exclude<AccountSetupState, 'ready'>;
  userId: string;
  guardianManaged?: boolean;
  previouslyAcceptedGuidelines?: boolean;
  className?: string;
}

/**
 * A single recovery notice for every persisted onboarding milestone. Account
 * activation takes priority over the optional tour; only one notice is shown.
 */
export function AccountSetupBanner({
  state,
  userId,
  guardianManaged = false,
  previouslyAcceptedGuidelines = false,
  className,
}: AccountSetupBannerProps) {
  const router = useRouter();
  const { t, messages } = useI18n();
  const copy = messages.auth.onboarding;
  const [rulesOpen, setRulesOpen] = useState(false);
  const [guardianConfirmed, setGuardianConfirmed] = useState(false);
  const [skipping, startSkipping] = useTransition();

  const isVerification = state === 'verify-email';
  const isRules = state === 'accept-guidelines';
  const title = isVerification
    ? copy.accountBanner.verifyTitle
    : isRules
      ? previouslyAcceptedGuidelines
        ? copy.accountBanner.rulesUpdatedTitle
        : copy.accountBanner.rulesTitle
      : copy.accountBanner.tourTitle;
  const description = isVerification
    ? copy.accountBanner.verifyDescription
    : isRules
      ? previouslyAcceptedGuidelines
        ? copy.accountBanner.rulesUpdatedDescription
        : copy.accountBanner.rulesDescription
      : copy.accountBanner.tourDescription;
  const requiresGuardianConfirmation =
    isRules && guardianManaged && !previouslyAcceptedGuidelines;

  const acceptRules = async () => {
    try {
      const result = await acceptOnboardingGuidelines(userId, {
        guidelinesAccepted: true,
        guardianAuthorityAccepted: requiresGuardianConfirmation
          ? guardianConfirmed
          : undefined,
      });
      if (!result.success) {
        toast.error(
          resolveAuthError(messages, t, copy.guidelines.failed, result),
        );
        return false;
      }
      router.refresh();
      return true;
    } catch {
      toast.error(copy.guidelines.failed);
      return false;
    }
  };

  const skipTour = () => {
    startSkipping(async () => {
      try {
        const response = await fetch('/api/onboarding/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ action: 'skip' }),
        });
        if (!response.ok) throw new Error('TOUR_SKIP_FAILED');
        router.refresh();
      } catch {
        toast.error(copy.tour.saveFailed);
      }
    });
  };

  return (
    <>
      <section
        className={cn(
          'flex flex-col gap-3 rounded-xl bg-secondary/70 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between',
          className,
        )}
        aria-labelledby="account-setup-banner-title"
      >
        <div className="min-w-0">
          <h2
            id="account-setup-banner-title"
            className="text-sm font-semibold text-foreground"
          >
            {title}
          </h2>
          <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
            {description}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
          {isVerification ? (
            <Button asChild size="sm" variant="secondary-primary">
              <Link href="/welcome/signup">
                {copy.accountBanner.verifyAction}
                <ArrowRight className="h-4 w-4" data-directional-arrow="forward" aria-hidden="true" />
              </Link>
            </Button>
          ) : isRules ? (
            <Button
              type="button"
              size="sm"
              variant="secondary-primary"
              onClick={() => setRulesOpen(true)}
            >
              {copy.accountBanner.rulesAction}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={skipping}
                onClick={skipTour}
              >
                {skipping
                  ? copy.tour.saving
                  : copy.accountBanner.tourSkipAction}
              </Button>
              <Button asChild size="sm" variant="secondary-primary">
                <Link href="/welcome/onboarding">
                  {copy.accountBanner.tourExploreAction}
                  <ArrowRight className="h-4 w-4" data-directional-arrow="forward" aria-hidden="true" />
                </Link>
              </Button>
            </>
          )}
        </div>
      </section>

      {isRules ? (
        <CommunityRulesDialog
          open={rulesOpen}
          onOpenChange={(open) => {
            setRulesOpen(open);
            if (!open) setGuardianConfirmed(false);
          }}
          onAccept={acceptRules}
          requireGuardianConfirmation={requiresGuardianConfirmation}
          guardianConfirmed={guardianConfirmed}
          onGuardianConfirmedChange={setGuardianConfirmed}
        />
      ) : null}
    </>
  );
}
