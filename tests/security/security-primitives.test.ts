import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { Prisma } from '@prisma/client';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getTrustedAppOrigin, sanitizeInternalPath } from '../../src/security/request-origin.ts';
import { validatePasswordStrength } from '../../src/modules/auth/utils/password.ts';
import {
  hashVerificationCode,
  verifyVerificationCode,
} from '../../src/modules/auth/utils/verification.ts';
import {
  buildRateLimitResponse,
  getTrustedClientIpFromHeaders,
} from '../../src/security/rateLimiter.ts';
import { hasValidBearerSecret } from '../../src/security/bearer-secret.ts';
import { getR2ObjectPrefix } from '../../src/security/object-key.ts';
import {
  getAuthenticatedMediaRetrySrc,
  isAuthenticatedMediaSrc,
} from '../../src/lib/media.ts';
import { isTrustedWriteRequest } from '../../src/security/write-request.ts';
import {
  canInteractWithPlatform,
  getAccountSetupState,
} from '../../src/modules/onboarding/account-setup-state.ts';
import { GUIDELINES_VERSION, RATE_LIMITS } from '../../src/config/constants.ts';
import {
  DISCUSSION_SLOWMODE_SECONDS,
  getDiscussionSlowmodeRetrySeconds,
} from '../../src/config/discussions.ts';
import {
  DISCUSSION_CONTEXT_TAG_IDS,
  MAX_DISCUSSION_CONTEXT_TAGS,
  matchesDiscussionContextTagFilter,
  normalizeDiscussionContextTagFilter,
  normalizeDiscussionContextTags,
} from '../../src/modules/discussions/discussion-context-tags.ts';
import { sanitizeRichHtmlOnServer } from '../../src/security/server-rich-html-sanitizer.ts';
import { richTextHtmlToPlainText } from '../../src/lib/rich-text.ts';
import {
  JSON_BODY_LIMITS,
  readJsonBody,
} from '../../src/security/json-body.ts';
import { detectImageMimeFromMagicBytes } from '../../src/lib/mime.ts';
import { buildDiscussionImagePutObjectInput } from '../../src/services/discussion-image-storage.ts';
import { assertExplicitRemoteDatabaseAccess } from '../../scripts/database-target-safety.mjs';

