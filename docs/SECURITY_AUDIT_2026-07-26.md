# Security audit and remediation report

Date: 2026-07-26
Target: `rashad-isayev/oyrenoyret` and the local working tree
Audit branch: `codex/development-security-audit-2026-07-26`

## Executive summary

The application and repository were reviewed as a Next.js application handling
student accounts, personal data, community content, moderation data, and
private object storage. The review covered the current source tree, reachable
Git history, dependency lockfile, GitHub workflow files, database schema and
migrations, operator scripts, and the rendered route manifest.

Eleven concrete security weaknesses were confirmed and remediated. The most
important were unauthenticated access to discussion content, direct API access
by banned accounts, teacher access to contact-message personal data, and a
presigned-upload contract that did not cryptographically bind the declared
file length. Regression tests and an expanded HTTP smoke test now cover the
new boundaries.

After remediation, no unresolved Critical or High finding was identified in
the source and repository configuration that could be tested locally. This is
not a guarantee that the system is vulnerability-free. Live GitHub security
settings, production infrastructure, authenticated multi-role staging
behavior, and a current online advisory service remain separate release gates.

## Scope and method

The review included:

- 320 visible first-party, configuration, documentation, and migration files;
- 29 Next.js API route modules and all methods exported by them;
- authentication, session, onboarding, settings, moderation, reporting,
  discussion, presence, cron, upload, and public-contact paths;
- 34 Prisma migrations and the current PostgreSQL schema;
- browser/server module boundaries and every client module for secret-bearing
  imports;
- GitHub Actions, Dependabot, CODEOWNERS, the security policy, and deployment
  runbook;
- current files and all blobs reachable from `HEAD` for common credential
  patterns;
- direct and transitive dependencies represented by `package-lock.json`;
- use of raw SQL, HTML injection sinks, process execution, external network
  calls, cookies, security headers, rate limits, and request-body parsing; and
- local static checks, unit security tests, a production build, and HTTP smoke
  tests against the development server.

Testing was non-destructive. No production accounts, production database,
private R2 bucket, or other live infrastructure was accessed.

## Architecture and trust boundaries

The application is a single Next.js 16 App Router service using:

- custom opaque cookie sessions whose hashes are stored in PostgreSQL;
- Prisma 7 with PostgreSQL;
- Upstash Redis for production rate limiting and presence;
- Resend for verification and password email;
- private Cloudflare R2 storage with direct presigned browser uploads; and
- Vercel-compatible middleware and build configuration.

The principal trust boundaries are:

1. browser to Next.js proxy, Server Actions, and route handlers;
2. application server to PostgreSQL, Redis, Resend, and R2;
3. operator scripts to local or remote PostgreSQL;
4. repository and lockfile to npm and GitHub Actions dependencies; and
5. administrator and teacher roles to student, contact, report, and moderation
   data.

Sensitive assets include passwords, session and verification tokens, student
names and account state, guardian consent records, contact email and message
content, moderation reports, private discussion content, and private uploaded
images.

Threat actors considered include an unauthenticated internet user, an
authenticated or automated student account, a suspended or banned account, a
teacher attempting an admin route, a compromised browser session, an operator
targeting the wrong database, and a malicious or compromised dependency.

## Confirmed findings and remediation

| ID | Severity | Finding | Remediation and verification |
| --- | --- | --- | --- |
| SEC-01 | High | Discussion list and detail APIs returned student names and content without authentication. The list also treated session lookup errors as anonymous access. | Both routes now fail closed with `401`, use private no-store responses, and require centralized protected-content access. The HTTP smoke test verifies both endpoints. |
| SEC-02 | High | Banned sessions were retained for the restriction UX but could call discussion, profile-card, presence, report-list, and media APIs directly. | A shared protected-content check now rejects banned and deleted accounts. It is applied to every protected read surface while preserving read-only access for suspended accounts as intended by the product UX. Admin data requires an active administrator. |
| SEC-03 | High | The admin layout had no authorization boundary and individual pages treated teachers as staff, exposing up to 200 contact messages with names and email addresses. | The layout and each page now require an active `ADMIN`. Teacher-facing admin navigation was removed. Admin API checks remain server-side. |
| SEC-04 | High | A discussion upload URL validated a requested size but did not sign `Content-Length`, allowing an authenticated client to upload a much larger R2 object and create storage-cost pressure. | The R2 `PutObject` signature now binds the exact declared byte length. A regression test verifies `content-length` appears in the signed-header set. |
| SEC-05 | Medium | Uploaded files were served based on extension and metadata without checking image magic bytes. | The bounded 4 MB object is checked for JPEG, PNG, or WebP signature and must match the extension-derived MIME type before it is served with `nosniff`. |
| SEC-06 | Medium | Route handlers used unbounded `request.json()` parsing. Chunked requests could bypass a simple `Content-Length` check and consume excessive memory. | All JSON route handlers now use one streaming, byte-bounded parser. Small payloads are limited to 32 KiB and rich discussion payloads to 1 MiB. Declared and chunked oversize cases are tested, and Server Actions have an explicit 1 MiB limit. |
| SEC-07 | Medium | Promoting or resetting an admin password left existing sessions active, and database-changing operator scripts could target a remote database without an explicit safety flag. | Admin upsert and session revocation now occur in one transaction. Admin creation and verification reset refuse remote targets unless `--allow-remote` is passed. Admin passwords and bcrypt hashes receive stronger validation, and CLI output no longer prints the user ID or full email. |
| SEC-08 | Medium | Password-reset requests were limited only by client address. Distributed requests could repeatedly invalidate a user's newest reset token and send repeated email. | A privacy-preserving SHA-256 email-keyed limit now complements the address limit without revealing account existence. |
| SEC-09 | Medium | Each discussion stream performed two database reads every two seconds and used the general connection budget, enabling avoidable database pressure. | Revision checks now use one query every ten seconds and a dedicated connection budget aligned with the 55-second reconnect lifecycle. |
| SEC-10 | Low | Discussion search accepted very long queries and arbitrarily large offsets, and unexpected database messages could be returned outside development. | Search input is limited to 200 characters, offsets are capped at 10,000, and production error responses use generic public messages. |
| SEC-11 | High | A newly published denial-of-service advisory affected `brace-expansion` copies in the development lint chain. npm reported 15 vulnerable dependency paths, although production dependencies were not affected. | All legacy and modern lint callers are routed through the official patched 5.0.8 implementation by a compatibility adapter. Callable legacy behavior, modern exports, lint, and the production build are regression-tested. The advisory is [GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg). |

