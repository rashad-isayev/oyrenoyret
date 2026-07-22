#!/usr/bin/env node

import 'dotenv/config';
import { Pool } from 'pg';

const allowRemote = process.argv.includes('--allow-remote');
const databaseUrl = String(process.env.DATABASE_URL ?? '').trim();

if (!databaseUrl) {
  console.error('DATABASE_URL is required. No database changes were made.');
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(databaseUrl);
} catch {
  console.error('DATABASE_URL is invalid. No database changes were made.');
  process.exit(1);
}

const localHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);
const isLocal = localHosts.has(parsed.hostname);
if (!isLocal && !allowRemote) {
  console.error('Refusing to inspect a remote database without --allow-remote.');
  process.exit(1);
}

const checks = [
  {
    name: 'duplicate credit transaction references',
    sql: `
      SELECT COUNT(*)::int AS count
      FROM (
        SELECT "userId", "type", "referenceId"
        FROM "CreditTransaction"
        WHERE "referenceId" IS NOT NULL
        GROUP BY "userId", "type", "referenceId"
        HAVING COUNT(*) > 1
      ) AS duplicates
    `,
  },
  {
    name: 'duplicate sprint payout ranks',
    sql: `
      SELECT COUNT(*)::int AS count
      FROM (
        SELECT "referenceId"
        FROM "CreditTransaction"
        WHERE "type" = 'SPRINT_PAYOUT'
        GROUP BY "referenceId"
        HAVING COUNT(*) > 1
      ) AS duplicates
    `,
  },
  {
    name: 'users with multiple sprint ranks in one event',
    sql: `
      SELECT COUNT(*)::int AS count
      FROM (
        SELECT "userId", split_part("referenceId", ':rank:', 1)
        FROM "CreditTransaction"
        WHERE "type" = 'SPRINT_PAYOUT'
        GROUP BY "userId", split_part("referenceId", ':rank:', 1)
        HAVING COUNT(*) > 1
      ) AS duplicates
    `,
  },
  {
    name: 'users with multiple open facilitator applications',
    sql: `
      SELECT COUNT(*)::int AS count
      FROM (
        SELECT "userId"
        FROM "FacilitatorApplication"
        WHERE "deletedAt" IS NULL
          AND "status" IN ('PENDING', 'CHANGES_REQUESTED')
        GROUP BY "userId"
        HAVING COUNT(*) > 1
      ) AS duplicates
    `,
  },
];

const pool = new Pool({
  connectionString: databaseUrl,
  max: 1,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 5_000,
  application_name: 'oyrenoyret-security-preflight',
});

let failed = false;
try {
  const client = await pool.connect();
  try {
    await client.query('BEGIN TRANSACTION READ ONLY');
    await client.query(`SET LOCAL statement_timeout = '15s'`);
    for (const check of checks) {
      const result = await client.query(check.sql);
      const count = Number(result.rows[0]?.count ?? 0);
      if (count > 0) {
        failed = true;
        console.error(`FAIL: ${check.name} (${count} conflicting group${count === 1 ? '' : 's'})`);
      } else {
        console.log(`PASS: ${check.name}`);
      }
    }
    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
} catch (error) {
  const code =
    error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
      ? error.code
      : 'UNKNOWN';
  console.error(`Database preflight could not complete (code ${code}). No database changes were made.`);
  process.exitCode = 1;
} finally {
  await pool.end();
}

if (failed) {
  console.error('Security migration is blocked until conflicting records are reconciled.');
  process.exitCode = 1;
} else if (!process.exitCode) {
  console.log(`Database security preflight passed for the ${isLocal ? 'local' : 'explicitly approved remote'} database.`);
}
