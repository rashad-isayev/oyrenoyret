#!/usr/bin/env node

const baseUrlRaw = String(process.env.BASE_URL ?? '').trim();
if (!baseUrlRaw) {
  console.error('BASE_URL is required, for example BASE_URL=http://localhost:3000 npm run security:smoke');
  process.exit(1);
}

let baseUrl;
try {
  baseUrl = new URL(baseUrlRaw);
  if (!['http:', 'https:'].includes(baseUrl.protocol) || baseUrl.username || baseUrl.password) {
    throw new Error('invalid origin');
  }
  baseUrl.pathname = '/';
  baseUrl.search = '';
  baseUrl.hash = '';
} catch {
  console.error('BASE_URL must be a valid HTTP(S) origin without credentials.');
  process.exit(1);
}

async function request(pathname, init = {}) {
  return fetch(new URL(pathname, baseUrl), {
    ...init,
    redirect: 'manual',
    signal: AbortSignal.timeout(10_000),
  });
}

const failures = [];
const health = await request('/api/health');
if (health.status !== 200) failures.push(`health endpoint returned ${health.status}`);

const page = await request('/');
for (const header of ['content-security-policy', 'x-content-type-options', 'x-frame-options', 'referrer-policy']) {
  if (!page.headers.get(header)) failures.push(`missing security header: ${header}`);
}

const crossOrigin = await request('/api/auth/logout', {
  method: 'POST',
  headers: { origin: 'https://attacker.invalid' },
});
if (crossOrigin.status !== 403) failures.push(`cross-origin write returned ${crossOrigin.status}, expected 403`);

const missingCronSecret = await request('/api/cron/archive-discussions', { method: 'POST' });
if (missingCronSecret.status !== 403) {
  failures.push(`unauthenticated origin-less cron call returned ${missingCronSecret.status}, expected 403`);
}

const privateDiscussionList = await request('/api/discussions');
if (privateDiscussionList.status !== 401) {
  failures.push(
    `unauthenticated discussion list returned ${privateDiscussionList.status}, expected 401`,
  );
}

const privateDiscussionDetail = await request('/api/discussions/not-a-real-id');
if (privateDiscussionDetail.status !== 401) {
  failures.push(
    `unauthenticated discussion detail returned ${privateDiscussionDetail.status}, expected 401`,
  );
}

const oversizedJson = await request('/api/settings/preferences', {
  method: 'POST',
  headers: {
    origin: baseUrl.origin,
    'content-type': 'application/json',
  },
  body: JSON.stringify({ language: 'x'.repeat(40_000) }),
});
if (oversizedJson.status !== 413) {
  failures.push(
    `oversized JSON body returned ${oversizedJson.status}, expected 413`,
  );
}

if (failures.length) {
  console.error('HTTP security smoke test failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`HTTP security smoke test passed for ${baseUrl.origin}.`);
