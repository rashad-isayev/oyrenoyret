'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/src/modules/auth/components/password-input';
import { changePendingOnboardingEmail } from '@/src/modules/auth/actions/registration';
import { resolveAuthError } from '@/src/modules/auth/utils/resolve-auth-error';
import { useI18n } from '@/src/i18n/i18n-provider';
import { EmailVerificationStep } from './email-verification-step';
import { GuidelinesStep } from './guidelines-step';
import {
  WelcomeActionLabel,
  WelcomeShell,
} from './welcome-shell';

interface RegistrationCompletionFlowProps {
  userId: string;
  email: string;
  emailVerified: boolean;
  guidelinesAccepted: boolean;
  guardianManaged: boolean;
}

/**
 * Standalone completion flow for a returning incomplete account. The normal
 * workspace links here from its read-only banner; verification and rules never
 * render inside the dashboard itself.
 */
export function RegistrationCompletionFlow({
  userId,
  email,
  emailVerified: initiallyVerified,
  guidelinesAccepted,
  guardianManaged,
}: RegistrationCompletionFlowProps) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { t, messages } = useI18n();
  const copy = messages.auth.onboarding;
  const [changingEmail, startChangingEmail] = useTransition();
  const [emailVerified, setEmailVerified] = useState(initiallyVerified);
  const [currentEmail, setCurrentEmail] = useState(email);
  const [emailDraft, setEmailDraft] = useState(email);
  const [emailCorrectionOpen, setEmailCorrectionOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [accepted, setAccepted] = useState(guidelinesAccepted);
  const [guardianAccepted, setGuardianAccepted] = useState(false);
  const [ready, setReady] = useState(false);
  const [openRulesInitially, setOpenRulesInitially] = useState(
    initiallyVerified && !guidelinesAccepted,
  );
  const [transitioningToOnboarding, setTransitioningToOnboarding] =
    useState(false);

  const submitEmailCorrection = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get('password') ?? '');

    startChangingEmail(async () => {
      const result = await changePendingOnboardingEmail(userId, {
        email: emailDraft,
        password,
      });
      if (!result.success) {
        toast.error(
          resolveAuthError(messages, t, copy.credentials.failed, result),
        );
        return;
      }

      setCurrentEmail(result.email);
      setEmailDraft(result.email);
      setEmailCorrectionOpen(false);
      if (result.codeSent) {
        toast.success(copy.verification.changeSuccess);
      } else {
        toast.info(copy.verification.sendReminder);
      }
    });
  };

  const leaveRules = (destination: string) => {
    if (destination !== '/welcome/onboarding') {
      window.location.assign(destination);
      return;
    }

    setTransitioningToOnboarding(true);
    window.setTimeout(
      () => window.location.assign(destination),
      reduceMotion ? 0 : 420,
    );
  };

  return (
    <>
      <WelcomeShell
        phase="registration"
        phaseProgress={emailVerified ? 1 : 2 / 3}
        phaseLabel={copy.phaseLabels.registration}
        progressLabel={copy.progressLabel}
        footerActionPosition={
          transitioningToOnboarding
            ? 'center'
            : emailVerified
              ? 'end'
              : 'start'
        }
        leadingFooterAction={
          emailVerified && !transitioningToOnboarding ? (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              disabled={pending}
              onClick={() => router.push('/dashboard')}
            >
              {copy.guidelines.defer}
            </Button>
          ) : undefined
        }
        footer={
          <Button
            type={
              emailVerified && !transitioningToOnboarding ? 'submit' : 'button'
            }
            form={emailVerified ? 'onboarding-guidelines-form' : undefined}
            variant={emailVerified ? 'primary' : 'secondary'}
            size="lg"
            disabled={
              pending ||
              (emailVerified && !ready)
            }
            aria-disabled={transitioningToOnboarding || undefined}
            onClick={
              emailVerified ? undefined : () => router.push('/dashboard')
            }
            className={`w-48 duration-300 ${
              transitioningToOnboarding ? 'pointer-events-none' : ''
            }`}
          >
            <WelcomeActionLabel
              identity={
                transitioningToOnboarding
                  ? 'onboarding'
                  : emailVerified
                    ? 'guidelines'
                    : 'verification'
              }
            >
              {transitioningToOnboarding
                ? copy.tour.next
                : emailVerified
                  ? copy.continue
                  : copy.verification.doLater}
            </WelcomeActionLabel>
          </Button>
        }
      >
        <motion.div
          animate={{
            opacity: transitioningToOnboarding ? 0 : 1,
            y: transitioningToOnboarding && !reduceMotion ? -8 : 0,
          }}
          transition={{
            duration: reduceMotion ? 0 : 0.2,
            ease: 'easeOut',
          }}
        >
          {!emailVerified ? (
            <EmailVerificationStep
              key={currentEmail}
              userId={userId}
              email={currentEmail}
              onChangeEmail={() => setEmailCorrectionOpen(true)}
              onPendingChange={setPending}
              onSuccess={() => {
                setEmailVerified(true);
                setOpenRulesInitially(true);
              }}
            />
          ) : (
            <GuidelinesStep
              userId={userId}
              guardianManaged={guardianManaged}
              accepted={accepted}
              onAcceptedChange={setAccepted}
              guardianAccepted={guardianAccepted}
              onGuardianAcceptedChange={setGuardianAccepted}
              openRulesInitially={openRulesInitially}
              onPendingChange={setPending}
              onReadyChange={setReady}
              onSuccess={leaveRules}
            />
          )}
        </motion.div>
      </WelcomeShell>

      <AlertDialog
        open={emailCorrectionOpen}
        onOpenChange={(open) => {
          if (!changingEmail) setEmailCorrectionOpen(open);
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {copy.verification.changeEmail}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {copy.verification.changeDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form
            id="pending-email-correction-form"
            className="space-y-4"
            onSubmit={submitEmailCorrection}
          >
            <Field>
              <FieldLabel htmlFor="pending-email-correction">
                {copy.credentials.email}
              </FieldLabel>
              <Input
                id="pending-email-correction"
                type="email"
                name="email"
                autoComplete="email"
                maxLength={254}
                required
                value={emailDraft}
                onChange={(event) => setEmailDraft(event.target.value)}
                disabled={changingEmail}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="pending-email-password">
                {copy.credentials.password}
              </FieldLabel>
              <PasswordInput
                id="pending-email-password"
                name="password"
                autoComplete="current-password"
                maxLength={72}
                required
                disabled={changingEmail}
              />
            </Field>
          </form>
          <AlertDialogFooter>
            <Button
              type="button"
              variant="secondary"
              disabled={changingEmail}
              onClick={() => setEmailCorrectionOpen(false)}
            >
              {copy.verification.cancelChange}
            </Button>
            <Button
              type="submit"
              form="pending-email-correction-form"
              disabled={changingEmail}
            >
              {changingEmail ? copy.saving : copy.verification.changeEmail}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
