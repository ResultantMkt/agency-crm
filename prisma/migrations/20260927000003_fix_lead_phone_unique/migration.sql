-- Step 1: drop NOT NULL constraint so phone can be NULL for leads without a phone number
ALTER TABLE "Lead" ALTER COLUMN "phone" DROP NOT NULL;

-- Step 2: convert empty-string phone to NULL
UPDATE "Lead" SET "phone" = NULL WHERE "phone" = '';

-- Step 3: partial unique index — enforces uniqueness only for non-null, non-empty phones.
-- Postgres allows multiple NULLs in a unique index by default, but the partial WHERE
-- clause also explicitly excludes empty strings (legacy data safety).
CREATE UNIQUE INDEX IF NOT EXISTS "Lead_phone_unique_partial"
  ON "Lead" ("phone")
  WHERE "phone" IS NOT NULL AND "phone" <> '';
