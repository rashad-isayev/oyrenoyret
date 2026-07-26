function writeDevelopmentEmailMessage(
  title: string,
  details: readonly string[],
): void {
  if (process.env.NODE_ENV !== 'development') return;

  const message = [
    '',
    `┌─ ${title} ─────────────────────────`,
    ...details.map((detail) => `│ ${detail}`),
    '└─────────────────────────────────────────────────────',
    '',
    '',
  ].join('\n');

  process.stderr.write(message);
}

/**
 * Keep development email logs at the issuance boundary, after persistence and
 * before delivery, so local testing does not depend on provider configuration.
 * These helpers deliberately refuse to emit secrets outside development.
 */
export function logDevelopmentVerificationCode(
  email: string,
  code: string,
): void {
  writeDevelopmentEmailMessage('Local email verification', [
    `Email: ${email}`,
    `Code:  ${code}`,
  ]);
}

export function logDevelopmentPasswordResetLink(
  email: string,
  resetUrl: string,
): void {
  writeDevelopmentEmailMessage('Local password reset', [
    `Email: ${email}`,
    `Link:  ${resetUrl}`,
  ]);
}
