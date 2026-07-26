#!/usr/bin/env node
/**
 * Lightweight secret scan for committed files and, optionally, Git history.
 *
 * Goal: catch obvious secret leaks before they hit the repo history.
 * - Scans tracked and unignored files (`git ls-files`)
 * - Pass `--history=<ref>` to scan every unique blob reachable from a ref
 * - Avoids printing matched secret values
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function listCandidateFiles() {
  const out = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  return out
    .toString('utf8')
    .split('\0')
    .map((s) => s.trim())
    .filter(Boolean);
}

function isBinary(buf) {
  // If it contains a NUL byte, treat as binary.
  return buf.includes(0);
}

function countNewlines(str, endIndex) {
  let count = 0;
  for (let i = 0; i < endIndex; i += 1) {
    if (str.charCodeAt(i) === 10) count += 1;
  }
  return count;
}

const patterns = [
  { name: 'Private key', re: /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/g },
  { name: 'PGP private key', re: /-----BEGIN PGP\s+PRIVATE KEY BLOCK-----/g },
  { name: 'AWS access key id', re: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: 'Slack token', re: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/g },
  { name: 'GitHub token', re: /\b(?:ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{20,})\b/g },
  { name: 'GitLab token', re: /\bglpat-[A-Za-z0-9_-]{20,}\b/g },
  { name: 'npm token', re: /\bnpm_[A-Za-z0-9]{30,}\b/g },
  { name: 'OpenAI-style key', re: /\bsk-[A-Za-z0-9]{20,}\b/g },
  { name: 'Stripe secret key', re: /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/g },
  { name: 'Google API key', re: /\bAIza[0-9A-Za-z_-]{30,}\b/g },
  { name: 'SendGrid key', re: /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/g },
  { name: 'JSON web token', re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g },
  { name: 'Postgres URL with credentials', re: /\bpostgres(?:ql)?:\/\/[^/\s]+:[^@\s]+@/gi },
  { name: 'MySQL URL with credentials', re: /\bmysql:\/\/[^/\s]+:[^@\s]+@/gi },
  { name: 'MongoDB URL with credentials', re: /\bmongodb(?:\+srv)?:\/\/[^/\s]+:[^@\s]+@/gi },
  { name: 'Redis URL with credentials', re: /\bredis(?:s)?:\/\/[^/\s]*:[^@\s]+@/gi },
  { name: 'AMQP URL with credentials', re: /\bamqps?:\/\/[^/\s]+:[^@\s]+@/gi },
  { name: 'npm auth token assignment', re: /\/\/:_authToken\s*=\s*[^\s${][^\s]*/gi },
];

function isForbiddenEnvFile(path) {
  const normalized = path.replace(/\\/g, '/');
  if (!/(^|\/)\.env(\.|$)/.test(normalized)) return false;
  return !normalized.endsWith('.example');
}

function isSensitiveCredentialFile(path) {
  const normalized = path.replace(/\\/g, '/').toLowerCase();
  return (
    /(?:^|\/)(?:id_rsa|id_dsa|id_ecdsa|id_ed25519)$/.test(normalized) ||
    /\.(?:p12|pfx|jks|keystore)$/.test(normalized) ||
    /(?:^|\/)(?:service-account|service_account|credentials)\.json$/.test(normalized)
  );
}

function shouldSkipPath(path) {
  const normalized = path.replace(/\\/g, '/');
  return (
    normalized.startsWith('node_modules/') ||
    normalized.startsWith('.next/') ||
    normalized.startsWith('.git/')
  );
}

function scanText(text, file, findings, objectId) {
  for (const { name, re } of patterns) {
    re.lastIndex = 0;
    const match = re.exec(text);
    if (!match) continue;

    const idx = match.index ?? 0;
    const line = countNewlines(text, idx) + 1;
    findings.push({
      file,
      line,
      reason: `Possible secret pattern: ${name}${objectId ? ` (historical object ${objectId.slice(0, 12)})` : ''}`,
    });
  }
}

function scanHistory(ref, findings) {
  const objectLines = execFileSync('git', ['rev-list', '--objects', ref], {
    stdio: ['ignore', 'pipe', 'ignore'],
    maxBuffer: 100 * 1024 * 1024,
  })
    .toString('utf8')
    .split('\n')
    .filter(Boolean);

  const pathsByObject = new Map();
  for (const line of objectLines) {
    const separator = line.indexOf(' ');
    const objectId = separator >= 0 ? line.slice(0, separator) : line;
    const path = separator >= 0 ? line.slice(separator + 1) : '';
    if (!pathsByObject.has(objectId)) pathsByObject.set(objectId, []);
    if (path) pathsByObject.get(objectId).push(path);
  }

  const objectIds = [...pathsByObject.keys()];
  const checks = execFileSync(
    'git',
    ['cat-file', '--batch-check=%(objectname) %(objecttype) %(objectsize)'],
    {
      input: `${objectIds.join('\n')}\n`,
      stdio: ['pipe', 'pipe', 'ignore'],
      maxBuffer: 100 * 1024 * 1024,
    },
  )
    .toString('utf8')
    .trim()
    .split('\n');

  for (const check of checks) {
    const [objectId, type, sizeRaw] = check.split(' ');
    const size = Number(sizeRaw);
    if (type !== 'blob' || !Number.isSafeInteger(size) || size > 10_000_000) continue;

    const paths = (pathsByObject.get(objectId) ?? []).filter((path) => !shouldSkipPath(path));
    if (paths.length === 0) continue;
    for (const path of paths) {
      if (isForbiddenEnvFile(path)) {
        findings.push({ file: path, line: 1, reason: `Committed .env file in history (${objectId.slice(0, 12)})` });
      }
      if (isSensitiveCredentialFile(path)) {
        findings.push({ file: path, line: 1, reason: `Credential/key container in history (${objectId.slice(0, 12)})` });
      }
    }

    const buf = execFileSync('git', ['cat-file', 'blob', objectId], {
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 10_000_001,
    });
    if (isBinary(buf)) continue;
    scanText(buf.toString('utf8'), paths[0], findings, objectId);
  }
}

function main() {
  const files = listCandidateFiles().filter((f) => !shouldSkipPath(f));

  const findings = [];

  for (const file of files) {
    if (isForbiddenEnvFile(file)) {
      findings.push({ file, line: 1, reason: 'Tracked .env file (should not be committed)' });
      continue;
    }
    if (isSensitiveCredentialFile(file)) {
      findings.push({ file, line: 1, reason: 'Credential/key container should not be committed' });
      continue;
    }

    let buf;
    try {
      buf = readFileSync(file);
    } catch {
      continue;
    }

    if (buf.length > 10_000_000) continue;
    if (isBinary(buf)) continue;

    scanText(buf.toString('utf8'), file, findings);
  }

  const historyArg = process.argv.find((arg) => arg.startsWith('--history='));
  if (historyArg) {
    const ref = historyArg.slice('--history='.length).trim();
    if (!ref || ref.startsWith('-')) throw new Error('Invalid Git history ref');
    scanHistory(ref, findings);
  }

  if (findings.length > 0) {
    // Do not print matched values; only locations and pattern names.

    console.error('Secret scan failed. Review and remove/rotate secrets:\n');
    for (const f of findings) {

      console.error(`- ${f.file}:${f.line} — ${f.reason}`);
    }
    process.exit(1);
  }


  console.log('Secret scan passed.');
}

main();
