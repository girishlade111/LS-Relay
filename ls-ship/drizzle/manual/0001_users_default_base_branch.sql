-- 0001: users.defaultBaseBranch (global fallback base branch)
-- For existing databases that were provisioned with `npm run db:push` and
-- have no migration history, apply this directly. Fresh installs get the
-- column automatically from `npm run db:push` / db:generate.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "defaultBaseBranch" text;
