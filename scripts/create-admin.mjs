#!/usr/bin/env node
/**
 * Create or update an ADMIN user with a bcrypt-hashed password.
 *
 * Usage:
 *   - Recommended (no secrets in shell history; hashes plaintext):
 *     read -s "pw?Admin password: "; echo
 *     ADMIN_PLAINTEXT_PASSWORD="$pw" node scripts/create-admin.mjs --email office@oyrenoyret.org
 *     unset pw
 *
 *   - Using an existing bcrypt hash from your environment (no plaintext needed):
 *     ADMIN_EMAIL=office@oyrenoyret.org ADMIN_PASSWORD_HASH='$2b$12$...' node scripts/create-admin.mjs
 *
 *   - Explicit hash arg:
 *     node scripts/create-admin.mjs --email office@oyrenoyret.org --password-hash '$2b$12$...'
 *
 * Remote databases additionally require the explicit --allow-remote flag.
 */

import './load-env.mjs';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { assertExplicitRemoteDatabaseAccess } from './database-target-safety.mjs';

const allowRemote = process.argv.includes('--allow-remote');
assertExplicitRemoteDatabaseAccess({
  databaseUrl: process.env.DATABASE_URL,
  allowRemote,
  operation: 'create or update an admin user',
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.PG_POOL_MAX ?? 10),
  idleTimeoutMillis: Number(process.env.PG_POOL_IDLE ?? 10000),
  connectionTimeoutMillis: Number(process.env.PG_POOL_TIMEOUT ?? 10000),
  allowExitOnIdle: true,
  keepAlive: true,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, errorFormat: 'pretty' });

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return null;
  const next = process.argv[idx + 1];
  if (!next || next.startsWith('--')) return null;
  return next;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

async function main() {
  const emailArg = getArgValue('--email');
  const passwordHashArg = getArgValue('--password-hash');
  const plaintextPassword = process.env.ADMIN_PLAINTEXT_PASSWORD || null;
  delete process.env.ADMIN_PLAINTEXT_PASSWORD;
  const emailRaw = emailArg || process.env.ADMIN_EMAIL || null;
  const force = hasFlag('--force');

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to create an admin user.');
  }

  const email = String(emailRaw ?? '').trim().toLowerCase();
  if (!email) {
    throw new Error('Missing email. Pass --email or set ADMIN_EMAIL.');
  }
  if (email.length > 254 || !/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error('Admin email is invalid.');
  }

  const envHash = process.env.ADMIN_PASSWORD_HASH?.trim() || null;
  const passwordHashRaw = passwordHashArg ? String(passwordHashArg).trim() : null;

  if (!plaintextPassword && !passwordHashRaw && !envHash) {
    throw new Error(
      'Missing password. Provide ADMIN_PLAINTEXT_PASSWORD, or provide ADMIN_PASSWORD_HASH / --password-hash.',
    );
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, deletedAt: true },
  });

  if (existing && existing.role !== 'ADMIN' && !force) {
    throw new Error(
      `User ${email} exists with role=${existing.role}. Re-run with --force to promote to ADMIN.`,
    );
  }

  let passwordHash = '';
  if (passwordHashRaw || (!plaintextPassword && envHash)) {
    passwordHash = (passwordHashRaw || envHash || '').trim();
    if (!passwordHash.startsWith('$2') || passwordHash.length < 40) {
      throw new Error('Provided password hash does not look like a bcrypt hash.');
    }
    let rounds = 0;
    try {
      rounds = bcrypt.getRounds(passwordHash);
    } catch {
      throw new Error('Provided password hash is not a valid bcrypt hash.');
    }
    if (rounds < 12) {
      throw new Error('Provided bcrypt hash must use a cost factor of at least 12.');
    }
  } else {
    const plaintextBytes = Buffer.byteLength(String(plaintextPassword), 'utf8');
    if (
      plaintextBytes < 12 ||
      plaintextBytes > 72 ||
      !/[a-z]/.test(String(plaintextPassword)) ||
      !/[A-Z]/.test(String(plaintextPassword)) ||
      !/[0-9]/.test(String(plaintextPassword)) ||
      !/[^A-Za-z0-9]/.test(String(plaintextPassword))
    ) {
      throw new Error(
        'Admin password must be 12-72 bytes and include upper, lower, number, and symbol characters.',
      );
    }
    passwordHash = await bcrypt.hash(String(plaintextPassword), 12);
  }

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email },
      create: {
        email,
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
        registrationStep: 5,
        emailVerifiedAt: new Date(),
      },
      update: {
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
        registrationStep: 5,
        emailVerifiedAt: new Date(),
        deletedAt: null,
      },
      select: { id: true, email: true, role: true, status: true },
    });
    const revoked = await tx.authSession.deleteMany({
      where: { userId: user.id },
    });
    return { user, sessionsRevoked: revoked.count };
  });

  const [localPart, domain = ''] = result.user.email.split('@');
  const maskedEmail = `${localPart?.slice(0, 1) || '*'}***@${domain}`;
  console.log(
    `Admin user ensured: ${maskedEmail} role=${result.user.role} status=${result.user.status}; revoked ${result.sessionsRevoked} existing session(s).`,
  );
}

main()
  .catch((error) => {

    console.error('Admin create/update failed:', error?.message ?? error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
