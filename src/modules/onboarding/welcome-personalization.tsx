'use client';

import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  PiArrowRight as ArrowRight,
  PiBookOpen as BookOpen,
  PiBriefcase as Briefcase,
  PiCheckBold as Check,
  PiClock as Clock,
  PiCompass as Compass,
  PiGauge as Gauge,
  PiLightbulb as Lightbulb,
  PiRocketLaunch as Rocket,
  PiShieldCheck as ShieldCheck,
} from 'react-icons/pi';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Logo } from '@/src/components/ui/logo';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldOptional,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { IntegerInput } from '@/components/ui/integer-input';
import { PasswordInput } from '@/src/modules/auth/components/password-input';
import { createOnboardingAccount } from '@/src/modules/auth/actions/registration';
import {
  createOnboardingAccountSchema,
  type LearningProfileInput,
  type OnboardingAccountInput,
} from '@/src/modules/auth/schemas/registration';
import { resolveAuthError } from '@/src/modules/auth/utils/resolve-auth-error';
import { useI18n } from '@/src/i18n/i18n-provider';
import { cn } from '@/src/lib/utils';
import { EmailVerificationStep } from './email-verification-step';
import { GuidelinesStep } from './guidelines-step';
import {
  WelcomeActionLabel,
  WelcomeHeading,
  WelcomeShell,
} from './welcome-shell';
import { WelcomeScienceLabs } from './welcome-science-labs';

const SIGNUP_STEPS = [
  'welcome',
  'motivation',
  'age',
  'pace',
  'credentials',
  'verification',
  'guidelines',
] as const;

type SignupStep = (typeof SIGNUP_STEPS)[number];

const SECTION_ONE_STEPS: SignupStep[] = [
  'motivation',
  'age',
  'pace',
];
const SECTION_TWO_STEPS: SignupStep[] = [
  'credentials',
  'verification',
  'guidelines',
];

const initialProfile: Partial<LearningProfileInput> = {};

function ChoiceCard({
  selected,
  icon: Icon,
  title,
  description,
  onClick,
}: {
  selected: boolean;
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      data-state={selected ? 'checked' : 'unchecked'}
      onClick={onClick}
      className={cn(
        'group flex min-h-32 flex-col items-start rounded-2xl border p-4 text-left transition-[background-color,border-color,box-shadow,transform] duration-150 active:scale-[0.99]',
        selected
          ? 'border-primary/55 bg-primary/[0.14]'
          : 'border-border/60 bg-secondary/75 hover:border-foreground/20 hover:bg-secondary',
      )}
    >
      <span className="flex w-full items-center justify-between">
        <span
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-xl bg-background text-muted-foreground transition-colors',
            selected && 'bg-primary/15 text-primary',
          )}
        >
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <span
          className={cn(
            'flex h-5 w-5 items-center justify-center rounded-full border transition-colors',
            selected
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background text-transparent',
          )}
        >
          <Check className="h-3 w-3" aria-hidden="true" />
        </span>
      </span>
      <span className="mt-4 text-sm font-semibold text-foreground">{title}</span>
      {description ? (
        <span className="mt-1 text-xs leading-5 text-muted-foreground">
          {description}
        </span>
      ) : null}
    </button>
  );
}

