import { NextResponse } from 'next/server';
import { RATE_LIMITS } from '@/src/config/constants';
import { getPrivateNoStoreHeaders } from '@/src/lib/http-cache';
import {
  LANGUAGE_COOKIE,
  TIME_FORMAT_COOKIE,
  TIME_ZONE_COOKIE,
  normalizeLanguage,
  normalizeTimeFormat,
  normalizeTimeZone,
  type SettingsLanguage,
  type TimeFormat,
  type TimeZone,
} from '@/src/lib/settings-preferences';
import {
  buildRateLimitResponse,
  checkRateLimit,
  getRateLimitIdentifier,
} from '@/src/security/rateLimiter';
import { JSON_BODY_LIMITS, readJsonBody } from '@/src/security/json-body';

interface PreferencesPayload {
  language?: SettingsLanguage;
  timeFormat?: TimeFormat;
  timeZone?: TimeZone;
}

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function POST(request: Request) {
  const identifier = getRateLimitIdentifier(request);
  const rateLimit = await checkRateLimit(`settings:preferences:${identifier}`, RATE_LIMITS.GENERAL);
  if (!rateLimit.allowed) {
    const { status, body, headers } = buildRateLimitResponse(rateLimit);
    return NextResponse.json(body, { status, headers });
  }

  const bodyResult = await readJsonBody<PreferencesPayload>(
    request,
    JSON_BODY_LIMITS.SMALL,
  );
  if (!bodyResult.ok) {
    return NextResponse.json(
      { ok: false, error: bodyResult.error },
      {
        status: bodyResult.status,
        headers: getPrivateNoStoreHeaders(),
      },
    );
  }
  const body = bodyResult.value;
  const response = NextResponse.json({ ok: true }, { headers: getPrivateNoStoreHeaders() });

  if (body.language) {
    response.cookies.set(LANGUAGE_COOKIE, normalizeLanguage(body.language), {
      path: '/',
      sameSite: 'lax',
      maxAge: ONE_YEAR_SECONDS,
    });
  }

  if (body.timeFormat) {
    response.cookies.set(TIME_FORMAT_COOKIE, normalizeTimeFormat(body.timeFormat), {
      path: '/',
      sameSite: 'lax',
      maxAge: ONE_YEAR_SECONDS,
    });
  }

  if (body.timeZone !== undefined) {
    const timeZone = normalizeTimeZone(body.timeZone);
    if (!timeZone) {
      return NextResponse.json(
        { ok: false, error: 'INVALID_TIME_ZONE' },
        { status: 400, headers: getPrivateNoStoreHeaders() },
      );
    }

    response.cookies.set(TIME_ZONE_COOKIE, timeZone, {
      path: '/',
      sameSite: 'lax',
      maxAge: ONE_YEAR_SECONDS,
    });
  }

  return response;
}
