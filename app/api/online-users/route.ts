import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/src/modules/auth/utils/session';
import { RATE_LIMITS } from '@/src/config/constants';
import { getPrivateNoStoreHeaders } from '@/src/lib/http-cache';
import { buildRateLimitResponse, checkRateLimit, getRateLimitIdentifier } from '@/src/security/rateLimiter';
import { getOnlineCount, touchOnlineUser } from '@/src/lib/online-users';
import { requirePlatformContentAccess } from '@/src/modules/auth/utils/write-access';

export async function GET(request: Request) {
  const identifier = getRateLimitIdentifier(request);
  const rateLimit = await checkRateLimit(`online-users:read:${identifier}`, RATE_LIMITS.GENERAL);
  if (!rateLimit.allowed) {
    const { status, body, headers } = buildRateLimitResponse(rateLimit);
    return NextResponse.json(body, { status, headers });
  }

  let count = 0;
  try {
    count = await getOnlineCount();
  } catch (error) {
    console.error('[online-users] Failed to read online count:', error);
  }
  return NextResponse.json({ count }, { headers: getPrivateNoStoreHeaders() });
}

export async function POST(request: Request) {
  const userId = await getCurrentSession();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const contentAccess = await requirePlatformContentAccess(userId);
  if (!contentAccess.ok) {
    return NextResponse.json(
      {
        error: 'error' in contentAccess ? contentAccess.error : 'Unauthorized',
        errorKey: contentAccess.errorKey,
      },
      { status: contentAccess.status, headers: getPrivateNoStoreHeaders() },
    );
  }

  const identifier = getRateLimitIdentifier(request, userId);
  const rateLimit = await checkRateLimit(`online-users:touch:${identifier}`, RATE_LIMITS.GENERAL);
  if (!rateLimit.allowed) {
    const { status, body, headers } = buildRateLimitResponse(rateLimit);
    return NextResponse.json(body, { status, headers });
  }

  let count = 0;
  try {
    count = await touchOnlineUser(userId);
  } catch (error) {
    console.error('[online-users] Failed to touch presence:', error);
  }
  return NextResponse.json({ count }, { headers: getPrivateNoStoreHeaders() });
}
