const LOCAL_DATABASE_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
]);

export function assertExplicitRemoteDatabaseAccess({
  databaseUrl,
  allowRemote,
  operation,
}) {
  const raw = String(databaseUrl ?? '').trim();
  if (!raw) {
    throw new Error(`DATABASE_URL is required to ${operation}.`);
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('DATABASE_URL is invalid.');
  }

  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error('DATABASE_URL must use the PostgreSQL protocol.');
  }

  if (!LOCAL_DATABASE_HOSTS.has(parsed.hostname) && !allowRemote) {
    throw new Error(
      `Refusing to ${operation} on a remote database without --allow-remote.`,
    );
  }

  return parsed;
}
