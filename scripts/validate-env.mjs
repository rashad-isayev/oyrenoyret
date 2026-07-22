#!/usr/bin/env node

import './load-env.mjs';

const errors = [];
const value = (name) => String(process.env[name] ?? '').trim();

function requireLength(name, minimum) {
  if (value(name).length < minimum) errors.push(`${name} must be at least ${minimum} characters.`);
}

function requireHttpsUrl(name, { originOnly = false } = {}) {
  const raw = value(name);
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'https:') throw new Error('not https');
    if (originOnly && (parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash)) {
      throw new Error('not origin only');
    }
  } catch {
    errors.push(`${name} must be a valid HTTPS${originOnly ? ' origin' : ' URL'}.`);
  }
}

const objectPrefixPattern = /^[a-z0-9_-]+(?:\/[a-z0-9_-]+)*$/i;

const databaseUrl = value('DATABASE_URL');
try {
  const parsed = new URL(databaseUrl);
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) throw new Error('not postgres');
  if (['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname)) throw new Error('local target');
} catch {
  errors.push('DATABASE_URL must be a valid, non-local PostgreSQL URL.');
}

requireHttpsUrl('NEXTAUTH_URL', { originOnly: true });
requireLength('NEXTAUTH_SECRET', 32);
requireLength('REGISTRATION_TOKEN_SECRET', 32);
requireLength('GUARDIAN_VERIFICATION_SECRET', 32);
requireLength('CRON_SECRET', 32);
requireHttpsUrl('UPSTASH_REDIS_REST_URL');
requireLength('UPSTASH_REDIS_REST_TOKEN', 16);
requireLength('RESEND_API_KEY', 16);
requireLength('EMAIL_FROM', 3);
if (!/@/.test(value('EMAIL_FROM')) || /[\r\n]/.test(value('EMAIL_FROM'))) {
  errors.push('EMAIL_FROM must contain a valid sender email address.');
}
if (!/^[a-f0-9]{32}$/i.test(value('R2_ACCOUNT_ID'))) {
  errors.push('R2_ACCOUNT_ID must be a 32-character hexadecimal Cloudflare account ID.');
}
requireLength('R2_ACCESS_KEY_ID', 16);
requireLength('R2_SECRET_ACCESS_KEY', 24);
if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(value('R2_PRIVATE_BUCKET'))) {
  errors.push('R2_PRIVATE_BUCKET must be a valid private bucket name.');
}

if (value('R2_ENDPOINT')) {
  requireHttpsUrl('R2_ENDPOINT', { originOnly: true });
  try {
    const endpoint = new URL(value('R2_ENDPOINT'));
    const accountId = value('R2_ACCOUNT_ID').toLowerCase();
    if (
      !endpoint.hostname.toLowerCase().startsWith(`${accountId}.`) ||
      !endpoint.hostname.toLowerCase().endsWith('.r2.cloudflarestorage.com')
    ) {
      errors.push('R2_ENDPOINT must belong to the configured Cloudflare R2 account.');
    }
  } catch {
    // The URL validation above reports the malformed value.
  }
}
for (const [name, fallback] of [
  ['R2_DISCUSSIONS_PREFIX', 'discussions'],
  ['R2_ANNOUNCEMENTS_PREFIX', 'announcements'],
  ['R2_SPRINT_SUBMISSIONS_PREFIX', 'sprint-submissions'],
]) {
  const prefix = value(name) || fallback;
  if (prefix.length > 120 || !objectPrefixPattern.test(prefix)) {
    errors.push(`${name} must be a safe slash-separated object prefix.`);
  }
}
const secretNames = [
  'NEXTAUTH_SECRET',
  'REGISTRATION_TOKEN_SECRET',
  'GUARDIAN_VERIFICATION_SECRET',
  'CRON_SECRET',
];
for (let index = 0; index < secretNames.length; index += 1) {
  for (let compareIndex = index + 1; compareIndex < secretNames.length; compareIndex += 1) {
    const first = secretNames[index];
    const second = secretNames[compareIndex];
    if (value(first) && value(first) === value(second)) {
      errors.push(`${first} and ${second} must use different values.`);
    }
  }
}
if (value('EMAIL_DEV_LOG_ONLY') === '1') errors.push('EMAIL_DEV_LOG_ONLY cannot be enabled in production.');
if (/^(?:0|false)$/i.test(value('PG_SSL'))) errors.push('PG_SSL cannot disable TLS in production.');
if (/^(?:0|false)$/i.test(value('PG_SSL_REJECT_UNAUTHORIZED'))) {
  errors.push('PG_SSL_REJECT_UNAUTHORIZED cannot disable certificate verification in production.');
}
if (value('PG_SSLMODE') && !/^(?:require|verify-ca|verify-full)$/i.test(value('PG_SSLMODE'))) {
  errors.push('PG_SSLMODE must require TLS in production.');
}

const presignTtl = Number(value('R2_PRESIGN_TTL_SECONDS') || '300');
if (!Number.isInteger(presignTtl) || presignTtl < 30 || presignTtl > 900) {
  errors.push('R2_PRESIGN_TTL_SECONDS must be an integer from 30 through 900.');
}

const trustedHeader = value('TRUSTED_PROXY_IP_HEADER');
const allowedHeaders = new Set([
  'x-vercel-forwarded-for',
  'cf-connecting-ip',
  'true-client-ip',
  'x-real-ip',
  'x-forwarded-for',
]);
if (trustedHeader && !allowedHeaders.has(trustedHeader.toLowerCase())) {
  errors.push('TRUSTED_PROXY_IP_HEADER is not an allowed proxy header.');
} else if (process.env.VERCEL !== '1' && !trustedHeader) {
  errors.push('TRUSTED_PROXY_IP_HEADER must identify the header set by your trusted reverse proxy.');
}

for (const [name, raw] of Object.entries(process.env)) {
  if (
    name.startsWith('NEXT_PUBLIC_') &&
    /(?:SECRET|TOKEN|PASSWORD|PRIVATE_KEY|ACCESS_KEY|DATABASE_URL|RESEND_API_KEY)/i.test(name) &&
    String(raw ?? '').trim()
  ) {
    errors.push(`${name} appears to expose a secret to the browser.`);
  }
}

if (errors.length) {
  console.error('Production environment validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Production environment validation passed.');
