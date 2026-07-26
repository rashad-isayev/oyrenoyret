'use client';

import { useEffect, useState } from 'react';
import { PiCheckBold as Check } from 'react-icons/pi';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { acceptOnboardingGuidelines } from '@/src/modules/auth/actions/registration';
import { resolveAuthError } from '@/src/modules/auth/utils/resolve-auth-error';
import { useI18n } from '@/src/i18n/i18n-provider';
import { cn } from '@/src/lib/utils';
import { WelcomeHeading } from './welcome-shell';
import { CommunityRulesDialog } from './community-rules-dialog';

interface GuidelinesStepProps {
  userId: string;
  guardianManaged: boolean;
  accepted: boolean;
  onAcceptedChange: (accepted: boolean) => void;
  guardianAccepted: boolean;
  onGuardianAcceptedChange: (accepted: boolean) => void;
  openRulesInitially: boolean;
  onPendingChange: (pending: boolean) => void;
  onReadyChange: (ready: boolean) => void;
  onSuccess?: (destination: string) => void;
}

/**
 * Shared rules-acceptance stage used by uninterrupted signup and the
 * standalone returning-account completion flow.
 */
export function GuidelinesStep({
  userId,
  guardianManaged,
  accepted,
  onAcceptedChange,
  guardianAccepted,
  onGuardianAcceptedChange,
  openRulesInitially,
  onPendingChange,
  onReadyChange,
  onSuccess,
}: GuidelinesStepProps) {
  const { t, messages } = useI18n();
  const copy = messages.auth.onboarding;
  const [rulesOpen, setRulesOpen] = useState(
    () => openRulesInitially && !accepted,
  );

  useEffect(() => {
    onReadyChange(accepted && (!guardianManaged || guardianAccepted));
  }, [accepted, guardianAccepted, guardianManaged, onReadyChange]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accepted || (guardianManaged && !guardianAccepted)) return;

    onPendingChange(true);
    try {
      const result = await acceptOnboardingGuidelines(userId, {
        guidelinesAccepted: true,
        guardianAuthorityAccepted: guardianManaged
          ? guardianAccepted
          : undefined,
      });
      if (!result.success) {
        toast.error(
          resolveAuthError(messages, t, copy.guidelines.failed, result),
        );
        return;
      }
      if (onSuccess) {
        onSuccess(result.destination);
      } else {
        window.location.assign(result.destination);
      }
    } finally {
      onPendingChange(false);
    }
  };

  return (
    <div>
      <WelcomeHeading
        title={copy.guidelines.title}
        description={copy.guidelines.description}
      />

      <form
        id="onboarding-guidelines-form"
        onSubmit={submit}
        className="w-full"
      >
        <div
          className={cn(
            'flex items-center justify-between gap-4 rounded-xl border p-3.5 transition-[background-color,border-color]',
            accepted
              ? 'border-[hsl(var(--success))]/25 bg-[hsl(var(--success))]/[0.08]'
              : 'border-border/60',
          )}
          aria-live="polite"
        >
          <div className="min-w-0">
            <p
              className={cn(
                'flex items-center gap-2 text-sm font-medium',
                accepted && 'text-[hsl(var(--success))]',
              )}
            >
              {accepted ? (
                <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]">
                  <Check className="h-2.5 w-2.5" aria-hidden="true" />
                </span>
              ) : null}
              {accepted
                ? copy.guidelines.acceptedLabel
                : copy.guidelines.readRequired}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {copy.guidelines.accept}
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setRulesOpen(true)}
            className={cn(
              'shrink-0',
              accepted &&
                'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/15 active:bg-[hsl(var(--success))]/20',
            )}
          >
            {accepted
              ? copy.guidelines.reviewRules
              : copy.guidelines.openRules}
          </Button>
        </div>

        {guardianManaged ? (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-border/60 p-3.5">
            <Checkbox
              id="accept-guardian-authority"
              checked={guardianAccepted}
              onCheckedChange={onGuardianAcceptedChange}
              className="mt-0.5"
            />
            <label
              htmlFor="accept-guardian-authority"
              className="cursor-pointer text-sm leading-5"
            >
              {copy.guidelines.guardianAccept}
            </label>
          </div>
        ) : null}
      </form>

      <CommunityRulesDialog
        open={rulesOpen}
        onOpenChange={setRulesOpen}
        onAccept={() => onAcceptedChange(true)}
      />
    </div>
  );
}
