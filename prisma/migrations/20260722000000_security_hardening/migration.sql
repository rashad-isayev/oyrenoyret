-- Security hardening migration.
-- Existing sessions and guardian codes are intentionally invalidated because
-- legacy rows contain reusable credentials in plaintext.

DELETE FROM "AuthSession";

ALTER TABLE "AuthSession" DROP CONSTRAINT IF EXISTS "AuthSession_token_key";
DROP INDEX IF EXISTS "AuthSession_token_key";
ALTER TABLE "AuthSession" DROP COLUMN IF EXISTS "token";
ALTER TABLE "AuthSession" ALTER COLUMN "tokenHash" SET NOT NULL;

DELETE FROM "GuardianVerification";
DROP INDEX IF EXISTS "GuardianVerification_code_idx";
ALTER TABLE "GuardianVerification" RENAME COLUMN "code" TO "codeHash";
CREATE INDEX "GuardianVerification_codeHash_idx" ON "GuardianVerification"("codeHash");

ALTER TYPE "CreditTransactionType" ADD VALUE IF NOT EXISTS 'DISCUSSION_REPLY';

DROP INDEX IF EXISTS "CreditTransaction_userId_type_referenceId_idx";
CREATE UNIQUE INDEX "CreditTransaction_userId_type_referenceId_key"
  ON "CreditTransaction"("userId", "type", "referenceId");

-- Payout-specific invariants: an event rank can be paid once, and one user can
-- receive at most one rank for an event.
CREATE UNIQUE INDEX "CreditTransaction_sprint_rank_key"
  ON "CreditTransaction"("referenceId")
  WHERE "type" = 'SPRINT_PAYOUT';

CREATE UNIQUE INDEX "CreditTransaction_sprint_user_event_key"
  ON "CreditTransaction"("userId", (split_part("referenceId", ':rank:', 1)))
  WHERE "type" = 'SPRINT_PAYOUT';

-- Prevent concurrent submissions from creating more than one open facilitator
-- application for the same account.
CREATE UNIQUE INDEX "FacilitatorApplication_one_open_per_user_key"
  ON "FacilitatorApplication"("userId")
  WHERE "deletedAt" IS NULL AND "status" IN ('PENDING', 'CHANGES_REQUESTED');
