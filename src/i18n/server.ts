import 'server-only';

import { getSettingsPreferences } from '@/src/lib/settings-preferences-server';
import { normalizeLocale, type Locale } from '@/src/i18n';
import { loadMessages } from '@/src/i18n/load-messages';
import { createTranslator } from '@/src/i18n/message-format';

export async function getI18n(options?: { locale?: Locale | string }) {
  const requestedLocale = options?.locale ?? (await getSettingsPreferences()).language;
  const locale: Locale = normalizeLocale(requestedLocale);
  const messages = await loadMessages(locale);

  return {
    locale,
    messages,
    t: createTranslator(locale, messages),
  };
}