function setEnvironment(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

const require = createRequire(import.meta.url);

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

test('discussion formatting survives server sanitation without allowing scripts', () => {
  const sanitized = sanitizeRichHtmlOnServer({
    input:
      '<p><strong>bold</strong> <code>const x = 1</code> <sub>2</sub> <sup>3</sup></p><script>alert(1)</script>',
    allowedTags: ['p', 'strong', 'code', 'sub', 'sup'],
    allowedAttrs: [],
  });

  assert.match(sanitized, /<strong>bold<\/strong>/);
  assert.match(sanitized, /<code>const x = 1<\/code>/);
  assert.match(sanitized, /<sub>2<\/sub>/);
  assert.match(sanitized, /<sup>3<\/sup>/);
  assert.doesNotMatch(sanitized, /script|alert\(1\)/i);
});

test('rich text limits count visible characters independently of formatting markup', () => {
  const formatted = Array.from(
    { length: 500 },
    () => '<strong>a</strong><em>b</em><code>c</code><u>d</u>',
  ).join('');
  assert.equal(richTextHtmlToPlainText(`<p>${formatted}</p>`).length, 2_000);
  assert.equal(
    richTextHtmlToPlainText('<p>&amp;&lt;&gt;&quot;&apos;&nbsp;</p>'),
    `&<>"'`,
  );
});

test('generated Prisma client matches the flat live-discussion schema', () => {
  const discussion = Prisma.dmmf.datamodel.models.find(
    (model) => model.name === 'Discussion',
  );
  const message = Prisma.dmmf.datamodel.models.find(
    (model) => model.name === 'DiscussionReply',
  );
  const participantState = Prisma.dmmf.datamodel.models.find(
    (model) => model.name === 'DiscussionParticipantState',
  );

  assert.ok(discussion, 'Discussion model is missing from the generated client.');
  assert.ok(message, 'Discussion message model is missing from the generated client.');
  assert.ok(
    participantState,
    'Discussion participant state is missing from the generated client.',
  );

  const discussionFields = new Set(discussion.fields.map((field) => field.name));
  const messageFields = new Set(message.fields.map((field) => field.name));

  assert.equal(discussionFields.has('tags'), true);
  assert.equal(discussionFields.has('acceptedReplyId'), false);
  assert.equal(messageFields.has('parentReplyId'), false);
});

test('discussion slowmode uses one shared per-user cooldown policy', () => {
  const now = new Date('2026-07-25T12:00:00.000Z');

  assert.equal(DISCUSSION_SLOWMODE_SECONDS, 60);
  assert.equal(getDiscussionSlowmodeRetrySeconds(null, now), 0);
  assert.equal(
    getDiscussionSlowmodeRetrySeconds(
      new Date(now.getTime() - 1_000),
      now,
    ),
    59,
  );
  assert.equal(
    getDiscussionSlowmodeRetrySeconds(
      new Date(now.getTime() - 60_000),
      now,
    ),
    0,
  );
});

test('discussion streams have a dedicated connection budget', () => {
  assert.equal(RATE_LIMITS.STREAM_CONNECT.maxRequests, 30);
  assert.equal(RATE_LIMITS.STREAM_CONNECT.windowMs, 15 * 60 * 1000);

  const streamRoute = readFileSync(
    new URL('../../app/api/discussions/[id]/stream/route.ts', import.meta.url),
    'utf8',
  );
  assert.match(streamRoute, /REVISION_POLL_MS = 10_000/);
  assert.doesNotMatch(streamRoute, /discussionReply\.aggregate/);
});

test('discussion creation and filtering keep distinct tag selection policies', () => {
  assert.equal(
    normalizeDiscussionContextTags(DISCUSSION_CONTEXT_TAG_IDS).length,
    MAX_DISCUSSION_CONTEXT_TAGS,
  );
  assert.deepEqual(
    normalizeDiscussionContextTagFilter(
      DISCUSSION_CONTEXT_TAG_IDS.slice(0, MAX_DISCUSSION_CONTEXT_TAGS + 1),
    ),
    DISCUSSION_CONTEXT_TAG_IDS.slice(0, MAX_DISCUSSION_CONTEXT_TAGS + 1),
  );
  assert.deepEqual(
    normalizeDiscussionContextTagFilter(DISCUSSION_CONTEXT_TAG_IDS),
    [],
  );
  assert.equal(
    matchesDiscussionContextTagFilter(
      ['question'],
      ['question', 'resource'],
    ),
    true,
  );
  assert.equal(
    matchesDiscussionContextTagFilter(
      ['reflection'],
      ['question', 'resource'],
    ),
    false,
  );
  assert.equal(
    matchesDiscussionContextTagFilter(
      ['reflection'],
      DISCUSSION_CONTEXT_TAG_IDS,
    ),
    true,
  );
});

test('authenticated media routes bypass server-side image optimization', () => {
  assert.equal(
    isAuthenticatedMediaSrc('/api/uploads/discussions/file?key=discussions%2F2026%2F07%2Fimage.webp'),
    true,
  );
  assert.equal(isAuthenticatedMediaSrc('/avatar-blue.png'), false);
  assert.equal(isAuthenticatedMediaSrc('https://attacker.invalid/api/uploads/discussions/file'), false);
  assert.equal(isAuthenticatedMediaSrc('//attacker.invalid/api/uploads/discussions/file'), false);
  assert.equal(
    getAuthenticatedMediaRetrySrc(
      '/api/uploads/discussions/file?key=discussions%2F2026%2F07%2Fimage.webp',
      2,
    ),
    '/api/uploads/discussions/file?key=discussions%2F2026%2F07%2Fimage.webp&_media_attempt=2',
  );
});

test('password policy enforces strength and bcrypt length limit', () => {
  assert.equal(validatePasswordStrength('Valid-Password1').valid, true);
  assert.equal(validatePasswordStrength('weak').valid, false);
  assert.equal(validatePasswordStrength(`Aa1!${'x'.repeat(69)}`).valid, false);
});

test('account setup derives every interrupted onboarding state from milestones', () => {
  const now = new Date();

  assert.equal(getAccountSetupState({}), 'verify-email');
  assert.equal(
    getAccountSetupState({ emailVerifiedAt: now }),
    'accept-guidelines',
  );
  assert.equal(
    getAccountSetupState({
      emailVerifiedAt: now,
      guidelinesAcceptedAt: now,
      guidelinesVersion: GUIDELINES_VERSION,
    }),
    'product-tour',
  );
  assert.equal(
    getAccountSetupState({
      emailVerifiedAt: now,
      guidelinesAcceptedAt: now,
      guidelinesVersion: 'outdated',
      tutorialCompletedAt: now,
    }),
    'accept-guidelines',
  );
  assert.equal(
    getAccountSetupState({
      emailVerifiedAt: now,
      guidelinesAcceptedAt: now,
      guidelinesVersion: GUIDELINES_VERSION,
      tutorialSkippedAt: now,
    }),
    'ready',
  );
  assert.equal(
    getAccountSetupState({
      emailVerifiedAt: now,
      guidelinesAcceptedAt: now,
      guidelinesVersion: GUIDELINES_VERSION,
      tutorialCompletedAt: now,
    }),
    'ready',
  );

  assert.equal(canInteractWithPlatform({ emailVerifiedAt: now }), false);
  assert.equal(
    canInteractWithPlatform({
      emailVerifiedAt: now,
      guidelinesAcceptedAt: now,
      guidelinesVersion: GUIDELINES_VERSION,
    }),
    true,
  );
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

test('JSON route bodies are bounded even without a content-length header', async () => {
  const valid = await readJsonBody<{ ok: boolean }>(
    new Request('https://oyrenoyret.org/api/example', {
      method: 'POST',
      body: JSON.stringify({ ok: true }),
    }),
    JSON_BODY_LIMITS.SMALL,
  );
  assert.deepEqual(valid, { ok: true, value: { ok: true } });

  const declaredOversize = await readJsonBody(
    new Request('https://oyrenoyret.org/api/example', {
      method: 'POST',
      headers: { 'content-length': String(JSON_BODY_LIMITS.SMALL + 1) },
      body: '{}',
    }),
    JSON_BODY_LIMITS.SMALL,
  );
  assert.equal(declaredOversize.ok, false);
  if (!declaredOversize.ok) assert.equal(declaredOversize.status, 413);

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(`"${'x'.repeat(64)}"`));
      controller.close();
    },
  });
  const streamedOversize = await readJsonBody(
    new Request('https://oyrenoyret.org/api/example', {
      method: 'POST',
      body: stream,
      duplex: 'half',
    } as RequestInit & { duplex: 'half' }),
    32,
  );
  assert.equal(streamedOversize.ok, false);
  if (!streamedOversize.ok) assert.equal(streamedOversize.status, 413);
});

