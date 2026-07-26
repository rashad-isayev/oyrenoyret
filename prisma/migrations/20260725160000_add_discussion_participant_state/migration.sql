CREATE TABLE "DiscussionParticipantState" (
  "id" TEXT NOT NULL,
  "discussionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lastReadReplyId" TEXT,
  "lastReadAt" TIMESTAMP(3),
  "lastSentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DiscussionParticipantState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DiscussionParticipantState_discussionId_userId_key"
  ON "DiscussionParticipantState"("discussionId", "userId");

CREATE INDEX "DiscussionParticipantState_userId_updatedAt_idx"
  ON "DiscussionParticipantState"("userId", "updatedAt");

CREATE INDEX "DiscussionParticipantState_discussionId_lastReadAt_idx"
  ON "DiscussionParticipantState"("discussionId", "lastReadAt");

CREATE INDEX "DiscussionParticipantState_lastReadReplyId_idx"
  ON "DiscussionParticipantState"("lastReadReplyId");

CREATE INDEX "DiscussionParticipantState_lastSentAt_idx"
  ON "DiscussionParticipantState"("lastSentAt");

ALTER TABLE "DiscussionParticipantState"
  ADD CONSTRAINT "DiscussionParticipantState_discussionId_fkey"
  FOREIGN KEY ("discussionId") REFERENCES "Discussion"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DiscussionParticipantState"
  ADD CONSTRAINT "DiscussionParticipantState_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DiscussionParticipantState"
  ADD CONSTRAINT "DiscussionParticipantState_lastReadReplyId_fkey"
  FOREIGN KEY ("lastReadReplyId") REFERENCES "DiscussionReply"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
