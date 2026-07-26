ALTER TABLE "Discussion"
ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX "Discussion_tags_idx"
ON "Discussion"
USING GIN ("tags");
