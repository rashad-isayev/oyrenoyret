import { NextResponse, type NextRequest } from 'next/server';
import { getTrustedAppOrigin } from '@/src/security/request-origin';
import { isTrustedWriteRequest } from '@/src/security/write-request';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Reject cross-origin browser writes before they reach API handlers. Route-level
 * authentication and authorization remain authoritative.
 */
export function proxy(request: NextRequest) {
  if (!UNSAFE_METHODS.has(request.method)) return NextResponse.next();

  let trustedOrigin: string;
  try {
    trustedOrigin = getTrustedAppOrigin(request);
  } catch {
    return NextResponse.json(
      { success: false, error: 'Request origin protection is not configured.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  if (
    !isTrustedWriteRequest(
      { headers: request.headers, pathname: request.nextUrl.pathname },
      trustedOrigin,
      process.env.CRON_SECRET,
    )
  ) {
    return NextResponse.json(
      { success: false, error: 'Cross-origin request rejected.' },
      {
        status: 403,
        headers: {
          'Cache-Control': 'no-store',
          Vary: 'Origin',
        },
      },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
