import {
  PiUserCircle as UserCircle,
  PiEnvelopeSimple as Mail,
  PiLockKey as LockKey,
} from 'react-icons/pi';
import { getI18n } from '@/src/i18n/server';
import { getCurrentSession } from '@/src/modules/auth/utils/session';
import { prisma } from '@/src/db/client';
import { PageHeader } from '@/src/components/ui/page-header';
import { PageBody } from '@/src/components/ui/page-layout';
import { AccountProfileForm } from '@/src/components/settings/account-profile-form';
import { AccountEmailForm } from '@/src/components/settings/account-email-form';
import { AccountPasswordForm } from '@/src/components/settings/account-password-form';
import { AVATAR_VARIANTS, type AvatarVariant } from '@/src/lib/avatar';
import { hasAcceptedCurrentGuidelines } from '@/src/modules/onboarding/account-setup-state';

export default async function MyAccountSettingsPage() {
  const { t } = await getI18n();
  const userId = await getCurrentSession();
  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      firstName: true,
      lastName: true,
      avatarVariant: true,
      email: true,
      role: true,
      emailVerifiedAt: true,
      guidelinesAcceptedAt: true,
      guidelinesVersion: true,
      passwordHash: true,
    },
  });

  if (!user) return null;
  const requiresEmailVerification = !user.emailVerifiedAt;
  const canWrite =
    !requiresEmailVerification && hasAcceptedCurrentGuidelines(user);
  const hasPassword = Boolean(user.passwordHash);
  const avatarVariant: AvatarVariant = AVATAR_VARIANTS.includes(user.avatarVariant as AvatarVariant)
    ? (user.avatarVariant as AvatarVariant)
    : 'regular';

  return (
    <>
      <PageHeader
        badge={t('settings.myAccount.sectionLabel')}
        title={t('settings.myAccount.title')}
        description={t('settings.myAccount.subtitle')}
      />

      <PageBody spacing="compact">
        <div className="settings-panel p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UserCircle className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {t('settings.myAccount.profileTitle')}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('settings.myAccount.profileDescription')}
              </p>
            </div>
          </div>
          <div className="mt-3">
            <AccountProfileForm
              initialFirstName={user.firstName}
              initialLastName={user.lastName}
              initialAvatarVariant={avatarVariant}
              canWrite={canWrite}
            />
          </div>
        </div>

        <div className="settings-panel p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Mail className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {t('settings.myAccount.contactTitle')}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('settings.myAccount.contactDescription')}
              </p>
            </div>
          </div>
          <div className="mt-3">
            <AccountEmailForm
              currentEmail={user.email}
              hasPassword={hasPassword}
              requiresEmailVerification={requiresEmailVerification}
              canWrite={canWrite}
            />
          </div>
        </div>

        <div className="settings-panel p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <LockKey className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {t('settings.myAccount.passwordTitle')}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('settings.myAccount.passwordDescription')}
              </p>
            </div>
          </div>
          <div className="mt-3">
            <AccountPasswordForm canWrite={canWrite} hasPassword={hasPassword} />
          </div>
        </div>
      </PageBody>
    </>
  );
}