## Existing controls confirmed

The audit also confirmed the following controls were already present or had
been introduced in the current working tree:

- opaque 256-bit session tokens are stored only as hashes, use `HttpOnly`,
  `SameSite=Lax`, and production `Secure` cookies, and are revoked on password
  or email credential changes;
- password and email-verification tokens are random, hashed, expiring,
  single-use, and claimed atomically;
- bcrypt uses cost 12 and passwords are bounded by bcrypt's 72-byte limit;
- unsafe API methods are restricted to trusted same-origin requests, with a
  timing-safe bearer exception for cron;
- production rate limiting fails closed when distributed Redis protection is
  unavailable;
- production database TLS and certificate verification cannot be disabled;
- R2 endpoints are account-scoped, object keys are namespace-constrained, and
  the configured bucket must be private;
- discussion rich HTML is allowlisted and sanitized on both server and client;
- no unsafe Prisma raw-query API is used, and parameterized full-text SQL uses
  `Prisma.sql`;
- security headers include HSTS, CSP, frame denial, MIME sniffing prevention,
  a strict referrer policy, and a restrictive permissions policy;
- `.env` files are ignored and only placeholder configuration is tracked;
- the lockfile uses npm registry artifacts with integrity values and contains
  no git or arbitrary remote package source;
- GitHub Actions use read-only repository permissions, SHA-pinned actions,
  disabled checkout credential persistence, script-disabled installation,
  history secret scanning, dependency audit, type checking, security tests,
  lint, and a production build; and
- Dependabot, CODEOWNERS, a security policy, and a deployment runbook exist.

## Verification results

The following checks passed after remediation:

- `npm ci --ignore-scripts --offline` — clean script-disabled install;
- npm's online install audit — 0 vulnerabilities across production and
  development dependencies after the `brace-expansion` remediation;
- `npm audit --offline --audit-level=low` — 0 advisories in the refreshed local
  advisory data;
- `npm run security:scan` — no credential pattern in current files;
- `npm run security:scan:history` — no credential pattern in reachable history;
- `npm run test:security` — all security regression tests passed;
- `npm run typecheck` — passed;
- `npm run lint` — passed;
- `npx prisma validate` — schema valid;
- `npm run build` — production build passed; and
- `BASE_URL=http://localhost:3000 npm run security:smoke` — passed, including
  security headers, cross-origin write denial, cron authentication, private
  discussion reads, and oversized JSON denial.

The production environment validator intentionally rejected the local
development configuration. It requires a non-local TLS database, HTTPS
application origin, sufficiently strong secrets, distributed rate limiting,
private R2 configuration, and a trusted proxy address header before production
startup.

## GitHub repository posture

The fetched `origin/main` and local `main` both pointed to commit
`7b9485c689863ddde9fc71f60cb62001690e9e92` when the audit began. The repository
also exposed weekly Dependabot update branches for npm production/development
groups and SHA-pinned GitHub Actions updates.

The workflow was extended so pushes to `development` and `codex/**` branches
run the same security job as `main`, in addition to pull-request checks. This
lets the development audit branch receive the full remote dependency audit and
build before any main-branch merge.

Live repository settings and GitHub security-alert state could not be read
because an authenticated GitHub administration session was not available.
Before production approval, a repository administrator must verify:

- `main` branch protection or rulesets, required reviews, required security
  status checks, and force-push/deletion restrictions;
- secret scanning and push protection;
- Dependabot alerts and security updates;
- private vulnerability reporting;
- collaborator and GitHub App access; and
- strong authentication for every maintainer.

## Residual risk and release requirements

The following are not locally verifiable code defects, but remain required
release work:

- run the online dependency audit in GitHub Actions and resolve any new
  advisory published after the local cache was populated;
- test active, suspended, banned, teacher, and administrator staging accounts
  against every sensitive route;
- verify least-privilege PostgreSQL grants, R2 IAM and CORS, bucket privacy and
  lifecycle rules, Redis access, DNS, TLS, Resend SPF/DKIM/DMARC, log
  redaction, alerting, backup restore, and incident response in the live
  environment;
- obtain legal and child-safety review of declared age and guardian-authority
  consent because code cannot independently prove guardian identity;
- replace production CSP `unsafe-inline` with a framework-compatible nonce or
  hash design when feasible;
- add centralized security-event monitoring and alerting;
- add malware scanning before accepting broader upload formats; and
- conduct an independent authenticated penetration test before a large public
  launch.

Release should stop if the development-branch workflow, staging role tests,
environment validation, migration checks, or infrastructure review fails.
