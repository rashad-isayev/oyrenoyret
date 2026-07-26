import 'server-only';

import type { Locale } from '@/src/i18n/config';
import type { Messages } from '@/src/i18n';

const MESSAGE_LOADERS: Record<Locale, () => Promise<Messages>> = {
  en: () =>
    import('@/src/i18n/messages/en').then((module) => module.EN_MESSAGES),
  az: () =>
    import('@/src/i18n/messages/az').then((module) => module.AZ_MESSAGES),
  tr: () =>
    import('@/src/i18n/messages/tr').then((module) => module.TR_MESSAGES),
  ru: () =>
    import('@/src/i18n/messages/ru').then((module) => module.RU_MESSAGES),
};

export function loadMessages(locale: Locale): Promise<Messages> {
  return MESSAGE_LOADERS[locale]();
}