function CredentialsStep({
  profile,
  initialValues,
  onDraftCommit,
  onSuccess,
  onPendingChange,
}: {
  profile: LearningProfileInput;
  initialValues?: Partial<OnboardingAccountInput>;
  onDraftCommit: (data: OnboardingAccountInput) => void;
  onSuccess: (data: {
    userId: string;
    email: string;
    accountOwnerType: 'SELF' | 'GUARDIAN';
    codeSent: boolean;
  }) => void;
  onPendingChange: (pending: boolean) => void;
}) {
  const { t, messages } = useI18n();
  const copy = messages.auth.onboarding;
  const schema = useMemo(
    () => createOnboardingAccountSchema(messages.auth.validation),
    [messages.auth.validation],
  );
  const form = useForm<OnboardingAccountInput>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    shouldFocusError: true,
    defaultValues: {
      ...profile,
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      ...initialValues,
    } as OnboardingAccountInput,
  });
  const isGuardianManaged = profile.declaredAge < 16;

  const submit = async (data: OnboardingAccountInput) => {
    onDraftCommit(data);
    onPendingChange(true);
    try {
      const result = await createOnboardingAccount(data);
      if (!result.success) {
        toast.error(
          resolveAuthError(messages, t, copy.credentials.failed, result),
        );
        return;
      }
      if (!result.codeSent) toast.info(copy.verification.sendReminder);
      onSuccess(result);
    } catch {
      toast.error(copy.credentials.failed);
    } finally {
      onPendingChange(false);
    }
  };

  const fieldErrors = form.formState.errors;
  const supportId = 'onboarding-credentials-support';
  const visibleErrorField =
    form.formState.submitCount > 0
      ? (
          [
            'firstName',
            'email',
            'password',
            'confirmPassword',
          ] as const
        ).find((field) => Boolean(fieldErrors[field]))
      : undefined;
  const visibleError = visibleErrorField
    ? fieldErrors[visibleErrorField]
    : undefined;
  const isVisibleError = (
    field: 'firstName' | 'email' | 'password' | 'confirmPassword',
  ) => visibleErrorField === field;
  const describedBySupport = (
    field: 'firstName' | 'email' | 'password' | 'confirmPassword',
  ) =>
    isVisibleError(field) || (!visibleErrorField && field === 'password')
      ? supportId
      : undefined;

  return (
    <div>
      <WelcomeHeading
        title={copy.credentials.title}
        description={
          isGuardianManaged
            ? copy.credentials.guardianDescription
            : copy.credentials.selfDescription
        }
      />

      <form
        id="onboarding-credentials-form"
        onSubmit={form.handleSubmit(submit)}
        className="w-full space-y-4"
      >
        {isGuardianManaged ? (
          <div className="mb-4 flex items-start gap-3 rounded-xl bg-primary/[0.07] p-3.5 text-sm">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="leading-5 text-muted-foreground">
              {copy.credentials.guardianNotice}
            </p>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field invalid={isVisibleError('firstName')}>
            <FieldLabel htmlFor="onboarding-first-name">
              {copy.credentials.firstName}
            </FieldLabel>
            <Input
              id="onboarding-first-name"
              autoComplete="given-name"
              maxLength={50}
              aria-invalid={isVisibleError('firstName')}
              aria-describedby={describedBySupport('firstName')}
              {...form.register('firstName')}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="onboarding-last-name">
              {copy.credentials.lastName}
              <FieldOptional>{copy.optional}</FieldOptional>
            </FieldLabel>
            <Input
              id="onboarding-last-name"
              autoComplete="family-name"
              maxLength={50}
              {...form.register('lastName')}
            />
          </Field>
        </div>

        <Field invalid={isVisibleError('email')}>
          <FieldLabel htmlFor="onboarding-email">
            {isGuardianManaged
              ? copy.credentials.guardianEmail
              : copy.credentials.email}
          </FieldLabel>
          <Input
            id="onboarding-email"
            type="email"
            autoComplete="email"
            maxLength={254}
            aria-invalid={isVisibleError('email')}
            aria-describedby={describedBySupport('email')}
            {...form.register('email')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field invalid={isVisibleError('password')}>
            <FieldLabel htmlFor="onboarding-password">
              {copy.credentials.password}
            </FieldLabel>
            <PasswordInput
              id="onboarding-password"
              autoComplete="new-password"
              maxLength={72}
              aria-invalid={isVisibleError('password')}
              aria-describedby={describedBySupport('password')}
              {...form.register('password')}
            />
          </Field>
          <Field invalid={isVisibleError('confirmPassword')}>
            <FieldLabel htmlFor="onboarding-confirm-password">
              {copy.credentials.confirmPassword}
            </FieldLabel>
            <PasswordInput
              id="onboarding-confirm-password"
              autoComplete="new-password"
              maxLength={72}
              aria-invalid={isVisibleError('confirmPassword')}
              aria-describedby={describedBySupport('confirmPassword')}
              {...form.register('confirmPassword')}
            />
          </Field>
        </div>
        {visibleError ? (
          <FieldError id={supportId}>{visibleError.message}</FieldError>
        ) : (
          <FieldDescription id={supportId}>
            {copy.credentials.passwordHint}
          </FieldDescription>
        )}
      </form>
    </div>
  );
}

export function WelcomePersonalization() {
  const router = useRouter();
  const { messages } = useI18n();
  const copy = messages.auth.onboarding;
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState<SignupStep>('welcome');
  const [presentedStep, setPresentedStep] = useState<SignupStep>('welcome');
  const [profile, setProfile] = useState<Partial<LearningProfileInput>>(
    initialProfile,
  );
  const [ageDraft, setAgeDraft] = useState('');
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [guardianManaged, setGuardianManaged] = useState(false);
  const [credentialDraft, setCredentialDraft] =
    useState<OnboardingAccountInput | null>(null);
  const [verificationJustSent, setVerificationJustSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [guidelinesReady, setGuidelinesReady] = useState(false);
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(false);
  const [guardianGuidelinesAccepted, setGuardianGuidelinesAccepted] =
    useState(false);
  const [openRulesOnGuidelines, setOpenRulesOnGuidelines] = useState(false);
  const [transitioningToOnboarding, setTransitioningToOnboarding] =
    useState(false);

  const isStepTransitioning = step !== presentedStep;
  const section =
    SECTION_ONE_STEPS.includes(presentedStep) || presentedStep === 'welcome'
      ? 1
      : 2;
  const sectionSteps = section === 1 ? SECTION_ONE_STEPS : SECTION_TWO_STEPS;
  const sectionStepIndex = Math.max(0, sectionSteps.indexOf(presentedStep));
  const sectionProgress =
    presentedStep === 'welcome'
      ? 0
      : (sectionStepIndex + 1) / sectionSteps.length;
  const isSectionOneQuestion = SECTION_ONE_STEPS.includes(presentedStep);

  const canContinue = (() => {
    if (presentedStep === 'welcome') return true;
    if (presentedStep === 'motivation')
      return Boolean(profile.learningMotivation);
    if (presentedStep === 'age') return Boolean(profile.declaredAge);
    if (presentedStep === 'pace') return Boolean(profile.weeklyLearningGoal);
    return true;
  })();

  useEffect(() => {
    const syncSectionWithHistory = () => {
      const pathname = window.location.pathname;
      setStep((current) => {
        if (pathname === '/welcome' && SECTION_TWO_STEPS.includes(current)) {
          return 'pace';
        }
        if (pathname === '/welcome/signup' && current === 'pace') {
          return 'credentials';
        }
        return current;
      });
    };

    window.addEventListener('popstate', syncSectionWithHistory);
    return () => window.removeEventListener('popstate', syncSectionWithHistory);
  }, []);

  const goNext = () => {
    if (
      presentedStep === 'pace' &&
      window.location.pathname !== '/welcome/signup'
    ) {
      window.history.pushState(null, '', '/welcome/signup');
    }
    setStep((current) => {
      const index = SIGNUP_STEPS.indexOf(current);
      return SIGNUP_STEPS[Math.min(SIGNUP_STEPS.length - 1, index + 1)];
    });
  };

  const goBack = () => {
    setStep((current) => {
      const index = SIGNUP_STEPS.indexOf(current);
      return index > 0 ? SIGNUP_STEPS[index - 1] : current;
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

  const motivationOptions = [
    {
      value: 'school' as const,
      icon: BookOpen,
      title: copy.motivation.options.school,
    },
    {
      value: 'career' as const,
      icon: Briefcase,
      title: copy.motivation.options.career,
    },
    {
      value: 'curiosity' as const,
      icon: Lightbulb,
      title: copy.motivation.options.curiosity,
    },
    {
      value: 'confidence' as const,
      icon: Rocket,
      title: copy.motivation.options.confidence,
    },
  ];

  const paceOptions = [
    {
      value: 'light' as const,
      icon: Compass,
      title: copy.pace.options.light.title,
      description: copy.pace.options.light.description,
    },
    {
      value: 'steady' as const,
      icon: Gauge,
      title: copy.pace.options.steady.title,
      description: copy.pace.options.steady.description,
    },
    {
      value: 'ambitious' as const,
      icon: Rocket,
      title: copy.pace.options.ambitious.title,
      description: copy.pace.options.ambitious.description,
    },
  ];

  const footer = (() => {
    if (
      presentedStep === 'credentials' ||
      presentedStep === 'verification' ||
      presentedStep === 'guidelines'
    ) {
      const isCredentials = presentedStep === 'credentials';
      const isVerification = presentedStep === 'verification';
      const actionLabel = isCredentials
        ? copy.createAccount
        : isVerification
          ? copy.verification.doLater
          : transitioningToOnboarding
            ? copy.tour.next
            : copy.continue;

      return (
        <Button
          type={isVerification || transitioningToOnboarding ? 'button' : 'submit'}
          form={
            isCredentials
              ? 'onboarding-credentials-form'
              : isVerification
                ? undefined
                : 'onboarding-guidelines-form'
          }
          variant={isVerification ? 'secondary' : 'primary'}
          size="lg"
          disabled={
            pending ||
            (presentedStep === 'guidelines' && !guidelinesReady)
          }
          aria-disabled={
            transitioningToOnboarding || isStepTransitioning || undefined
          }
          onClick={
            isVerification ? () => router.push('/dashboard') : undefined
          }
          className={cn(
            'w-48 duration-300',
            (transitioningToOnboarding || isStepTransitioning) &&
              'pointer-events-none',
          )}
        >
          <WelcomeActionLabel
            identity={
              transitioningToOnboarding ? 'onboarding' : presentedStep
            }
          >
            {actionLabel}
          </WelcomeActionLabel>
        </Button>
      );
    }
    return (
      <Button
        type="button"
        size="lg"
        onClick={goNext}
        disabled={!canContinue}
        aria-disabled={isStepTransitioning || undefined}
        className={cn(
          'w-48',
          isStepTransitioning && 'pointer-events-none',
        )}
      >
        <WelcomeActionLabel
          identity={presentedStep === 'welcome' ? 'welcome' : 'continue'}
        >
          {presentedStep === 'welcome' ? copy.welcome.cta : copy.continue}
          <ArrowRight className="h-4 w-4" data-directional-arrow="forward" aria-hidden="true" />
        </WelcomeActionLabel>
      </Button>
    );
  })();

  return (
    <WelcomeShell
      phase={section === 1 ? 'personalization' : 'registration'}
      phaseProgress={sectionProgress}
      phaseLabel={
        section === 1
          ? copy.phaseLabels.personalization
          : copy.phaseLabels.registration
      }
      hideProgress={presentedStep === 'welcome'}
      progressLabel={copy.progressLabel}
      onBack={isSectionOneQuestion ? goBack : undefined}
      backDisabled={pending || isStepTransitioning}
      backLabel={copy.back}
      contentWidth={presentedStep === 'welcome' ? 'wide' : 'default'}
      footer={footer}
      footerActionPosition={
        presentedStep === 'verification'
          ? 'start'
          : presentedStep === 'guidelines' && transitioningToOnboarding
            ? 'center'
            : isSectionOneQuestion || presentedStep === 'guidelines'
              ? 'end'
              : 'center'
      }
      leadingFooterAction={
        presentedStep === 'guidelines' && !transitioningToOnboarding ? (
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
    >
      <AnimatePresence
        mode="wait"
        initial={false}
        onExitComplete={() => setPresentedStep(step)}
      >
        <motion.div
          key={step}
          initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
          animate={{
            opacity: transitioningToOnboarding ? 0 : 1,
            y: transitioningToOnboarding && !reduceMotion ? -8 : 0,
          }}
          exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
          transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
        >
          {step === 'welcome' ? (
            <section className="relative mx-auto flex w-full items-start sm:min-h-[480px] sm:items-center sm:py-2">
              <div className="grid w-full items-center gap-8 sm:grid-cols-[minmax(0,1fr)_304px] sm:gap-14">
                <div className="order-1 text-center sm:text-left">
                  <Logo
                    href={null}
                    size="md"
                    showText
                    textSize="lg"
                    priority
                    className="justify-center sm:justify-start"
                  />

                  <h1 className="mt-4 whitespace-pre-line text-[36px] leading-[1.08] tracking-[-0.05em] text-foreground sm:mt-5 sm:text-[48px]">
                    {copy.welcome.title}
                  </h1>
                  <p className="mx-auto mt-5 max-w-[36ch] text-pretty text-[15px] leading-7 text-muted-foreground sm:mx-0 sm:max-w-[540px] sm:text-base">
                    {copy.welcome.description}
                  </p>

                  <div className="mt-7 flex items-center justify-center gap-3 text-sm text-muted-foreground sm:justify-start">
                    <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
                    <span>{copy.welcome.time}</span>
                  </div>
                </div>

                <WelcomeScienceLabs copy={copy.welcome.scienceLabs} />
              </div>
            </section>
          ) : null}

          {step === 'motivation' ? (
            <div>
              <WelcomeHeading
                title={copy.motivation.title}
                description={copy.motivation.description}
              />
              <div
                className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
                role="radiogroup"
                aria-label={copy.motivation.title}
              >
                {motivationOptions.map((option) => (
                  <ChoiceCard
                    key={option.value}
                    selected={profile.learningMotivation === option.value}
                    icon={option.icon}
                    title={option.title}
                    onClick={() =>
                      setProfile((current) => ({
                        ...current,
                        learningMotivation: option.value,
                      }))
                    }
                  />
                ))}
              </div>
            </div>
          ) : null}

          {step === 'age' ? (
            <div>
              <WelcomeHeading
                title={copy.age.title}
                description={copy.age.description}
              />
              <Field measure="compact" className="mx-auto gap-0 text-center">
                <FieldLabel
                  htmlFor="onboarding-age"
                  className="sr-only"
                >
                  {copy.age.label}
                </FieldLabel>
                  <IntegerInput
                    id="onboarding-age"
                    fieldSize="prominent"
                    min={5}
                    max={100}
                    value={ageDraft}
                    onValueChange={(value, draft) => {
                      setAgeDraft(draft);
                      setProfile((current) => ({
                        ...current,
                        declaredAge: value,
                      }));
                    }}
                    aria-invalid={
                      ageDraft.length > 0 &&
                      profile.declaredAge === undefined
                    }
                    placeholder={copy.age.placeholder}
                    className="text-center font-semibold tabular-nums"
                  />
                {profile.declaredAge ? (
                  <div className="mt-4 rounded-xl bg-primary/[0.07] p-3 text-center text-sm leading-5 text-muted-foreground">
                    {profile.declaredAge < 16
                      ? copy.age.guardianNote
                      : copy.age.selfNote}
                  </div>
                ) : null}
              </Field>
            </div>
          ) : null}

          {step === 'pace' ? (
            <div>
              <WelcomeHeading
                title={copy.pace.title}
                description={copy.pace.description}
              />
              <div
                className="grid w-full gap-3 sm:grid-cols-3"
                role="radiogroup"
                aria-label={copy.pace.title}
              >
                {paceOptions.map((option) => (
                  <ChoiceCard
                    key={option.value}
                    selected={profile.weeklyLearningGoal === option.value}
                    icon={option.icon}
                    title={option.title}
                    description={option.description}
                    onClick={() =>
                      setProfile((current) => ({
                        ...current,
                        weeklyLearningGoal: option.value,
                      }))
                    }
                  />
                ))}
              </div>
            </div>
          ) : null}

          {step === 'credentials' ? (
            <CredentialsStep
              profile={profile as LearningProfileInput}
              initialValues={
                credentialDraft ?? undefined
              }
              onDraftCommit={setCredentialDraft}
              onPendingChange={setPending}
              onSuccess={(result) => {
                setUserId(result.userId);
                setEmail(result.email);
                setGuardianManaged(
                  result.accountOwnerType === 'GUARDIAN',
                );
                setVerificationJustSent(true);
                setStep('verification');
              }}
            />
          ) : null}

          {step === 'verification' && userId ? (
            <EmailVerificationStep
              userId={userId}
              email={email}
              initialResendCooldown={verificationJustSent ? 30 : 0}
              onChangeEmail={() => {
                setVerificationJustSent(false);
                setOpenRulesOnGuidelines(false);
                setStep('credentials');
              }}
              onPendingChange={setPending}
              onSuccess={() => {
                setOpenRulesOnGuidelines(true);
                setStep('guidelines');
              }}
            />
          ) : null}

          {step === 'guidelines' && userId ? (
            <GuidelinesStep
              userId={userId}
              guardianManaged={guardianManaged}
              accepted={guidelinesAccepted}
              onAcceptedChange={setGuidelinesAccepted}
              guardianAccepted={guardianGuidelinesAccepted}
              onGuardianAcceptedChange={setGuardianGuidelinesAccepted}
              openRulesInitially={openRulesOnGuidelines}
              onPendingChange={setPending}
              onReadyChange={setGuidelinesReady}
              onSuccess={leaveRules}
            />
          ) : null}
        </motion.div>
      </AnimatePresence>
    </WelcomeShell>
  );
}