test('discussion image validation uses file signatures instead of extensions alone', () => {
  assert.equal(
    detectImageMimeFromMagicBytes(
      Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]),
    ),
    'image/jpeg',
  );
  assert.equal(
    detectImageMimeFromMagicBytes(
      Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ),
    'image/png',
  );
  assert.equal(
    detectImageMimeFromMagicBytes(
      Uint8Array.from([
        0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
        0x57, 0x45, 0x42, 0x50,
      ]),
    ),
    'image/webp',
  );
  assert.equal(
    detectImageMimeFromMagicBytes(
      new TextEncoder().encode('<script>alert(1)</script>'),
    ),
    null,
  );
});

test('presigned discussion uploads bind the exact declared byte length', () => {
  const input = buildDiscussionImagePutObjectInput({
    bucket: 'private',
    key: 'discussions/2026/07/image.webp',
    contentType: 'image/webp',
    size: 1234,
    userId: 'user-id',
  });
  assert.equal(input.ContentLength, 1234);
  assert.equal(input.Metadata?.['expected-size'], '1234');
  assert.equal(input.Metadata?.['uploaded-by'], 'user-id');
});

test('discussion upload signatures include content-length', async () => {
  const client = new S3Client({
    region: 'auto',
    endpoint: 'https://00000000000000000000000000000000.r2.cloudflarestorage.com',
    credentials: {
      accessKeyId: 'test-access-key',
      secretAccessKey: 'test-secret-key',
    },
  });
  const command = new PutObjectCommand(
    buildDiscussionImagePutObjectInput({
      bucket: 'private',
      key: 'discussions/2026/07/image.webp',
      contentType: 'image/webp',
      size: 1234,
      userId: 'user-id',
    }),
  );
  const signedUrl = new URL(
    await getSignedUrl(client, command, { expiresIn: 60 }),
  );
  assert.match(
    signedUrl.searchParams.get('X-Amz-SignedHeaders') ?? '',
    /(?:^|;)content-length(?:;|$)/,
  );
});

