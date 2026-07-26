'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { VerificationCodeInput } from '@/components/ui/verification-code-input';
import {
  sendOnboardingVerificationCode,
  verifyOnboardingEmail,
} from '@/src/modules/auth/actions/registration';
import { resolveAuthError } from '@/src/modules/auth/utils/resolve-auth-error';
import { useI18n } from '@/src/i18n/i18n-provider';
import { WelcomeHeading } from './welcome-shell';

interface EmailVerificationStepProps {
  userId: string;
  email: string;
  onSuccess: () => void;
  onPendingChange?: (pending: boolean) => void;
  onChangeEmail?: () => void;
  initialResendCooldown?: number;
}

/**
 * Shared account-verification experience for initial signup and signed-in
 * account recovery. Verification begins automatically when all six digits are
 * present; the cells themselves communicate checking, invalid, and verified.
 */
export function EmailVerificationStep({
  userId,
  email,
  onSuccess,
  onPendingChange,
  onChangeEmail,
  initialResendCooldown = 0,
}: EmailVerificationStepProps) {
  const { t, messages } = useI18n();
  const copy = messages.auth.onboarding;
  const [resending, startResend] = useTransition();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<
    'idle' | 'checking' | 'invalid' | 'verified'
  >('idle');
  const lastAttemptRef = useRef('');
  const onSuccessRef = useRef(onSuccess);
  const onPendingChangeRef = useRef(onPendingChange);
  const transitionTimerRef = useRef<number | undefined>(undefined);
  const mountedRef = useRef(true);
  const [resendCooldown, setResendCooldown] = useState(
    initialResendCooldown,
  );

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onPendingChangeRef.current = onPendingChange;
  }, [onPendingChange, onSuccess]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (transitionTimerRef.current) {
        window.clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const verifyCompleteCode = async (completeCode: string) => {
    if (
      completeCode.length !== 6 ||
      status === 'checking' ||
      status === 'verified' ||
      lastAttemptRef.current === completeCode
    ) {
      return;
    }

    lastAttemptRef.current = completeCode;
    setStatus('checking');
    onPendingChangeRef.current?.(true);

    try {
      const result = await verifyOnboardingEmail(userId, {
        code: completeCode,
      });
      if (!mountedRef.current) return;
      if (result.success) {
        setStatus('verified');
        transitionTimerRef.current = window.setTimeout(
          () => onSuccessRef.current(),
          600,
        );
        return;
      }

      setStatus('invalid');
      transitionTimerRef.current = window.setTimeout(() => {
        if (mountedRef.current) {
          setCode('');
          setStatus('idle');
          lastAttemptRef.current = '';
        }
      }, 650);
    } finally {
      if (mountedRef.current) onPendingChangeRef.current?.(false);
    }
  };

  const resend = () => {
    startResend(async () => {
      const result = await sendOnboardingVerificationCode(userId);
      if (result.success) {
        setCode('');
        setStatus('idle');
        lastAttemptRef.current = '';
        setResendCooldown(30);
        toast.success(copy.verification.resent);
      } else {
        toast.error(
          resolveAuthError(messages, t, copy.verification.sendFailed, result),
        );
      }
    });
  };

  return (
    <div className="mx-auto w-full max-w-[680px]">
      <div className="text-center">
        <WelcomeHeading
          title={copy.verification.title}
          description={copy.verification.description}
          className="mb-0"
        />
        <div className="mt-2 flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 text-sm leading-5">
          <span className="break-all font-medium text-foreground">{email}</span>
          {onChangeEmail ? (
            <span className="text-muted-foreground">
              {copy.verification.wrongEmail}{' '}
              <Button
                type="button"
                variant="link"
                size="inline"
                onClick={onChangeEmail}
                disabled={resending || status === 'checking'}
              >
                {copy.verification.changeEmail}
              </Button>
            </span>
          ) : null}
        </div>
      </div>

      <VerificationCodeInput
        className="mt-8"
        value={code}
        onChange={(value) => {
          if (status === 'invalid') setStatus('idle');
          setCode(value);
          if (value.length === 6) void verifyCompleteCode(value);
        }}
        status={status}
        label={copy.verification.codeLabel}
        checkingAnnouncement={copy.verification.verifying}
        invalidAnnouncement={copy.verification.invalid}
        verifiedAnnouncement={copy.verification.verifiedLabel}
        disabled={resending}
        autoFocus
      />

      <p className="mt-6 text-center text-sm leading-5 text-muted-foreground">
        <span>{copy.verification.missing}</span>{' '}
        <Button
          type="button"
          variant="link"
          size="inline"
          onClick={resend}
          disabled={
            resending ||
            resendCooldown > 0 ||
            status === 'checking' ||
            status === 'verified'
          }
          aria-live="polite"
        >
          {resending
            ? copy.verification.sending
            : resendCooldown > 0
              ? t('auth.onboarding.verification.resendIn', {
                  seconds: resendCooldown,
                })
              : copy.verification.resend}
        </Button>
      </p>

    </div>
  );
}
