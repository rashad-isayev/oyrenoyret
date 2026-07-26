import { createTranslator as createNextIntlTranslator } from 'next-intl';
import type { MessageKey, Messages, TranslateVars } from '@/src/i18n';
import type { Locale } from '@/src/i18n/config';

export type IntlMessageCatalog = {
  [key: string]: string | IntlMessageCatalog;
};

function convertMessageValue(value: unknown): string | IntlMessageCatalog {
  if (typeof value === 'string') {
    // Existing catalogs use {{name}} placeholders. Convert them once at the
    // boundary so the source files can migrate gradually to native ICU syntax.
    return value.replace(/\{\{\s*(\w+)\s*\}\}/g, '{$1}');
  }

  if (Array.isArray(value)) {
    return Object.fromEntries(
      value.map((item, index) => [String(index), convertMessageValue(item)]),
    );
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, convertMessageValue(item)]),
    );
  }

  return String(value ?? '');
}

export function toIntlMessages(messages: Messages): IntlMessageCatalog {
  return convertMessageValue(messages) as IntlMessageCatalog;
}

export function createTranslator(
  locale: Locale,
  messages: Messages,
): (key: MessageKey, vars?: TranslateVars) => string {
  const translator = createNextIntlTranslator({
    locale,
    messages: toIntlMessages(messages),
    getMessageFallback: ({ key }) => key,
  });

  return (key, vars) => translator(key as never, vars as never);
}
