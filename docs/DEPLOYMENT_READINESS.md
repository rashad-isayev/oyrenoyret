# Deployment readiness runbook

This runbook is the release gate for Oyrenoyret. It is hosting-provider agnostic and does not connect the repository to a deployment service.

## Automated gates

Run the complete code and supply-chain check from a clean checkout:

```bash
npm ci --ignore-scripts
npm run db:generate
npm run readiness:check
```

`readiness:check` scans the entire reachable Git history for common credentials, audits production dependencies, type-checks, runs security regression tests, validates Prisma, lints, and performs a production build. The command stops at the first failure.

For a running staging instance, also run:

```bash
BASE_URL=https://staging.example.com npm run security:smoke
```

The smoke test verifies the health route, security headers, cross-origin write rejection, rejection of unauthenticated origin-less cron calls, private discussion reads, and oversized JSON rejection. Authenticated role, ban-state, and ownership tests still require dedicated staging accounts.

## Database safety gate

Database-changing operator scripts refuse non-local targets unless the operator
passes `--allow-remote`. Treat that flag as an approval boundary: confirm the
target, take a verified backup, and obtain production change approval first.
Admin creation or promotion also revokes the account's existing sessions.

Create a local backup without putting the database password on the command line:

```bash
npm run db:backup:local
```

Remote backup requires explicit approval:

```bash
node scripts/backup-database.mjs --allow-remote
```

The helper writes a unique custom-format PostgreSQL dump under `/private/tmp` by default and refuses to overwrite an existing file. A backup is not verified until it has been restored into a disposable database and tested.

For a local dump, automate that restore test with:

```bash
BACKUP_PATH=/private/tmp/your-backup.dump npm run db:verify-backup
```

The verifier creates a randomly named local database, restores the archive, checks the restored schema, and removes only that disposable database.

After a successful restore test:

```bash
npx prisma migrate status
npx prisma migrate deploy
npx prisma migrate status
```

Never use `prisma db push` against staging or production. The hardening migration signs out all users and invalidates outstanding guardian codes. If the migration or smoke tests fail, stop traffic and restore the database backup before running an older application that expects the removed legacy columns.

## Production configuration gate

Production configuration must pass:

```bash
NODE_ENV=production npm run env:check
```

The validator requires:

- a non-local PostgreSQL URL;
- an exact HTTPS application origin;
- separate authentication, registration, guardian-code, and cron secrets;
- Resend sender configuration;
- a private Cloudflare R2 bucket and account-scoped endpoint;
- Upstash Redis for distributed rate limiting;
- a client-IP header overwritten by the trusted reverse proxy;
- database TLS that cannot be disabled; and
- no secret-like `NEXT_PUBLIC_*` variables.

Secrets belong in the hosting provider's encrypted secret manager, never in GitHub, `.env.example`, build logs, tickets, or chat messages.

## Private upload gate

The R2 bucket must have public access disabled. Grant the application key access only to the required private bucket. CORS must permit only `PUT`, only the exact application origins, and only the headers documented in `README.md`. Configure lifecycle cleanup for abandoned presigned uploads.

Before release, verify with separate accounts that users cannot read another student's sprint submission, malformed keys are rejected, oversized objects are not served, and direct public bucket URLs do not work.

## GitHub gate

The repository contains CODEOWNERS, a pull-request security checklist, weekly Dependabot checks, and a SHA-pinned security workflow. Repository administrators must additionally enable branch protection, required status checks, secret scanning/push protection, private vulnerability reporting, and strong authentication for maintainers.

## Production sequence

1. Freeze database-changing deployments and announce the sign-out window.
2. Record the exact Git commit and application artifact.
3. Take a fresh backup and successfully restore it into a disposable database.
4. Confirm migration status and the exact remote database target.
5. Enable maintenance mode or stop application writes.
6. Run `npx prisma migrate deploy` with the approved migration credential.
7. Deploy the exact verified application artifact.
8. Run the unauthenticated HTTP smoke test and authenticated role/ownership tests.
9. Re-enable traffic only after all checks pass.
10. Monitor authentication, rate limiting, database TLS, email, uploads, moderation, and credit transactions.

## Owner-only release approval

The owner must supply or approve the following because they involve external accounts, sensitive production data, money, legal responsibility, or availability:

- production and staging infrastructure/provider selection;
- production secrets and credential rotation;
- DNS and HTTPS certificates;
- Resend domain ownership, SPF, DKIM, and DMARC;
- Upstash and private R2 account/bucket provisioning;
- trusted reverse-proxy configuration;
- production database identity, backup retention, restore approval, and migration window;
- reconciliation decisions if the preflight reports financial/application conflicts;
- GitHub repository security settings and collaborator access;
- maintenance communication, go/no-go approval, and rollback authority; and
- an external authenticated penetration test before a large public launch.

## Deferred hardening backlog

- Replace CSP `unsafe-inline` with nonces or hashes where framework support permits.
- Add malware scanning before supporting broader file formats.
- Add centralized security-event monitoring and alerting.
- Review production IAM, network boundaries, database grants, DNS, email, Redis, and R2 with live infrastructure access.
