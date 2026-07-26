const AUTHENTICATED_MEDIA_FILE_PATH = '/api/uploads/discussions/file';
const AUTHENTICATED_MEDIA_RETRY_PARAM = '_media_attempt';

/**
 * Private media can race a newly established session or an object becoming
 * readable immediately after upload. Keep retry policy centralized and
 * bounded so every protected image recovers consistently without reloads.
 */
export const AUTHENTICATED_MEDIA_RETRY_DELAYS_MS = [250, 750] as const;

/**
 * Authenticated upload routes must be requested by the browser so its session
 * cookie is included. Passing these URLs through Next's image optimizer makes
 * the optimizer fetch them without the viewer's authenticated request context.
 */
export function isAuthenticatedMediaSrc(src: string): boolean {
  const raw = src.trim();
  if (!raw.startsWith(AUTHENTICATED_MEDIA_FILE_PATH)) return false;

  try {
    const parsed = new URL(raw, 'https://internal.invalid');
    return (
      parsed.origin === 'https://internal.invalid' &&
      parsed.pathname === AUTHENTICATED_MEDIA_FILE_PATH
    );
  } catch {
    return false;
  }
}

export function getAuthenticatedMediaRetrySrc(
  src: string,
  attempt: number,
): string {
  if (attempt <= 0) return src;
  const parsed = new URL(src, 'https://internal.invalid');
  parsed.searchParams.set(AUTHENTICATED_MEDIA_RETRY_PARAM, String(attempt));
  return `${parsed.pathname}${parsed.search}`;
}
