#!/usr/bin/env node

import './load-env.mjs';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { Pool } from 'pg';

const databaseUrl = String(process.env.DATABASE_URL ?? '').trim();
const backupPathInput = String(process.env.BACKUP_PATH ?? '').trim();
if (!databaseUrl || !backupPathInput) {
  console.error('DATABASE_URL and an existing BACKUP_PATH are required.');
  process.exit(1);
}
const backupPath = path.resolve(backupPathInput);
if (!existsSync(backupPath)) {
  console.error('DATABASE_URL and an existing BACKUP_PATH are required.');
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(databaseUrl);
} catch {
  console.error('DATABASE_URL is invalid.');
  process.exit(1);
}

const localHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);
if (!localHosts.has(parsed.hostname)) {
  console.error('Backup restore verification is restricted to the local database server.');
  process.exit(1);
}

const verifyDatabase = `oyrenoyret_restore_verify_${randomBytes(6).toString('hex')}`;
const adminPool = new Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 10_000 });
let created = false;

try {
  await adminPool.query(`CREATE DATABASE "${verifyDatabase}"`);
  created = true;

  const versionResult = await adminPool.query('SHOW server_version_num');
  const serverMajor = Math.floor(Number(versionResult.rows[0]?.server_version_num) / 10_000);
  const dockerEnv = {
    ...process.env,
    PGHOST: 'host.docker.internal',
    PGPORT: parsed.port || '5432',
    PGUSER: decodeURIComponent(parsed.username),
    PGPASSWORD: decodeURIComponent(parsed.password),
  };
  const sslMode = parsed.searchParams.get('sslmode') || process.env.PG_SSLMODE;
  if (sslMode) dockerEnv.PGSSLMODE = sslMode;

  const backupDirectory = path.dirname(backupPath);
  const backupName = path.basename(backupPath);
  const restore = spawnSync(
    'docker',
    [
      'run',
      '--rm',
      '--volume',
      `${backupDirectory}:/backup:ro`,
      '--env',
      'PGHOST',
      '--env',
      'PGPORT',
      '--env',
      'PGUSER',
      '--env',
      'PGPASSWORD',
      '--env',
      'PGSSLMODE',
      `postgres:${serverMajor}-alpine`,
      'pg_restore',
      '--exit-on-error',
      '--no-owner',
      '--no-privileges',
      '--dbname',
      verifyDatabase,
      `/backup/${backupName}`,
    ],
    { env: dockerEnv, stdio: ['ignore', 'inherit', 'inherit'] },
  );
  if (restore.error || restore.status !== 0) throw new Error('RESTORE_FAILED');

  const verifyUrl = new URL(databaseUrl);
  verifyUrl.pathname = `/${verifyDatabase}`;
  const verifyPool = new Pool({ connectionString: verifyUrl.toString(), max: 1 });
  try {
    const result = await verifyPool.query(
      `SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public'`,
    );
    const tableCount = Number(result.rows[0]?.count ?? 0);
    if (tableCount < 10) throw new Error('RESTORE_INCOMPLETE');
    console.log(`Backup restore verification passed (${tableCount} public tables).`);
  } finally {
    await verifyPool.end();
  }
} catch (error) {
  const code = error instanceof Error ? error.message : 'UNKNOWN';
  console.error(`Backup restore verification failed (${code}).`);
  process.exitCode = 1;
} finally {
  if (created) {
    await adminPool.query(`DROP DATABASE IF EXISTS "${verifyDatabase}" WITH (FORCE)`);
  }
  await adminPool.end();
}
