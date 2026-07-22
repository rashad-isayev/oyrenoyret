const ANNOUNCEMENT_KEY_SUFFIX =
  /^20\d{2}\/(?:0[1-9]|1[0-2])\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp)$/i;

export function getAnnouncementImageSrc(
  imageUrl?: string | null,
  expectedPrefix?: string,
): string | null {
  const raw = typeof imageUrl === 'string' ? imageUrl.trim() : '';
  if (!raw || !raw.startsWith('/api/uploads/announcements/file?key=')) return null;

  try {
    const parsed = new URL(raw, 'https://internal.invalid');
    if (parsed.origin !== 'https://internal.invalid' || parsed.pathname !== '/api/uploads/announcements/file') {
      return null;
    }
    if (parsed.hash || parsed.searchParams.getAll('key').length !== 1 || [...parsed.searchParams.keys()].length !== 1) {
      return null;
    }

    const key = parsed.searchParams.get('key') ?? '';
    const separator = key.lastIndexOf('/20');
    const prefix = separator >= 0 ? key.slice(0, separator) : '';
    const suffix = separator >= 0 ? key.slice(separator + 1) : '';
    if (!/^[a-z0-9_-]+(?:\/[a-z0-9_-]+)*$/i.test(prefix) || !ANNOUNCEMENT_KEY_SUFFIX.test(suffix)) {
      return null;
    }
    if (expectedPrefix && prefix !== expectedPrefix) return null;
    return raw;
  } catch {
    return null;
  }
}
