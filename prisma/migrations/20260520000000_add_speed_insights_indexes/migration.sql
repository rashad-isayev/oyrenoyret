-- Composite indexes for the authenticated routes flagged by Speed Insights.
-- These match the user-scoped filters used by dashboard and academic record pages.

CREATE INDEX IF NOT EXISTS "AcademicRecord_userId_deletedAt_createdAt_idx"
  ON "AcademicRecord"("userId", "deletedAt", "createdAt");

CREATE INDEX IF NOT EXISTS "Activity_userId_date_idx"
  ON "Activity"("userId", "date");

CREATE INDEX IF NOT EXISTS "LiveEventEnrollment_userId_status_idx"
  ON "LiveEventEnrollment"("userId", "status");

CREATE INDEX IF NOT EXISTS "Material_userId_materialType_status_deletedAt_removedAt_idx"
  ON "Material"("userId", "materialType", "status", "deletedAt", "removedAt");

CREATE INDEX IF NOT EXISTS "Discussion_userId_removedAt_idx"
  ON "Discussion"("userId", "removedAt");

CREATE INDEX IF NOT EXISTS "DiscussionReply_userId_removedAt_discussionId_idx"
  ON "DiscussionReply"("userId", "removedAt", "discussionId");

CREATE INDEX IF NOT EXISTS "DiscussionReply_userId_removedAt_parentReplyId_idx"
  ON "DiscussionReply"("userId", "removedAt", "parentReplyId");

CREATE INDEX IF NOT EXISTS "CreditTransaction_userId_amount_idx"
  ON "CreditTransaction"("userId", "amount");

CREATE INDEX IF NOT EXISTS "CreditTransaction_userId_type_idx"
  ON "CreditTransaction"("userId", "type");

CREATE INDEX IF NOT EXISTS "CreditTransaction_userId_type_referenceId_idx"
  ON "CreditTransaction"("userId", "type", "referenceId");
