/**
 * Live Announcements API
 *
 * GET: List announcements
 * POST: Create announcement (staff only)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/src/db/client';
import { getCurrentSession } from '@/src/modules/auth/utils/session';
import { isStaff } from '@/src/lib/permissions';
import { RATE_LIMITS } from '@/src/config/constants';
import { getPublicCacheHeaders } from '@/src/lib/http-cache';
import { buildRateLimitResponse, checkRateLimit, getRateLimitIdentifier } from '@/src/security/rateLimiter';
import { requireVerifiedEmailForWrite } from '@/src/modules/auth/utils/write-access';
import { isDbSchemaMismatch } from '@/src/db/schema-mismatch';
import { getR2ObjectPrefix } from '@/src/services/r2';
import { getAnnouncementImageSrc } from '@/src/lib/announcement-images';

export async function GET(request: Request) {
  try {
    const identifier = getRateLimitIdentifier(request);
    const rateLimit = await checkRateLimit(`live-announcements:list:${identifier}`, RATE_LIMITS.GENERAL);
    if (!rateLimit.allowed) {
      const { status, body, headers } = buildRateLimitResponse(rateLimit);
      return NextResponse.json(body, { status, headers });
    }

    const { searchParams } = new URL(request.url);
    const takeParam = Number(searchParams.get('take') ?? 20);
    const take = Number.isFinite(takeParam) ? Math.min(Math.max(takeParam, 1), 200) : 20;

    const announcements = await prisma.liveAnnouncement.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        title: true,
        body: true,
        imageUrl: true,
        createdAt: true,
      },
    });

    return NextResponse.json(announcements, { headers: getPublicCacheHeaders() });
  } catch (error) {
    if (isDbSchemaMismatch(error)) {
      return NextResponse.json(
        { error: 'Live announcements are not available until database migrations are applied.' },
        { status: 503 },
      );
    }
    console.error('Error fetching announcements:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || !isStaff(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const identifier = getRateLimitIdentifier(request, userId);
    const rateLimit = await checkRateLimit(
      `live-announcements:create:${identifier}`,
      RATE_LIMITS.ADMIN_WRITE
    );
    if (!rateLimit.allowed) {
      const { status, body, headers } = buildRateLimitResponse(rateLimit);
      return NextResponse.json(body, { status, headers });
    }

    const body = await request.json();
    const { sanitizeInput } = await import('@/src/security/validation');
    const title = typeof body.title === 'string' ? sanitizeInput(body.title) : '';
    const text = typeof body.body === 'string' ? sanitizeInput(body.body) : '';
    const imageUrlRaw = typeof (body as any)?.imageUrl === 'string' ? String((body as any).imageUrl).trim() : '';

    if (!title || !text) {
      return NextResponse.json({ error: 'Title and body are required' }, { status: 400 });
    }

    const r2PrefixBase = getR2ObjectPrefix(process.env.R2_ANNOUNCEMENTS_PREFIX, 'announcements');
    const imageUrl = getAnnouncementImageSrc(imageUrlRaw, r2PrefixBase);

    const announcement = await prisma.liveAnnouncement.create({
      data: {
        title,
        body: text,
        imageUrl,
        createdById: userId,
      },
      select: {
        id: true,
        title: true,
        body: true,
        imageUrl: true,
        createdAt: true,
      },
    });

    return NextResponse.json(announcement);
  } catch (error) {
    if (isDbSchemaMismatch(error)) {
      return NextResponse.json(
        { error: 'Live announcements are not available. Apply database migrations first.' },
        { status: 503 },
      );
    }
    console.error('Error creating announcement:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
