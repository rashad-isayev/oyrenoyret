'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { ScrollAcceptanceDialog } from '@/components/ui/scroll-acceptance-dialog';
import { useI18n } from '@/src/i18n/i18n-provider';

interface CommunityRulesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => boolean | void | Promise<boolean | void>;
  initiallyComplete?: boolean;
  requireGuardianConfirmation?: boolean;
  guardianConfirmed?: boolean;
  onGuardianConfirmedChange?: (confirmed: boolean) => void;
}

/**
 * One canonical rendering of the current community rules. Registration,
 * interrupted-account recovery, and future re-acceptance all share this
 * reading and acknowledgement surface.
 */
export function CommunityRulesDialog({
  open,
  onOpenChange,
  onAccept,
  initiallyComplete = false,
  requireGuardianConfirmation = false,
  guardianConfirmed = false,
  onGuardianConfirmedChange,
}: CommunityRulesDialogProps) {
  const { messages } = useI18n();
  const copy = messages.auth.onboarding;

  return (
    <ScrollAcceptanceDialog
      open={open}
      onOpenChange={onOpenChange}
      title={copy.guidelines.rulesTitle}
      description={copy.guidelines.rulesDescription}
      scrollLabel={copy.guidelines.rulesTitle}
      scrollHint={copy.guidelines.scrollHint}
      endReachedText={copy.guidelines.endReached}
      cancelLabel={copy.guidelines.closeRules}
      acceptLabel={copy.guidelines.acceptRules}
      acceptingLabel={copy.guidelines.activating}
      initiallyComplete={initiallyComplete}
      acceptDisabled={requireGuardianConfirmation && !guardianConfirmed}
      onAccept={onAccept}
    >
      <div className="space-y-6">
        {copy.guidelines.rules.map((rule, index) => (
          <section key={rule.title}>
            <h3 className="text-sm font-semibold">
              {index + 1}. {rule.title}
            </h3>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
              {rule.description}
            </p>
          </section>
        ))}

        {requireGuardianConfirmation ? (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 p-3.5 text-sm leading-5">
            <Checkbox
              checked={guardianConfirmed}
              onCheckedChange={(checked) =>
                onGuardianConfirmedChange?.(checked)
              }
              className="mt-0.5"
            />
            <span>{copy.guidelines.guardianAccept}</span>
          </label>
        ) : null}
      </div>
    </ScrollAcceptanceDialog>
  );
}
