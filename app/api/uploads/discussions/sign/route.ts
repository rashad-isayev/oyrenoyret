/**
 * Discussion Image Upload (Signed, R2)
 *
 * POST: returns an R2 presigned PUT URL so the client can upload directly.
 */

import { NextResponse } from 'next/server';
import crypto from 'node:crypto';

import { MAX_IMAGE_UPLOAD_BYTES } from '@/src/config/uploads';

export const runtime = 'nodejs';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export async function POST(request: Request) {
  try {
    const { getCurrentSession } = await import('@/src/modules/auth/utils/session');
    const { requireVerifiedEmailForWrite } = await import('@/src/modules/auth/utils/write-access');
    const { RATE_LIMITS } = await import('@/src/config/constants');
    const { getPrivateNoStoreHeaders } = await import('@/src/lib/http-cache');
    const { buildRateLimitResponse, checkRateLimit, getRateLimitIdentifier } = await import(
      '@/src/security/rateLimiter'
    );
    const { getR2PrivateConfig, getR2ObjectPrefix } = await import('@/src/services/r2');

    const userId = await getCurrentSession();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const verified = await requireVerifiedEmailForWrite(userId);
    if (!verified.ok) {
      const message = 'error' in verified ? verified.error : 'Unauthorized';
      return NextResponse.json(
        { error: message, errorKey: verified.errorKey },
        { status: verified.status }
      );
    }

    const identifier = getRateLimitIdentifier(request, userId);
    const rateLimit = await checkRateLimit(`uploads:discussions:sign:${identifier}`, RATE_LIMITS.UPLOAD);
    if (!rateLimit.allowed) {
      const { status, body, headers } = buildRateLimitResponse(rateLimit);
      return NextResponse.json(body, { status, headers });
    }

    let body: { size?: unknown; type?: unknown } = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const size = typeof body.size === 'number' ? body.size : Number(body.size);
    const type = typeof body.type === 'string' ? body.type : String(body.type ?? '');

    if (!Number.isFinite(size) || size <= 0) {
      return NextResponse.json({ error: 'Invalid file size' }, { status: 400 });
    }
    if (size > MAX_IMAGE_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 });
    }
    if (!ALLOWED_MIME.has(type)) {
      return NextResponse.json({ error: 'Unsupported image type' }, { status: 415 });
    }

    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const ext = EXT_BY_MIME[type] ?? 'bin';

    const r2Cfg = getR2PrivateConfig();
    if (!r2Cfg) {
      return NextResponse.json({ error: 'Private R2 storage not configured' }, { status: 503 });
    }

    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    const { createR2Client } = await import('@/src/services/r2');

    const prefixBase = getR2ObjectPrefix(process.env.R2_DISCUSSIONS_PREFIX, 'discussions');
    const key = `${prefixBase}/${yyyy}/${mm}/${crypto.randomUUID()}.${ext}`;
    const proxyUrl = `/api/uploads/discussions/file?key=${encodeURIComponent(key)}`;

    const client = createR2Client(r2Cfg);
    const command = new PutObjectCommand({
      Bucket: r2Cfg.bucket,
      Key: key,
      ContentType: type,
      CacheControl: 'private, max-age=31536000, immutable',
      Metadata: {
        'expected-size': String(size),
        'uploaded-by': userId,
      },
    });
    const ttlRaw = Number(process.env.R2_PRESIGN_TTL_SECONDS ?? 300);
    const ttl = Number.isFinite(ttlRaw) ? Math.min(900, Math.max(30, Math.floor(ttlRaw))) : 300;
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: ttl });

    const headers = getPrivateNoStoreHeaders();
    return NextResponse.json(
      {
        provider: 'r2',
        method: 'PUT',
        uploadUrl,
        headers: {
          'Content-Type': type,
          'Cache-Control': 'private, max-age=31536000, immutable',
          'x-amz-meta-expected-size': String(size),
          'x-amz-meta-uploaded-by': userId,
        },
        proxyUrl,
        key,
        maxBytes: MAX_IMAGE_UPLOAD_BYTES,
      },
      { headers }
    );
  } catch (error) {
    console.error('Error signing discussion image upload:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
