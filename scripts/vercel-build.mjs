import { execSync } from 'node:child_process';

// Runs the production build steps used by Vercel.
const run = (command, options = {}) => {
  execSync(command, { stdio: 'inherit', ...options });
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const isProduction =
    process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
  const requireMigrations = process.env.REQUIRE_DB_MIGRATIONS === '1' || isProduction;
  const skipMigrations = process.env.SKIP_DB_MIGRATIONS === '1';

  if (isProduction && skipMigrations) {
    throw new Error('SKIP_DB_MIGRATIONS is not allowed for production builds.');
  }

  if (!skipMigrations) {
    const migrationDatabaseUrl =
      process.env.MIGRATION_DATABASE_URL ??
      process.env.DIRECT_DATABASE_URL ??
      process.env.POSTGRES_URL_NON_POOLING ??
      process.env.POSTGRES_URL ??
      process.env.DIRECT_URL ??
      process.env.DATABASE_URL;

    const env = migrationDatabaseUrl
      ? { ...process.env, DATABASE_URL: migrationDatabaseUrl }
      : process.env;

    const isRetryableMigrationError = (err) => {
      const message = err instanceof Error ? err.message : String(err ?? '');
      return (
        /too many connections/i.test(message) ||
        /terminat(ed|ing) connection/i.test(message) ||
        /Connection terminated unexpectedly/i.test(message) ||
        /ECONNRESET|ETIMEDOUT|EAI_AGAIN/i.test(message)
      );
    };

    const maxAttempts = Number(
      process.env.PRISMA_MIGRATE_DEPLOY_RETRIES ?? (isProduction ? 10 : 2)
    );
    const baseDelayMs = Number(process.env.PRISMA_MIGRATE_DEPLOY_DELAY_MS ?? 2000);
    const maxDelayMs = Number(process.env.PRISMA_MIGRATE_DEPLOY_MAX_DELAY_MS ?? 60000);
    let migrated = false;
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        run('npx prisma migrate deploy', { env });
        migrated = true;
        break;
      } catch (error) {
        lastError = error;
        if (!isRetryableMigrationError(error) || attempt === maxAttempts) break;
        const exponential = baseDelayMs * 2 ** (attempt - 1);
        const jitter = Math.floor(Math.random() * 250);
        const waitMs = Math.min(exponential + jitter, maxDelayMs);
        console.warn(
          `[vercel-build] prisma migrate deploy failed; retrying in ${waitMs}ms (attempt ${attempt}/${maxAttempts})...`
        );

        await delay(waitMs);
      }
    }

    if (!migrated) {
      if (requireMigrations) {
        throw lastError;
      }

      console.warn(
        '[vercel-build] prisma migrate deploy failed in a non-production environment where migrations are optional.'
      );
    }
  } else {
    console.warn('[vercel-build] SKIP_DB_MIGRATIONS=1; skipping prisma migrate deploy.');
  }

  if (isProduction) run('node scripts/validate-env.mjs');
  run('npx prisma generate');
  run('npx next build --webpack');
}

main().catch((error) => {
  console.error('[vercel-build] Fatal error:', error);
  process.exit(1);
});
