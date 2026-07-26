import { getRequestConfig } from 'next-intl/server';
import { loadMessages } from '@/src/i18n/load-messages';
import { toIntlMessages } from '@/src/i18n/message-format';
import { getSettingsPreferences } from '@/src/lib/settings-preferences-server';

export default getRequestConfig(async () => {
  const { language: locale, timeZone } = await getSettingsPreferences();
  const messages = await loadMessages(locale);

  return {
    locale,
    messages: toIntlMessages(messages),
    timeZone,
  };
});
