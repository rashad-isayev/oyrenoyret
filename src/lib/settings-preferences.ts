import { normalizeLocale, type Locale } from '@/src/i18n';

export const LANGUAGE_COOKIE = 'oy_lang';
export const TIME_FORMAT_COOKIE = 'oy_time_format';
export const TIME_ZONE_COOKIE = 'oy_time_zone';

export type SettingsLanguage = Locale;

export const TIME_FORMATS = ['auto', '12-hour', '24-hour'] as const;
export type TimeFormat = (typeof TIME_FORMATS)[number];
export type TimeZone = string;


export function normalizeLanguage(value?: string): SettingsLanguage {
  return normalizeLocale(value);
}

export function normalizeTimeFormat(value?: string): TimeFormat {
  if (value === '12-hour' || value === '24-hour') return value;
  return 'auto';
}

export function normalizeTimeZone(value?: unknown): TimeZone | undefined {
  if (typeof value !== 'string') return undefined;

  const candidate = value.trim();
  if (!candidate || candidate.length > 100) return undefined;

  try {
    return new Intl.DateTimeFormat('en', { timeZone: candidate }).resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

export function getSystemTimeZone(): TimeZone {
  const timeZone = normalizeTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  if (!timeZone) {
    throw new RangeError('The current runtime did not provide a valid IANA time zone.');
  }
  return timeZone;
}
