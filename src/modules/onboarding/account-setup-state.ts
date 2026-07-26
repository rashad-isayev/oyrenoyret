import { GUIDELINES_VERSION } from '../../config/constants.ts';

export type AccountSetupState =
  | 'verify-email'
  | 'accept-guidelines'
  | 'product-tour'
  | 'ready';

export type AccountActivationState =
  | 'verify-email'
  | 'accept-guidelines'
  | 'active';

export interface AccountSetupMilestones {
  emailVerifiedAt?: Date | string | null;
  guidelinesAcceptedAt?: Date | string | null;
  guidelinesVersion?: string | null;
  tutorialCompletedAt?: Date | string | null;
  tutorialSkippedAt?: Date | string | null;
}

export function hasAcceptedCurrentGuidelines(
  milestones: Pick<
    AccountSetupMilestones,
    'guidelinesAcceptedAt' | 'guidelinesVersion'
  >,
) {
  return Boolean(
    milestones.guidelinesAcceptedAt &&
      milestones.guidelinesVersion === GUIDELINES_VERSION,
  );
}

export function getAccountActivationState(
  milestones: AccountSetupMilestones,
): AccountActivationState {
  if (!milestones.emailVerifiedAt) return 'verify-email';
  if (!hasAcceptedCurrentGuidelines(milestones)) {
    return 'accept-guidelines';
  }
  return 'active';
}

/**
 * Derive setup state from durable milestones instead of one mutable step.
 * This keeps retries and interrupted sessions safe as the flow evolves.
 */
export function getAccountSetupState(
  milestones: AccountSetupMilestones,
): AccountSetupState {
  const activationState = getAccountActivationState(milestones);
  if (activationState !== 'active') return activationState;
  if (
    !milestones.tutorialCompletedAt &&
    !milestones.tutorialSkippedAt
  ) {
    return 'product-tour';
  }
  return 'ready';
}

export function canInteractWithPlatform(
  milestones: AccountSetupMilestones,
) {
  return getAccountActivationState(milestones) === 'active';
}

export const isAccountActivated = canInteractWithPlatform;
