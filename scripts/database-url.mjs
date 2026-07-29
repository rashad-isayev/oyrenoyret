const firstConfigured = (env, names) => {
  for (const name of names) {
    const value = String(env[name] ?? '').trim();
    if (value) return { name, value };
  }
  return null;
};

export const APPLICATION_DATABASE_URL_NAMES = [
  'DATABASE_URL',
  'DATABASE_PRISMA_DATABASE_URL',
  'POSTGRES_PRISMA_URL',
  'POSTGRES_URL',
  'POSTGRES_URL_NON_POOLING',
  'DIRECT_URL',
];

export const MIGRATION_DATABASE_URL_NAMES = [
  'MIGRATION_DATABASE_URL',
  'DIRECT_DATABASE_URL',
  'POSTGRES_URL_NON_POOLING',
  'DIRECT_URL',
  'DATABASE_URL',
  'DATABASE_PRISMA_DATABASE_URL',
  'POSTGRES_PRISMA_URL',
  'POSTGRES_URL',
];

export function resolveDatabaseUrls(env = process.env) {
  return {
    application: firstConfigured(env, APPLICATION_DATABASE_URL_NAMES),
    migration: firstConfigured(env, MIGRATION_DATABASE_URL_NAMES),
  };
}

export function requireDatabaseUrls(env = process.env) {
  const resolved = resolveDatabaseUrls(env);
  if (!resolved.application) {
    throw new Error(
      `No application database URL is configured. Add one of ${APPLICATION_DATABASE_URL_NAMES.join(
        ', ',
      )} to the Vercel project environment.`,
    );
  }
  if (!resolved.migration) {
    throw new Error(
      `No migration database URL is configured. Add one of ${MIGRATION_DATABASE_URL_NAMES.join(
        ', ',
      )} to the Vercel project environment.`,
    );
  }
  return resolved;
}
