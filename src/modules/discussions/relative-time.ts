import { getLocaleCode, type Locale } from '@/src/i18n';

export function formatRelativeTime(
  dateStr: string,
  locale: Locale = 'en',
  timeZone?: string,
): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const formatter = new Intl.RelativeTimeFormat(getLocaleCode(locale), { numeric: 'auto' });

  if (diffSec < 60) return formatter.format(0, 'second');
  if (diffMin < 60) return formatter.format(-diffMin, 'minute');
  if (diffHour < 24) return formatter.format(-diffHour, 'hour');
  if (diffDay < 7) return formatter.format(-diffDay, 'day');
  return date.toLocaleDateString(getLocaleCode(locale), {
    timeZone,
    month: 'short',
    day: 'numeric',
  });
}
