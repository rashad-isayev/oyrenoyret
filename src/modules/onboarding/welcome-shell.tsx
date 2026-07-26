'use client';

import type { ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { PiArrowLeft as ArrowLeft } from 'react-icons/pi';
import { Button } from '@/components/ui/button';
import { cn } from '@/src/lib/utils';

export type WelcomePhase =
  | 'personalization'
  | 'registration'
  | 'onboarding';

interface WelcomeShellProps {
  children: ReactNode;
  footer: ReactNode;
  phase: WelcomePhase;
  phaseProgress: number;
  phaseLabel: string;
  hideProgress?: boolean;
  onBack?: () => void;
  backDisabled?: boolean;
  backLabel?: string;
  progressLabel: string;
  footerActionPosition?: 'start' | 'center' | 'end';
  leadingFooterAction?: ReactNode;
  footerFullWidth?: boolean;
  contentWidth?: 'default' | 'wide';
}

export function WelcomeHeading({
  title,
  description,
  className,
}: {
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <header className={cn('mb-6 w-full text-center', className)}>
      <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.035em] sm:text-[32px] sm:leading-10">
        {title}
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </header>
  );
}

export function WelcomeActionLabel({
  identity,
  children,
}: {
  identity: string;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <span className="grid min-w-[7.5rem] place-items-center">
      <AnimatePresence initial={false}>
        <motion.span
          key={identity}
          initial={{ opacity: 0, x: reduceMotion ? 0 : 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: reduceMotion ? 0 : -8 }}
          transition={{
            duration: reduceMotion ? 0 : 0.2,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="col-start-1 row-start-1 flex items-center justify-center gap-2"
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/**
 * The welcome-flow layout contract.
 *
 * Authentication remains a compact centered form. Onboarding instead reserves
 * independent rows for progress, focused content, and persistent actions so
 * moving between short questions never shifts the primary button.
 */
const PHASE_INDEX: Record<WelcomePhase, number> = {
  personalization: 1,
  registration: 2,
  onboarding: 3,
};

export function WelcomeShell({
  children,
  footer,
  phase,
  phaseProgress,
  phaseLabel,
  hideProgress = false,
  onBack,
  backDisabled = false,
  backLabel = 'Go back',
  progressLabel,
  footerActionPosition = 'end',
  leadingFooterAction,
  footerFullWidth = false,
  contentWidth = 'default',
}: WelcomeShellProps) {
  const reduceMotion = useReducedMotion();
  const phaseIndex = PHASE_INDEX[phase];
  const boundedProgress = Math.max(0, Math.min(1, phaseProgress));

  return (
    <div className="grid h-[100dvh] grid-rows-[72px_minmax(0,1fr)_auto] overflow-hidden bg-background text-foreground">
      <header className="relative z-20 bg-background/95 px-5 backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex h-[72px] w-full max-w-[680px] items-center">
          {!hideProgress ? (
            <div
              className="grid w-full grid-cols-3 gap-1.5 sm:gap-2"
              role="progressbar"
              aria-label={progressLabel}
              aria-valuemin={0}
              aria-valuemax={3}
              aria-valuenow={phaseIndex - 1 + boundedProgress}
              aria-valuetext={phaseLabel}
            >
              {[1, 2, 3].map((segment) => {
                const fill =
                  segment < phaseIndex
                    ? 100
                    : segment === phaseIndex
                      ? boundedProgress * 100
                      : 0;
                return (
                  <span
                    key={segment}
                    className="h-1.5 overflow-hidden rounded-full bg-secondary"
                    aria-hidden="true"
                  >
                    <span
                      className="block h-full rounded-full bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none"
                      style={{ width: `${fill}%` }}
                    />
                  </span>
                );
              })}
            </div>
          ) : (
            <div aria-hidden="true" />
          )}
        </div>
      </header>

      <main className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-8 pt-5 sm:px-8 sm:pb-10 sm:pt-[clamp(2.5rem,9vh,6rem)]">
        <div
          className={cn(
            'mx-auto w-full',
            contentWidth === 'wide' ? 'max-w-[820px]' : 'max-w-[680px]',
          )}
        >
          {children}
        </div>
      </main>

      <footer className="relative z-20 border-t border-border/50 bg-background/95 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl sm:px-8">
        <div className="relative mx-auto min-h-11 w-full max-w-[680px]">
          <div className="absolute inset-y-0 left-0 flex min-w-0 items-center">
            <AnimatePresence initial={false} mode="wait">
              {onBack ? (
                <motion.div
                  key="back"
                  initial={{ opacity: 0, x: reduceMotion ? 0 : -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: reduceMotion ? 0 : -8 }}
                  transition={{ duration: reduceMotion ? 0 : 0.16 }}
                >
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    onClick={onBack}
                    disabled={backDisabled}
                  >
                    <ArrowLeft className="h-4 w-4" data-directional-arrow="backward" aria-hidden="true" />
                    {backLabel}
                  </Button>
                </motion.div>
              ) : leadingFooterAction ? (
                <motion.div
                  key="leading-action"
                  initial={{ opacity: 0, x: reduceMotion ? 0 : -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: reduceMotion ? 0 : -8 }}
                  transition={{
                    duration: reduceMotion ? 0 : 0.16,
                    delay: reduceMotion ? 0 : 0.1,
                  }}
                >
                  {leadingFooterAction}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {footerFullWidth ? (
            <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2">
              {footer}
            </div>
          ) : (
            <motion.div
              initial={false}
              animate={{
                left:
                  footerActionPosition === 'start'
                    ? '0%'
                    : footerActionPosition === 'center'
                      ? '50%'
                      : '100%',
                x:
                  footerActionPosition === 'start'
                    ? '0%'
                    : footerActionPosition === 'center'
                      ? '-50%'
                      : '-100%',
                y: '-50%',
              }}
              transition={{
                duration: reduceMotion ? 0 : 0.34,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="welcome-primary-action absolute top-1/2 flex min-w-0 items-center gap-2"
              data-footer-action-position={footerActionPosition}
            >
              {footer}
            </motion.div>
          )}
        </div>
      </footer>
    </div>
  );
}
