export const LOCALE_CONFIG = {
  en: {
    intlCode: 'en',
    nativeName: 'English',
    direction: 'ltr',
  },
  az: {
    intlCode: 'az-AZ',
    nativeName: 'Azərbaycan dili',
    direction: 'ltr',
  },
  tr: {
    intlCode: 'tr-TR',
    nativeName: 'Türkçe',
    direction: 'ltr',
  },
  ru: {
    intlCode: 'ru-RU',
    nativeName: 'Русский',
    direction: 'ltr',
  },
} as const;

export type Locale = keyof typeof LOCALE_CONFIG;

export const DEFAULT_LOCALE: Locale = 'az';
export const SUPPORTED_LOCALES = Object.keys(LOCALE_CONFIG) as Locale[];

export function isSupportedLocale(value?: string): value is Locale {
  return !!value && Object.prototype.hasOwnProperty.call(LOCALE_CONFIG, value);
}

export function normalizeLocale(value?: string): Locale {
  if (!value) return DEFAULT_LOCALE;

  const normalized = value.trim().toLowerCase();
  if (isSupportedLocale(normalized)) return normalized;

  const base = normalized.split(/[-_]/)[0];
  if (isSupportedLocale(base)) return base;

  return DEFAULT_LOCALE;
}

export function getLocaleCode(locale: Locale): string {
  return LOCALE_CONFIG[locale].intlCode;
}
