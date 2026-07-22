#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { parse } from 'dotenv';

const envPath = '.env.local';
const localDatabaseUrl = [
  'postgresql://oyrenoyret:',
  'oyrenoyret_local_only',
  '@127.0.0.1:5434/oyrenoyret_dev',
].join('');

if (existsSync(envPath)) {
  const localEnv = parse(readFileSync(envPath));
  const configuredUrls = [
    localEnv.DATABASE_URL,
    localEnv.DATABASE_PRISMA_DATABASE_URL,
  ].filter(Boolean);

  if (configuredUrls.some((value) => value !== localDatabaseUrl)) {
    console.error(
      '.env.local contains a different database target. Back it up or remove it before selecting the Docker development database.',
    );
    process.exit(1);
  }

  if (configuredUrls.length === 2) {
    console.log('.env.local already selects the Docker development database.');
    process.exit(0);
  }

  console.error('.env.local exists but does not contain both local database variables.');
  process.exit(1);
}

await writeFile(
  envPath,
  [
    '# Local development database managed by compose.yml.',
    `DATABASE_URL=${localDatabaseUrl}`,
    `DATABASE_PRISMA_DATABASE_URL=${localDatabaseUrl}`,
    '',
  ].join('\n'),
  { encoding: 'utf8', mode: 0o600, flag: 'wx' },
);

console.log('Created an ignored .env.local for the Docker development database.');
