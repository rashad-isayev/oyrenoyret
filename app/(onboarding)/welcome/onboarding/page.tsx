import { redirect } from 'next/navigation';
import { prisma } from '@/src/db/client';
import { getCurrentSession } from '@/src/modules/auth/utils/session';
import { canInteractWithPlatform } from '@/src/modules/onboarding/account-setup-state';
import { PlatformOnboarding } from '@/src/modules/onboarding/platform-onboarding';

export const dynamic = 'force-dynamic';

export default async function WelcomeOnboardingPage() {
  const userId = await getCurrentSession();
  if (!userId) redirect('/login');

  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      status: true,
      role: true,
      emailVerifiedAt: true,
      guidelinesAcceptedAt: true,
      guidelinesVersion: true,
      tutorialStep: true,
      tutorialCompletedAt: true,
      tutorialSkippedAt: true,
    },
  });
  if (!user) redirect('/login');
  if (!canInteractWithPlatform(user)) {
    redirect('/dashboard');
  }
  if (user.status !== 'ACTIVE') redirect('/dashboard');
  if (
    user.role === 'ADMIN' ||
    user.role === 'TEACHER' ||
    user.tutorialCompletedAt ||
    user.tutorialSkippedAt
  ) {
    redirect('/dashboard');
  }

  return <PlatformOnboarding initialStep={user.tutorialStep} />;
}
