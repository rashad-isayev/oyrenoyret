/**
 * Server-side session management.
 *
 * Only a SHA-256 digest of the random session token is stored. Security-critical
 * checks deliberately fail closed when the database or expected schema is not
 * available.
 */

import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { prisma } from '@/src/db/client';

const SESSION_TOKEN_LENGTH = 32;
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_TOKEN_PATTERN = /^[a-f0-9]{64}$/;

function isDbUnreachable(error: unknown): boolean {
  const code =
    error && typeof error === 'object' && 'code' in error && typeof (error as { code?: unknown }).code === 'string'
      ? String((error as { code: string }).code)
      : '';

  if (code === 'P1001' || code === '53300') return true;

  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const lowered = message.toLowerCase();
  return (
    lowered.includes("can't reach database server") ||
    lowered.includes('cannot reach database server') ||
    lowered.includes('too many connections') ||
    lowered.includes('too many clients already') ||
    lowered.includes('remaining connection slots are reserved') ||
    lowered.includes('connection terminated unexpectedly') ||
    lowered.includes('econnrefused') ||
    lowered.includes('etimedout')
  );
}

function generateSessionToken(): string {
  return crypto.randomBytes(SESSION_TOKEN_LENGTH).toString('hex');
}

function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createSession(
  userId: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<string> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.authSession.create({
    data: {
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt,
      ipAddress: ipAddress?.slice(0, 128),
      userAgent: userAgent?.slice(0, 512),
    },
  });

  const cookieStore = await cookies();
  cookieStore.set('session_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION_MS / 1000,
    path: '/',
    priority: 'high',
  });

  return token;
}

export async function validateSession(token: string): Promise<string | null> {
  if (!SESSION_TOKEN_PATTERN.test(token)) return null;

  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      user: {
        select: {
          status: true,
          suspensionUntil: true,
          deletedAt: true,
        },
      },
    },
  });

  if (!session) return null;

  if (
    session.expiresAt.getTime() <= Date.now() ||
    session.user.deletedAt
  ) {
    await prisma.authSession.deleteMany({ where: { id: session.id } });
    return null;
  }

  if (
    session.user.status === 'SUSPENDED' &&
    session.user.suspensionUntil &&
    session.user.suspensionUntil.getTime() <= Date.now()
  ) {
    await prisma.user.update({
      where: { id: session.userId },
      data: { status: 'ACTIVE', suspensionUntil: null, suspensionReason: null },
      select: { id: true },
    });
  }

  return session.userId;
}

export async function getCurrentSession(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  if (!token) return null;

  try {
    const userId = await validateSession(token);
    if (userId) return userId;
  } catch (error) {
    if (!isDbUnreachable(error)) throw error;
  }

  try {
    cookieStore.delete('session_token');
  } catch {
    // Cookie mutation can be disallowed during some render phases.
  }
  return null;
}

export async function deleteSession(token?: string): Promise<void> {
  const cookieStore = await cookies();
  const sessionToken = token || cookieStore.get('session_token')?.value;

  if (sessionToken && SESSION_TOKEN_PATTERN.test(sessionToken)) {
    await prisma.authSession.deleteMany({
      where: { tokenHash: hashSessionToken(sessionToken) },
    });
  }

  cookieStore.delete('session_token');
}
