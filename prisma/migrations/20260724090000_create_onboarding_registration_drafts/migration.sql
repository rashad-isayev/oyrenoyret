CREATE TABLE "OnboardingRegistrationDraft" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT,
  "learningMotivation" TEXT NOT NULL,
  "learningInterests" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "weeklyLearningGoal" TEXT NOT NULL,
  "declaredAge" INTEGER NOT NULL,
  "accountOwnerType" "AccountOwnerType" NOT NULL,
  "verificationCodeHash" TEXT,
  "verificationExpiresAt" TIMESTAMP(3),
  "verificationAttempts" INTEGER NOT NULL DEFAULT 0,
  "emailVerifiedAt" TIMESTAMP(3),
  "createdUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OnboardingRegistrationDraft_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OnboardingRegistrationDraft_email_key"
ON "OnboardingRegistrationDraft"("email");

CREATE UNIQUE INDEX "OnboardingRegistrationDraft_createdUserId_key"
ON "OnboardingRegistrationDraft"("createdUserId");

CREATE INDEX "OnboardingRegistrationDraft_emailVerifiedAt_idx"
ON "OnboardingRegistrationDraft"("emailVerifiedAt");

CREATE INDEX "OnboardingRegistrationDraft_verificationExpiresAt_idx"
ON "OnboardingRegistrationDraft"("verificationExpiresAt");

CREATE INDEX "OnboardingRegistrationDraft_createdAt_idx"
ON "OnboardingRegistrationDraft"("createdAt");
