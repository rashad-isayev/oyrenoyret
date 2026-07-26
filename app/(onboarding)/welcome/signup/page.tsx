import { redirect } from 'next/navigation';
import { prisma } from '@/src/db/client';
import { getCurrentSession } from '@/src/modules/auth/utils/session';
import {
  canInteractWithPlatform,
  hasAcceptedCurrentGuidelines,
} from '@/src/modules/onboarding/account-setup-state';
import { RegistrationCompletionFlow } from '@/src/modules/onboarding/registration-completion-flow';

export const dynamic = 'force-dynamic';

export default async function WelcomeSignupPage() {
  const userId = await getCurrentSession();
  if (!userId) redirect('/welcome');

  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      email: true,
      emailVerifiedAt: true,
      guidelinesAcceptedAt: true,
      guidelinesVersion: true,
      accountOwnerType: true,
      tutorialCompletedAt: true,
      tutorialSkippedAt: true,
    },
  });
  if (!user) redirect('/login');
  if (canInteractWithPlatform(user)) {
    if (
      !user.tutorialCompletedAt &&
      !user.tutorialSkippedAt
    ) {
      redirect('/welcome/onboarding');
    }
    redirect('/dashboard');
  }

  return (
    <RegistrationCompletionFlow
      userId={userId}
      email={user.email}
      emailVerified={Boolean(user.emailVerifiedAt)}
      guidelinesAccepted={hasAcceptedCurrentGuidelines(user)}
      guardianManaged={user.accountOwnerType === 'GUARDIAN'}
    />
  );
}
