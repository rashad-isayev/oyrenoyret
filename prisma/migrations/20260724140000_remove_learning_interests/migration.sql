-- Subject interests were removed from Personalization because the product
-- cannot yet use them to change the experience. Avoid retaining a misleading,
-- permanently unused profile attribute in the new account model.
ALTER TABLE "User"
DROP COLUMN IF EXISTS "learningInterests";
