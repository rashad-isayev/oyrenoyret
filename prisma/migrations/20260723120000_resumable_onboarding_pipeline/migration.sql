CREATE TYPE "AccountOwnerType" AS ENUM ('SELF', 'GUARDIAN');

ALTER TABLE "User"
ADD COLUMN "learningMotivation" TEXT,
ADD COLUMN "learningInterests" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "weeklyLearningGoal" TEXT,
ADD COLUMN "declaredAge" INTEGER,
ADD COLUMN "accountOwnerType" "AccountOwnerType",
ADD COLUMN "onboardingStartedAt" TIMESTAMP(3),
ADD COLUMN "registrationCompletedAt" TIMESTAMP(3),
ADD COLUMN "guidelinesAcceptedAt" TIMESTAMP(3),
ADD COLUMN "guidelinesVersion" TEXT,
ADD COLUMN "tutorialSkippedAt" TIMESTAMP(3),
ADD COLUMN "tutorialStep" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "RegistrationVerification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "verifiedAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "used" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RegistrationVerification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "User_registrationStep_idx" ON "User"("registrationStep");
CREATE INDEX "User_tutorialCompletedAt_idx" ON "User"("tutorialCompletedAt");
CREATE INDEX "User_tutorialSkippedAt_idx" ON "User"("tutorialSkippedAt");
CREATE INDEX "RegistrationVerification_userId_idx" ON "RegistrationVerification"("userId");
CREATE INDEX "RegistrationVerification_email_idx" ON "RegistrationVerification"("email");
CREATE INDEX "RegistrationVerification_expiresAt_idx" ON "RegistrationVerification"("expiresAt");
CREATE INDEX "RegistrationVerification_used_idx" ON "RegistrationVerification"("used");

ALTER TABLE "RegistrationVerification"
ADD CONSTRAINT "RegistrationVerification_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
