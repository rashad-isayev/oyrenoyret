/**
 * Sprint Submission Image Proxy
 *
 * Streams an image from R2 through the app server.
 *
 * GET /api/uploads/sprint-submissions/file?key=<r2-key>
 */

import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/src/modules/auth/utils/session';
import { RATE_LIMITS } from '@/src/config/constants';
import {
  buildRateLimitResponse,
  checkRateLimit,
  getRateLimitIdentifier,
} from '@/src/security/rateLimiter';
import {
  inferContentTypeFromKey,
  inferFilenameFromKey,
  sanitizeContentDispositionFilename,
} from '@/src/lib/mime';
import { MAX_IMAGE_UPLOAD_BYTES } from '@/src/config/uploads';
import { prisma } from '@/src/db/client';
import { isStaff } from '@/src/lib/permissions';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const userId = await getCurrentSession();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const identifier = getRateLimitIdentifier(request, userId);
    const rateLimit = await checkRateLimit(`uploads:sprint-submissions:file:${identifier}`, RATE_LIMITS.GENERAL);
    if (!rateLimit.allowed) {
      const { status, body, headers } = buildRateLimitResponse(rateLimit);
      return NextResponse.json(body, { status, headers });
    }

    const { searchParams } = new URL(request.url);
    const keyRaw = String(searchParams.get('key') ?? '').trim();
    if (!keyRaw || keyRaw.length > 500) return NextResponse.json({ error: 'Invalid key' }, { status: 400 });

    const { getR2PrivateConfig, createR2Client, getR2ObjectPrefix } = await import('@/src/services/r2');
    const prefixBase = getR2ObjectPrefix(
      process.env.R2_SPRINT_SUBMISSIONS_PREFIX,
      'sprint-submissions',
    );
    const relativeKey = keyRaw.startsWith(`${prefixBase}/`)
      ? keyRaw.slice(prefixBase.length + 1)
      : '';
    const parts = relativeKey.split('/');
    const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
    const ownerId = parts[1] ?? '';
    const filenamePattern = new RegExp(`^${uuid}\\.(?:jpg|png|webp)$`, 'i');
    if (
      parts.length !== 5 ||
      !new RegExp(`^${uuid}$`, 'i').test(parts[0] ?? '') ||
      !new RegExp(`^${uuid}$`, 'i').test(ownerId) ||
      !/^20\d{2}$/.test(parts[2] ?? '') ||
      !/^(?:0[1-9]|1[0-2])$/.test(parts[3] ?? '') ||
      !filenamePattern.test(parts[4] ?? '')
    ) {
      return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
    }

    const requester = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!requester || (ownerId !== userId && !isStaff(requester.role))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const cfg = getR2PrivateConfig();
    if (!cfg) return NextResponse.json({ error: 'Private R2 storage not configured' }, { status: 503 });

    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const client = createR2Client(cfg);
    const data = await client.send(new GetObjectCommand({ Bucket: cfg.bucket, Key: keyRaw }));

    const contentType = inferContentTypeFromKey(keyRaw);
    const contentLength = Number(data.ContentLength);
    const expectedSize = Number(data.Metadata?.['expected-size']);
    if (
      !contentType?.startsWith('image/') ||
      !Number.isSafeInteger(contentLength) ||
      contentLength <= 0 ||
      contentLength > MAX_IMAGE_UPLOAD_BYTES ||
      !Number.isSafeInteger(expectedSize) ||
      expectedSize !== contentLength ||
      data.Metadata?.['uploaded-by'] !== ownerId
    ) {
      return NextResponse.json({ error: 'Invalid stored object' }, { status: 415 });
    }

    const body = data.Body as unknown;
    const stream =
      body && typeof (body as { transformToWebStream?: unknown }).transformToWebStream === 'function'
        ? (body as { transformToWebStream: () => ReadableStream }).transformToWebStream()
        : body && typeof body === 'object' && typeof (body as any).pipe === 'function'
          ? (await import('node:stream')).Readable.toWeb(body as any)
          : null;

    if (!stream) return NextResponse.json({ error: 'Unable to read file' }, { status: 500 });

    const filename =
      sanitizeContentDispositionFilename(inferFilenameFromKey(keyRaw) ?? 'file') || 'file';
    return new Response(stream as any, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=300',
        'Content-Disposition': `inline; filename="${filename}"`,
        'X-Content-Type-Options': 'nosniff',
        Vary: 'Cookie',
      },
    });
  } catch (error: any) {
    const status =
      typeof error?.$metadata?.httpStatusCode === 'number' ? error.$metadata.httpStatusCode : 500;
    if (status === 404) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    console.error('Error proxying sprint submission image:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
