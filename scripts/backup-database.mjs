#!/usr/bin/env node

import './load-env.mjs';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { access, unlink } from 'node:fs/promises';
import path from 'node:path';
import { Pool } from 'pg';

const allowRemote = process.argv.includes('--allow-remote');
const databaseUrl = String(process.env.DATABASE_URL ?? '').trim();
if (!databaseUrl) {
  console.error('DATABASE_URL is required.');
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
const isLocal = localHosts.has(parsed.hostname);
if (!isLocal && !allowRemote) {
  console.error('Refusing to back up a remote database without --allow-remote.');
  process.exit(1);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const requestedOutput = String(process.env.BACKUP_OUTPUT ?? '').trim();
const output = requestedOutput
  ? path.resolve(requestedOutput)
  : path.join('/private/tmp', `oyrenoyret-${timestamp}-${randomUUID().slice(0, 8)}.dump`);

if (existsSync(output)) {
  console.error('Backup destination already exists; refusing to overwrite it.');
  process.exit(1);
}

const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
if (!databaseName) {
  console.error('DATABASE_URL does not name a database.');
  process.exit(1);
}

const env = {
  ...process.env,
  PGHOST: parsed.hostname,
  PGPORT: parsed.port || '5432',
  PGUSER: decodeURIComponent(parsed.username),
  PGPASSWORD: decodeURIComponent(parsed.password),
};

const sslMode = parsed.searchParams.get('sslmode') || process.env.PG_SSLMODE;
if (sslMode) env.PGSSLMODE = sslMode;

const versionPool = new Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 10_000 });
let serverMajor;
try {
  const versionResult = await versionPool.query('SHOW server_version_num');
  serverMajor = Math.floor(Number(versionResult.rows[0]?.server_version_num) / 10_000);
} finally {
  await versionPool.end();
}

const localVersion = spawnSync('pg_dump', ['--version'], { encoding: 'utf8' });
const localMajor = Number(/(\d+)(?:\.\d+)?/.exec(localVersion.stdout ?? '')?.[1]);
const dumpArgs = ['--format=custom', '--no-owner', '--no-privileges', '--file', output, databaseName];

let result;
if (Number.isInteger(localMajor) && localMajor >= serverMajor) {
  result = spawnSync('pg_dump', dumpArgs, { env, stdio: ['ignore', 'inherit', 'inherit'] });
} else {
  const outputDirectory = path.dirname(output);
  const outputName = path.basename(output);
  const dockerEnv = {
    ...env,
    PGHOST: isLocal ? 'host.docker.internal' : parsed.hostname,
  };
  result = spawnSync(
    'docker',
    [
      'run',
      '--rm',
      '--volume',
      `${outputDirectory}:/backup`,
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
      'pg_dump',
      '--format=custom',
      '--no-owner',
      '--no-privileges',
      '--file',
      `/backup/${outputName}`,
      databaseName,
    ],
    { env: dockerEnv, stdio: ['ignore', 'inherit', 'inherit'] },
  );
}

if (result.error || result.status !== 0) {
  if (existsSync(output)) await unlink(output);
  console.error('Database backup failed.');
  process.exit(1);
}

await access(output);
console.log(`Database backup created at ${output}`);
console.log('Restore-test this file before treating it as a verified backup.');
