/**
 * Admin Layout
 *
 * Forces English language rules for typography (e.g., CSS uppercase)
 * regardless of the user's preferred locale.
 */
import { I18nProvider } from '@/src/i18n/i18n-provider';
import { getI18n } from '@/src/i18n/server';
import { getSettingsPreferences } from '@/src/lib/settings-preferences-server';
import { redirect } from 'next/navigation';
import { prisma } from '@/src/db/client';
import { getCurrentSession } from '@/src/modules/auth/utils/session';
import { isAdmin } from '@/src/lib/permissions';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const userId = await getCurrentSession();
  if (!userId) redirect('/login');

  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { role: true, status: true },
  });
  if (!user || !isAdmin(user.role) || user.status !== 'ACTIVE') {
    redirect('/dashboard');
  }

  const { messages } = await getI18n({ locale: 'en' });
  const { timeZone } = await getSettingsPreferences();

  return (
    <I18nProvider locale="en" messages={messages} timeZone={timeZone}>
      <div lang="en">{children}</div>
    </I18nProvider>
  );
}
