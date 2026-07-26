/**
 * A discussion's opening post is the first message in its live timeline.
 * Keep this domain rule in one place so list and room counts stay aligned.
 */
export function getDiscussionMessageCount(replyCount: number) {
  return Math.max(0, replyCount) + 1;
}
