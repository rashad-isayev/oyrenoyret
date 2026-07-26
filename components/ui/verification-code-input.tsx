'use client';

import { useId } from 'react';
import { cn } from '@/src/lib/utils';

export type VerificationCodeStatus =
  | 'idle'
  | 'checking'
  | 'invalid'
  | 'verified';

interface VerificationCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  status?: VerificationCodeStatus;
  label: string;
  checkingAnnouncement: string;
  invalidAnnouncement: string;
  verifiedAnnouncement: string;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}

/**
 * One semantic OTP field with six visual cells.
 *
 * A single native input preserves paste, password-manager, mobile keyboard,
 * and `autocomplete="one-time-code"` behavior while the visual layer provides
 * the six-cell verification treatment.
 */
export function VerificationCodeInput({
  value,
  onChange,
  status = 'idle',
  label,
  checkingAnnouncement,
  invalidAnnouncement,
  verifiedAnnouncement,
  disabled = false,
  autoFocus = false,
  className,
}: VerificationCodeInputProps) {
  const inputId = useId();
  const statusId = useId();
  const digits = Array.from({ length: 6 }, (_, index) => value[index] ?? '');
  const activeIndex = Math.min(value.length, 5);
  const announcement =
    status === 'checking'
      ? checkingAnnouncement
      : status === 'invalid'
        ? invalidAnnouncement
        : status === 'verified'
          ? verifiedAnnouncement
          : '';

  return (
    <div
      className={cn(
        'verification-code-field relative mx-auto w-full max-w-[360px]',
        className,
      )}
    >
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <input
        id={inputId}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        value={value}
        autoFocus={autoFocus}
        disabled={disabled}
        readOnly={status === 'checking' || status === 'verified'}
        aria-busy={status === 'checking' || undefined}
        aria-invalid={status === 'invalid'}
        aria-describedby={statusId}
        onChange={(event) => {
          if (status === 'checking' || status === 'verified') return;
          onChange(event.target.value.replace(/\D/g, '').slice(0, 6));
        }}
        className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0 disabled:cursor-not-allowed"
      />

      <div
        className={cn(
          'grid grid-cols-6 gap-2 transition-transform duration-150 motion-reduce:transform-none',
          status === 'invalid' && 'animate-[verification-shake_180ms_ease-out]',
        )}
        aria-hidden="true"
      >
        {digits.map((digit, index) => {
          const active = status === 'idle' && index === activeIndex;
          return (
            <span
              key={index}
              className={cn(
                'flex h-14 items-center justify-center rounded-xl border bg-secondary text-xl font-semibold tabular-nums transition-[border-color,background-color,box-shadow,color] duration-150',
                status === 'invalid'
                  ? 'border-transparent bg-destructive/[0.14] text-destructive'
                  : status === 'verified'
                    ? 'border-transparent bg-[hsl(var(--success))]/[0.16] text-[hsl(var(--success))]'
                    : status === 'checking'
                      ? 'border-transparent bg-primary/[0.12] text-foreground'
                      : digit
                        ? 'border-foreground/25 bg-background text-foreground'
                        : 'border-border/70 text-muted-foreground',
                active && 'verification-code-active',
              )}
            >
              {digit}
            </span>
          );
        })}
      </div>

      <span id={statusId} role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </div>
  );
}
