-- Some development databases may have applied the short-lived draft-table
-- migration before the durable-account design was finalized. Fresh databases
-- treat this as a no-op; existing development databases are cleaned safely.
DROP TABLE IF EXISTS "OnboardingRegistrationDraft";
