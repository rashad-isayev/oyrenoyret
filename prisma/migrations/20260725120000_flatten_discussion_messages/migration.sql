-- Discussions now use one chronological message timeline. Existing messages
-- remain intact; only the obsolete self-referential reply hierarchy is removed.
DROP INDEX IF EXISTS "DiscussionReply_userId_removedAt_parentReplyId_idx";
DROP INDEX IF EXISTS "DiscussionReply_parentReplyId_idx";

ALTER TABLE "DiscussionReply"
  DROP CONSTRAINT IF EXISTS "DiscussionReply_parentReplyId_fkey";

ALTER TABLE "DiscussionReply"
  DROP COLUMN IF EXISTS "parentReplyId";

DROP INDEX IF EXISTS "Discussion_acceptedReplyId_key";

ALTER TABLE "Discussion"
  DROP CONSTRAINT IF EXISTS "Discussion_acceptedReplyId_fkey";

ALTER TABLE "Discussion"
  DROP COLUMN IF EXISTS "acceptedReplyId";
