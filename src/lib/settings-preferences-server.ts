import { cookies } from 'next/headers';
import {
  LANGUAGE_COOKIE,
  TIME_FORMAT_COOKIE,
  TIME_ZONE_COOKIE,
  getSystemTimeZone,
  normalizeLanguage,
  normalizeTimeFormat,
  normalizeTimeZone,
} from '@/src/lib/settings-preferences';

export async function getSettingsPreferences() {
  const store = cookies();
  const cookieStore =
    typeof (store as { then?: unknown })?.then === 'function'
      ? await store
      : store;
  const getCookie =
    typeof (cookieStore as { get?: (key: string) => { value?: string } | undefined }).get ===
    'function'
      ? (cookieStore as { get: (key: string) => { value?: string } | undefined }).get.bind(
          cookieStore,
        )
      : undefined;
  return {
    language: normalizeLanguage(getCookie?.(LANGUAGE_COOKIE)?.value),
    timeFormat: normalizeTimeFormat(getCookie?.(TIME_FORMAT_COOKIE)?.value),
    timeZone:
      normalizeTimeZone(getCookie?.(TIME_ZONE_COOKIE)?.value) ?? getSystemTimeZone(),
  };
}
