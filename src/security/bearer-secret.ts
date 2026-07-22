import crypto from 'node:crypto';

export function hasValidBearerSecret(
  authorizationHeader: string | null,
  expectedSecret: string | undefined,
): boolean {
  if (!authorizationHeader?.startsWith('Bearer ') || !expectedSecret) return false;
  const provided = Buffer.from(authorizationHeader.slice('Bearer '.length), 'utf8');
  const expected = Buffer.from(expectedSecret, 'utf8');
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
}
