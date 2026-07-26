/**
 * Rate Limiting Utility
 *
 * Provides rate limiting functionality to prevent abuse and DoS attacks.
 *
 * Implementation Notes:
 * - Uses Upstash Redis (distributed) when configured
 * - Falls back to in-memory fixed-window limiter in dev/test
 * - Use unique keys per endpoint + identifier (user ID or IP)
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import crypto from 'node:crypto';
import { isIP } from 'node:net';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  unavailable?: boolean;
}

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();
let lastCleanupAt = 0;
const CLEANUP_INTERVAL_MS = 60_000;

const hasUpstashUrl = Boolean(process.env.UPSTASH_REDIS_REST_URL);
const hasUpstashToken = Boolean(process.env.UPSTASH_REDIS_REST_TOKEN);
const hasUpstashConfig = hasUpstashUrl && hasUpstashToken;

const ratelimitCache = new Map<string, Ratelimit>();

function getRatelimiter(config: RateLimitConfig): Ratelimit | null {
  if (!hasUpstashConfig) return null;
  const key = `${config.maxRequests}:${config.windowMs}`;
  const existing = ratelimitCache.get(key);
  if (existing) return existing;

  const windowSeconds = Math.max(1, Math.ceil(config.windowMs / 1000));
  try {
    const limiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.fixedWindow(config.maxRequests, `${windowSeconds} s`),
      prefix: 'oyrenoyret:ratelimit',
    });
    ratelimitCache.set(key, limiter);
    return limiter;
  } catch {
    console.error('Distributed rate limiter configuration failed.');
    return null;
  }
}

function cleanupExpiredEntries(now: number) {
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) return;
  lastCleanupAt = now;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

export function getRateLimitIdentifierFromHeaders(
  headers: Headers,
  userId?: string | null
): string {
  if (userId) {
    return `user:${userId}`;
  }
  const ip = getTrustedClientIpFromHeaders(headers);
  if (!ip) return 'ip:unknown';
  const digest = crypto.createHash('sha256').update(ip).digest('base64url').slice(0, 22);
  return `ip:${digest}`;
}

const TRUSTED_IP_HEADERS = new Set([
  'x-vercel-forwarded-for',
  'cf-connecting-ip',
  'true-client-ip',
  'x-real-ip',
  'x-forwarded-for',
]);

function configuredClientIpHeader(): string | null {
  const configured = process.env.TRUSTED_PROXY_IP_HEADER?.trim().toLowerCase();
  if (configured) return TRUSTED_IP_HEADERS.has(configured) ? configured : null;
  if (process.env.VERCEL === '1') return 'x-vercel-forwarded-for';
  if (process.env.NODE_ENV !== 'production') return 'x-forwarded-for';
  return null;
}

export function getTrustedClientIpFromHeaders(headers: Headers): string | null {
  const headerName = configuredClientIpHeader();
  if (!headerName) return null;

  const raw = headers.get(headerName);
  if (!raw || raw.length > 512) return null;
  const values = raw.split(',').map((value) => value.trim()).filter(Boolean);
  const candidate = headerName === 'x-forwarded-for' || headerName === 'x-vercel-forwarded-for'
    ? values.at(-1)
    : values[0];
  return candidate && isIP(candidate) ? candidate : null;
}

export function getRateLimitIdentifier(request: Request, userId?: string | null): string {
  return getRateLimitIdentifierFromHeaders(request.headers, userId);
}

export function buildRateLimitResponse(result: RateLimitResult) {
  const retryAfterSeconds = Math.max(
    0,
    Math.ceil((result.resetAt.getTime() - Date.now()) / 1000)
  );
  return {
    status: result.unavailable ? 503 : 429,
    body: {
      error: result.unavailable
        ? 'Request protection is temporarily unavailable. Please try again later.'
        : 'Too many requests. Please try again later.',
      retryAfterSeconds,
    },
    headers: {
      'Retry-After': String(retryAfterSeconds),
    },
  };
}

/**
 * Checks if a request should be rate limited
 * @param identifier Unique identifier (IP, user ID, etc.)
 * @param config Rate limit configuration
 * @returns Rate limit result
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  if (process.env.NODE_ENV === 'production' && !hasUpstashConfig) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(Date.now() + 30_000),
      unavailable: true,
    };
  }

  const ratelimiter = getRatelimiter(config);
  if (ratelimiter) {
    try {
      const result = await ratelimiter.limit(identifier);
      return {
        allowed: result.success,
        remaining: Math.max(result.remaining ?? 0, 0),
        resetAt: new Date(result.reset),
      };
    } catch {
      if (process.env.NODE_ENV === 'production') {
        console.error('Distributed rate limiter request failed.');
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(Date.now() + 30_000),
          unavailable: true,
        };
      }
      console.warn('Rate limiter fallback to in-memory in non-production mode.');
    }
  }

  if (process.env.NODE_ENV === 'production') {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(Date.now() + 30_000),
      unavailable: true,
    };
  }

  const now = Date.now();
  cleanupExpiredEntries(now);

  const entry = rateLimitStore.get(identifier);

  if (!entry || entry.resetAt <= now) {
    const resetAt = now + config.windowMs;
    rateLimitStore.set(identifier, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: Math.max(config.maxRequests - 1, 0),
      resetAt: new Date(resetAt),
    };
  }

  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(entry.resetAt),
    };
  }

  entry.count += 1;

  return {
    allowed: true,
    remaining: Math.max(config.maxRequests - entry.count, 0),
    resetAt: new Date(entry.resetAt),
  };
}
