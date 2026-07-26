'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  PiArrowRight as ArrowRight,
  PiSkipForward as SkipForward,
} from 'react-icons/pi';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/src/i18n/i18n-provider';
import {
  WelcomeActionLabel,
  WelcomeHeading,
  WelcomeShell,
} from './welcome-shell';
import {
  CompletePreview,
  FeedPreview,
  PreferencesPreview,
  TracksPreview,
} from './platform-onboarding-previews';

const TOUR_STEP_COUNT = 4;

function TourSkipButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="lg"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="w-11 px-0 sm:w-auto sm:px-5"
    >
      <SkipForward className="h-4 w-4 sm:hidden" aria-hidden="true" />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}

export function PlatformOnboarding({
  initialStep = 0,
}: {
  initialStep?: number;
}) {
  const reduceMotion = useReducedMotion();
  const { messages } = useI18n();
  const copy = messages.auth.onboarding.tour;
  const [stepIndex, setStepIndex] = useState(
    Math.max(0, Math.min(TOUR_STEP_COUNT - 1, initialStep)),
  );
  const [pending, setPending] = useState(false);

  const steps = [
    {
      title: copy.feed.title,
      description: copy.feed.description,
      visual: <FeedPreview />,
    },
    {
      title: copy.tracks.title,
      description: copy.tracks.description,
      visual: <TracksPreview />,
    },
    {
      title: copy.preferences.title,
      description: copy.preferences.description,
      visual: <PreferencesPreview />,
    },
    {
      title: copy.complete.title,
      description: copy.complete.description,
      visual: <CompletePreview />,
    },
  ];
  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  const saveProgress = async (nextStep: number) => {
    const response = await fetch('/api/onboarding/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ step: nextStep }),
    });
    if (!response.ok) throw new Error('PROGRESS_SAVE_FAILED');
  };

  const finish = async (action: 'complete' | 'skip') => {
    const response = await fetch('/api/onboarding/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action }),
    });
    if (!response.ok) throw new Error('ONBOARDING_FINISH_FAILED');
    window.location.assign('/dashboard');
  };

  const handleNext = async () => {
    if (pending) return;
    if (isLast) {
      setPending(true);
      try {
        await finish('complete');
      } catch {
        toast.error(copy.saveFailed);
        setPending(false);
      }
      return;
    }

    const next = stepIndex + 1;
    setStepIndex(next);
    void saveProgress(next).catch(() => {
      toast.error(copy.saveFailed);
    });
  };

  const handleSkip = async () => {
    if (pending) return;
    setPending(true);
    try {
      await finish('skip');
    } catch {
      toast.error(copy.saveFailed);
      setPending(false);
    }
  };

  const stepContent = (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={stepIndex}
        initial={{ opacity: 0, x: reduceMotion ? 0 : 12 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: reduceMotion ? 0 : -12 }}
        transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
      >
        <WelcomeHeading
          title={step.title}
          description={step.description}
          className="mb-5"
        />
        {step.visual}
      </motion.div>
    </AnimatePresence>
  );

  const primaryAction = (
    <Button
      type="button"
      size="lg"
      onClick={handleNext}
      disabled={pending}
      className="w-48"
    >
      <WelcomeActionLabel
        identity={isLast ? 'complete' : 'continue'}
      >
        {isLast ? copy.complete.cta : copy.next}
        {!isLast ? (
          <ArrowRight
            className="h-4 w-4"
            data-directional-arrow="forward"
            aria-hidden="true"
          />
        ) : null}
      </WelcomeActionLabel>
    </Button>
  );

  const footerActions = (
    <div className="pointer-events-none relative h-11 w-full">
      <AnimatePresence initial={false}>
        {!isLast ? (
          <motion.div
            key="tour-skip"
            initial={false}
            animate={{
              left: stepIndex === 0 ? '0%' : '100%',
              x:
                stepIndex === 0
                  ? '0%'
                  : 'calc(-100% - 12.5rem)',
              y: '-50%',
              opacity: 1,
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: reduceMotion ? 0 : 0.34,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="pointer-events-auto absolute top-1/2"
            data-tour-action-position={stepIndex === 0 ? 'start' : 'end-adjacent'}
          >
            <TourSkipButton
              label={copy.skip}
              onClick={() => void handleSkip()}
              disabled={pending}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.div
        initial={false}
        animate={{
          left: stepIndex === 0 ? '50%' : '100%',
          x: stepIndex === 0 ? '-50%' : '-100%',
          y: '-50%',
        }}
        transition={{
          duration: reduceMotion ? 0 : 0.34,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="welcome-primary-action pointer-events-auto absolute top-1/2"
        data-tour-action-position={stepIndex === 0 ? 'center' : 'end'}
      >
        {primaryAction}
      </motion.div>
    </div>
  );

  return (
    <WelcomeShell
      phase="onboarding"
      phaseProgress={(stepIndex + 1) / steps.length}
      phaseLabel={messages.auth.onboarding.phaseLabels.onboarding}
      progressLabel={messages.auth.onboarding.progressLabel}
      onBack={
        stepIndex > 0
          ? () => setStepIndex((current) => Math.max(0, current - 1))
          : undefined
      }
      backDisabled={pending}
      backLabel={copy.back}
      footerFullWidth
      footer={footerActions}
    >
      {stepContent}
    </WelcomeShell>
  );
}
