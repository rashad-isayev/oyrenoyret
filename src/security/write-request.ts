import { hasValidBearerSecret } from './bearer-secret.ts';

type WriteRequestLike = {
  headers: Pick<Headers, 'get'>;
  pathname: string;
};

/**
 * Browser writes must come from the configured application origin. Cron calls
 * are the only origin-less exception and still require the exact bearer secret.
 */
export function isTrustedWriteRequest(
  request: WriteRequestLike,
  trustedOrigin: string,
  cronSecret: string | undefined,
): boolean {
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');

  if (origin === trustedOrigin || (!origin && fetchSite === 'same-origin')) return true;

  return (
    request.pathname.startsWith('/api/cron/') &&
    !origin &&
    hasValidBearerSecret(request.headers.get('authorization'), cronSecret)
  );
}
