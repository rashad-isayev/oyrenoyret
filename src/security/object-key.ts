const SAFE_OBJECT_PREFIX = /^[a-z0-9_-]+(?:\/[a-z0-9_-]+)*$/i;

export function getR2ObjectPrefix(value: string | undefined, fallback: string): string {
  const prefix = String(value ?? fallback).trim().replace(/^\/+|\/+$/g, '');
  if (!prefix || prefix.length > 120 || !SAFE_OBJECT_PREFIX.test(prefix)) {
    throw new Error('Invalid R2 object prefix configuration');
  }
  return prefix;
}
