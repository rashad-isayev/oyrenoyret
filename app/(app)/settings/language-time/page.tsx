import { getSettingsPreferences } from '@/src/lib/settings-preferences-server';
import { LanguageTimeControls } from '@/src/components/settings/language-time-controls';
import { getI18n } from '@/src/i18n/server';
import { PageHeader } from '@/src/components/ui/page-header';
import { PageBody } from '@/src/components/ui/page-layout';

export default async function LanguageTimeSettingsPage() {
  const { language, timeFormat, timeZone } = await getSettingsPreferences();
  const { t } = await getI18n();
  return (
    <>
      <PageHeader
        badge={t('settings.languageTime.sectionLabel')}
        title={t('settings.languageTime.title')}
        description={t('settings.languageTime.subtitle')}
      />

      <PageBody spacing="compact">
        <LanguageTimeControls
          language={language}
          timeFormat={timeFormat}
          timeZone={timeZone}
        />
      </PageBody>
    </>
  );
}
