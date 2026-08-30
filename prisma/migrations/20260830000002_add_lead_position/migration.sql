-- Add position field to Lead
ALTER TABLE "Lead" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

-- Initialize positions: within each stage, newer leads get lower position (appear at top)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY stage ORDER BY "createdAt" DESC) - 1 AS rn
  FROM "Lead"
)
UPDATE "Lead" SET "position" = ranked.rn
FROM ranked
WHERE "Lead".id = ranked.id;