test('protected content routes fail closed and admin UI requires ADMIN', () => {
  const discussionsList = readFileSync(
    new URL('../../app/api/discussions/route.ts', import.meta.url),
    'utf8',
  );
  const discussionDetail = readFileSync(
    new URL('../../app/api/discussions/[id]/route.ts', import.meta.url),
    'utf8',
  );
  const adminLayout = readFileSync(
    new URL('../../app/(app)/admin/layout.tsx', import.meta.url),
    'utf8',
  );

  assert.match(discussionsList, /if \(!sessionUserId\)/);
  assert.match(discussionsList, /requirePlatformContentAccess/);
  assert.doesNotMatch(discussionsList, /getCurrentSession\(\)\.catch/);
  assert.match(discussionDetail, /if \(!currentUserId\)/);
  assert.match(discussionDetail, /requirePlatformContentAccess/);
  assert.match(adminLayout, /isAdmin\(user\.role\)/);
});

test('remote database mutations require an explicit operator opt-in', () => {
  const localDatabaseUrl = [
    'postgresql://user:',
    'test-password',
    '@127.0.0.1:5432/app',
  ].join('');
  const remoteDatabaseUrl = [
    'postgresql://user:',
    'test-password',
    '@db.example.com:5432/app',
  ].join('');
  assert.doesNotThrow(() =>
    assertExplicitRemoteDatabaseAccess({
      databaseUrl: localDatabaseUrl,
      allowRemote: false,
      operation: 'run a test mutation',
    }),
  );
  assert.throws(
    () =>
      assertExplicitRemoteDatabaseAccess({
        databaseUrl: remoteDatabaseUrl,
        allowRemote: false,
        operation: 'run a test mutation',
      }),
    /without --allow-remote/,
  );
  assert.doesNotThrow(() =>
    assertExplicitRemoteDatabaseAccess({
      databaseUrl: remoteDatabaseUrl,
      allowRemote: true,
      operation: 'run a test mutation',
    }),
  );
});

test('admin promotion revokes existing sessions in the same transaction', () => {
  const createAdminScript = readFileSync(
    new URL('../../scripts/create-admin.mjs', import.meta.url),
    'utf8',
  );
  assert.match(createAdminScript, /prisma\.\$transaction/);
  assert.match(createAdminScript, /tx\.authSession\.deleteMany/);
});

test('legacy lint callers receive the patched brace-expansion implementation', () => {
  const expand = require('brace-expansion') as {
    (pattern: string): string[];
    EXPANSION_MAX_LENGTH?: number;
  };
  const packageInfo = require('brace-expansion/package.json') as {
    version?: string;
  };

  assert.equal(typeof expand, 'function');
  assert.deepEqual(expand('src/*.{ts,tsx}'), ['src/*.ts', 'src/*.tsx']);
  assert.equal(packageInfo.version, '5.0.8');
  assert.equal(expand.EXPANSION_MAX_LENGTH, 4_000_000);
});
