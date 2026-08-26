-- Adds the (userId, provider) uniqueness that lib/db/schema.ts now declares,
-- letting upsertIntegration use a single atomic ON CONFLICT statement.
--
-- Historical check-then-insert races may have produced duplicate rows; keep
-- only the newest per pair (createdAt, id tiebreak) before adding the
-- constraint. Safe to re-run.

DELETE FROM "integrations" AS a
USING "integrations" AS b
WHERE a."userId" = b."userId"
  AND a."provider" = b."provider"
  AND (a."createdAt", a."id") < (b."createdAt", b."id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'integrations_user_id_provider_key'
  ) THEN
    ALTER TABLE "integrations"
      ADD CONSTRAINT "integrations_user_id_provider_key"
      UNIQUE ("userId", "provider");
  END IF;
END $$;
