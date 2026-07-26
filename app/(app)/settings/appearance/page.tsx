import { PiPalette as Palette } from 'react-icons/pi';
import { AppearanceModePicker } from '@/src/components/settings/appearance-mode-picker';
import { getI18n } from '@/src/i18n/server';
import { PageHeader } from '@/src/components/ui/page-header';
import { PageBody } from '@/src/components/ui/page-layout';

export default async function AppearanceSettingsPage() {
  const { t } = await getI18n();
  return (
    <>
      <PageHeader
        badge={t('settings.appearance.sectionLabel')}
        title={t('settings.appearance.title')}
        description={t('settings.appearance.subtitle')}
      />

      <PageBody spacing="compact">
      <section className="settings-panel space-y-3 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Palette className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">
              {t('settings.appearance.themeTitle')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('settings.appearance.themeDescription')}
            </p>
          </div>
        </div>
        <AppearanceModePicker />
      </section>
      </PageBody>
    </>
  );
}
