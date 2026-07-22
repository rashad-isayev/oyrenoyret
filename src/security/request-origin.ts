const LOCAL_DEVELOPMENT_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function parseConfiguredOrigin(): URL | null {
  const configured = process.env.NEXTAUTH_URL?.trim();
  if (!configured) return null;

  const url = new URL(configured);
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('NEXTAUTH_URL must contain only an origin.');
  }
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
    throw new Error('NEXTAUTH_URL must use HTTPS in production.');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('NEXTAUTH_URL must use HTTP or HTTPS.');
  }
  return url;
}

/** Returns the configured public origin without trusting proxy-controlled host headers. */
export function getTrustedAppOrigin(request?: Request): string {
  const configured = parseConfiguredOrigin();
  if (configured) return configured.origin;

  if (process.env.NODE_ENV !== 'production' && request) {
    const requestUrl = new URL(request.url);
    if (LOCAL_DEVELOPMENT_HOSTS.has(requestUrl.hostname)) return requestUrl.origin;
  }

  throw new Error('NEXTAUTH_URL is required and must be a valid public origin.');
}

/** Keeps a user-supplied navigation target on this application. */
export function sanitizeInternalPath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const candidate = value.trim();
  if (!candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\')) return null;

  try {
    const parsed = new URL(candidate, 'https://internal.invalid');
    if (parsed.origin !== 'https://internal.invalid') return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`.slice(0, 2_000);
  } catch {
    return null;
  }
}
