import assert from 'node:assert/strict';
import test from 'node:test';
import { getTrustedAppOrigin, sanitizeInternalPath } from '../../src/security/request-origin.ts';
import { validatePasswordStrength } from '../../src/modules/auth/utils/password.ts';
import {
  hashVerificationCode,
  verifyVerificationCode,
} from '../../src/modules/auth/utils/verification.ts';
import { pickDailyWheelReward } from '../../src/lib/daily-wheel.ts';
import {
  buildRateLimitResponse,
  getTrustedClientIpFromHeaders,
} from '../../src/security/rateLimiter.ts';
import { hasValidBearerSecret } from '../../src/security/bearer-secret.ts';
import { getR2ObjectPrefix } from '../../src/security/object-key.ts';
import { getAnnouncementImageSrc } from '../../src/lib/announcement-images.ts';
import { isTrustedWriteRequest } from '../../src/security/write-request.ts';
import {
  requireDatabaseUrls,
  resolveDatabaseUrls,
} from '../../scripts/database-url.mjs';

function setEnvironment(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

test('trusted links never use an attacker-controlled request host', () => {
  const priorUrl = process.env.NEXTAUTH_URL;
  const priorNodeEnv = process.env.NODE_ENV;
  setEnvironment('NODE_ENV', 'production');
  process.env.NEXTAUTH_URL = 'https://oyrenoyret.org';
  try {
    const request = new Request('https://attacker.invalid/api/auth/forgot-password');
    assert.equal(getTrustedAppOrigin(request), 'https://oyrenoyret.org');
  } finally {
    setEnvironment('NEXTAUTH_URL', priorUrl);
    setEnvironment('NODE_ENV', priorNodeEnv);
  }
});

test('production origin configuration fails closed', () => {
  const priorUrl = process.env.NEXTAUTH_URL;
  const priorNodeEnv = process.env.NODE_ENV;
  setEnvironment('NODE_ENV', 'production');
  delete process.env.NEXTAUTH_URL;
  try {
    assert.throws(() => getTrustedAppOrigin(new Request('https://attacker.invalid/')));
  } finally {
    setEnvironment('NEXTAUTH_URL', priorUrl);
    setEnvironment('NODE_ENV', priorNodeEnv);
  }
});

test('internal paths reject external and ambiguous navigation targets', () => {
  assert.equal(sanitizeInternalPath('/discussions/123?q=one#reply'), '/discussions/123?q=one#reply');
  assert.equal(sanitizeInternalPath('//attacker.invalid/path'), null);
  assert.equal(sanitizeInternalPath('/\\attacker.invalid'), null);
  assert.equal(sanitizeInternalPath('javascript:alert(1)'), null);
  assert.equal(sanitizeInternalPath('https://attacker.invalid'), null);
});

test('Vercel database variables resolve consistently for builds and migrations', () => {
  const prismaNamed = resolveDatabaseUrls({
    NODE_ENV: 'test',
    DATABASE_PRISMA_DATABASE_URL: 'postgresql://app.example/database',
  });
  assert.equal(prismaNamed.application?.name, 'DATABASE_PRISMA_DATABASE_URL');
  assert.equal(prismaNamed.migration?.name, 'DATABASE_PRISMA_DATABASE_URL');

  const split = requireDatabaseUrls({
    NODE_ENV: 'test',
    POSTGRES_URL: 'postgresql://pool.example/database',
    POSTGRES_URL_NON_POOLING: 'postgresql://direct.example/database',
  });
  assert.equal(split.application?.name, 'POSTGRES_URL');
  assert.equal(split.migration?.name, 'POSTGRES_URL_NON_POOLING');

  assert.throws(
    () => requireDatabaseUrls({ NODE_ENV: 'test' }),
    /No application database URL is configured/,
  );
});

test('password policy enforces strength and bcrypt length limit', () => {
  assert.equal(validatePasswordStrength('Valid-Password1').valid, true);
  assert.equal(validatePasswordStrength('weak').valid, false);
  assert.equal(validatePasswordStrength(`Aa1!${'x'.repeat(69)}`).valid, false);
});

test('guardian codes are keyed and compared without storing plaintext', () => {
  const prior = process.env.GUARDIAN_VERIFICATION_SECRET;
  process.env.GUARDIAN_VERIFICATION_SECRET = 'test-secret-that-is-at-least-32-characters-long';
  try {
    const digest = hashVerificationCode('user-id', 'Parent@Example.com', '123456');
    assert.notEqual(digest, '123456');
    assert.equal(verifyVerificationCode('user-id', 'parent@example.com', '123456', digest), true);
    assert.equal(verifyVerificationCode('user-id', 'parent@example.com', '654321', digest), false);
  } finally {
    setEnvironment('GUARDIAN_VERIFICATION_SECRET', prior);
  }
});

test('daily wheel weighted boundaries are deterministic under injected draws', () => {
  assert.equal(pickDailyWheelReward(() => 0), 0);
  assert.equal(pickDailyWheelReward(() => 0.5), 1);
  assert.equal(pickDailyWheelReward(() => 0.75), 3);
  assert.equal(pickDailyWheelReward(() => 0.9), 5);
  assert.equal(pickDailyWheelReward(() => 0.99), 10);
});

test('client address parsing accepts only a valid address from the configured proxy header', () => {
  const priorHeader = process.env.TRUSTED_PROXY_IP_HEADER;
  process.env.TRUSTED_PROXY_IP_HEADER = 'x-forwarded-for';
  try {
    assert.equal(
      getTrustedClientIpFromHeaders(new Headers({ 'x-forwarded-for': '198.51.100.7, 203.0.113.9' })),
      '203.0.113.9',
    );
    assert.equal(getTrustedClientIpFromHeaders(new Headers({ 'x-forwarded-for': 'not-an-ip' })), null);
  } finally {
    setEnvironment('TRUSTED_PROXY_IP_HEADER', priorHeader);
  }
});

test('rate limiter outages produce a service-unavailable response', () => {
  const response = buildRateLimitResponse({
    allowed: false,
    remaining: 0,
    resetAt: new Date(Date.now() + 30_000),
    unavailable: true,
  });
  assert.equal(response.status, 503);
});

test('bearer secrets require an exact timing-safe token match', () => {
  assert.equal(hasValidBearerSecret('Bearer exact-secret', 'exact-secret'), true);
  assert.equal(hasValidBearerSecret('Bearer exact-secreu', 'exact-secret'), false);
  assert.equal(hasValidBearerSecret('Basic exact-secret', 'exact-secret'), false);
});

test('object storage prefixes cannot escape their namespace', () => {
  assert.equal(getR2ObjectPrefix('private/discussions', 'discussions'), 'private/discussions');
  assert.throws(() => getR2ObjectPrefix('../public', 'discussions'));
  assert.throws(() => getR2ObjectPrefix('safe//unsafe', 'discussions'));
});

test('announcement images stay inside the configured private namespace', () => {
  const key = 'private/announcements/2026/07/123e4567-e89b-42d3-a456-426614174000.webp';
  const valid = `/api/uploads/announcements/file?key=${encodeURIComponent(key)}`;
  assert.equal(getAnnouncementImageSrc(valid, 'private/announcements'), valid);
  assert.equal(getAnnouncementImageSrc(valid, 'other/announcements'), null);
  assert.equal(getAnnouncementImageSrc(`${valid}&key=${encodeURIComponent(key)}`), null);
  assert.equal(getAnnouncementImageSrc('/api/uploads/announcements/file?key=../public/file.webp'), null);
});

test('write-origin checks allow only same-origin browsers or authenticated cron calls', () => {
  const trustedOrigin = 'https://oyrenoyret.org';
  const cronSecret = 'cron-secret-that-is-at-least-32-characters';
  const check = (pathname: string, headers: Record<string, string>) =>
    isTrustedWriteRequest({ pathname, headers: new Headers(headers) }, trustedOrigin, cronSecret);

  assert.equal(check('/api/settings/profile', { origin: trustedOrigin }), true);
  assert.equal(check('/api/settings/profile', { origin: 'https://attacker.invalid' }), false);
  assert.equal(check('/api/settings/profile', { 'sec-fetch-site': 'same-origin' }), true);
  assert.equal(check('/api/settings/profile', {}), false);
  assert.equal(
    check('/api/cron/archive-discussions', { authorization: `Bearer ${cronSecret}` }),
    true,
  );
  assert.equal(
    check('/api/cron/archive-discussions', { authorization: 'Bearer wrong-secret' }),
    false,
  );
});
