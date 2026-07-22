export function getDiscussionImageSrc(src?: string | null): string | null {
  const raw = typeof src === 'string' ? src.trim() : '';
  if (!raw || !raw.startsWith('/api/uploads/discussions/file?key=')) return null;

  try {
    const parsed = new URL(raw, 'https://internal.invalid');
    if (parsed.origin !== 'https://internal.invalid' || parsed.pathname !== '/api/uploads/discussions/file') {
      return null;
    }
    const key = parsed.searchParams.get('key') ?? '';
    return /^[a-z0-9_-]+(?:\/[a-z0-9_-]+)*\/20\d{2}\/(?:0[1-9]|1[0-2])\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp)$/i.test(key)
      ? raw
      : null;
  } catch {
    return null;
  }
}
