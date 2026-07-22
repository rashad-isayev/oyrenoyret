#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const checks = [
  ['npm', ['run', 'security:scan:history']],
  ['npm', ['run', 'security:audit']],
  ['npm', ['run', 'typecheck']],
  ['npm', ['run', 'test:security']],
  ['npx', ['prisma', 'validate']],
  ['npm', ['run', 'lint']],
  ['npm', ['run', 'build']],
];

for (const [command, args] of checks) {
  console.log(`\n=== ${command} ${args.join(' ')} ===`);
  const result = spawnSync(command, args, { stdio: 'inherit', env: process.env });
  if (result.error || result.status !== 0) {
    console.error(`Release readiness failed at: ${command} ${args.join(' ')}`);
    process.exit(result.status || 1);
  }
}

console.log('\nRelease readiness checks passed. Database, infrastructure, and authenticated smoke tests remain separate gates.');
