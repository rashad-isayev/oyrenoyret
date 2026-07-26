import { redirect } from 'next/navigation';
import { prisma } from '@/src/db/client';
import { WelcomePersonalization } from '@/src/modules/onboarding/welcome-personalization';
import { getCurrentSession } from '@/src/modules/auth/utils/session';
import { canInteractWithPlatform } from '@/src/modules/onboarding/account-setup-state';

export const dynamic = 'force-dynamic';

export default async function WelcomePage() {
  const sessionUserId = await getCurrentSession();
  if (sessionUserId) {
    const user = await prisma.user.findFirst({
      where: { id: sessionUserId, deletedAt: null },
      select: {
        emailVerifiedAt: true,
        guidelinesAcceptedAt: true,
        guidelinesVersion: true,
        tutorialCompletedAt: true,
        tutorialSkippedAt: true,
      },
    });
    if (!user) redirect('/login');
    if (canInteractWithPlatform(user)) {
      if (!user.tutorialCompletedAt && !user.tutorialSkippedAt) {
        redirect('/welcome/onboarding');
      }
      redirect('/dashboard');
    }

    redirect('/welcome/signup');
  }

  return <WelcomePersonalization />;
}
