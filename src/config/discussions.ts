export const DISCUSSION_SLOWMODE_SECONDS = 60;

export function getDiscussionSlowmodeRetrySeconds(
  lastSentAt: Date | string | null | undefined,
  now = new Date(),
) {
  if (!lastSentAt) return 0;
  const elapsedMs =
    now.getTime() - new Date(lastSentAt).getTime();
  const remainingMs =
    DISCUSSION_SLOWMODE_SECONDS * 1000 - elapsedMs;
  return Math.max(0, Math.ceil(remainingMs / 1000));
}
