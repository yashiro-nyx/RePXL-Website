-- Migration: sensitive_change_challenges
-- ADDITIVE ONLY — no existing tables dropped or altered.

-- 1. SensitiveChangeType enum
DO $$ BEGIN
  CREATE TYPE "SensitiveChangeType" AS ENUM (
    'CHANGE_EMAIL_VERIFY_OLD',
    'CHANGE_EMAIL_VERIFY_NEW',
    'CHANGE_PHONE',
    'CHANGE_DOB'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. sensitive_change_challenges table
CREATE TABLE IF NOT EXISTS "sensitive_change_challenges" (
  "id"             TEXT            NOT NULL DEFAULT gen_random_uuid()::text,
  "user_id"        TEXT            NOT NULL,
  "change_type"    "SensitiveChangeType" NOT NULL,
  "code_hash"      TEXT            NOT NULL,
  "pending_email"  TEXT,
  "attempts"       INTEGER         NOT NULL DEFAULT 0,
  "expires_at"     TIMESTAMPTZ     NOT NULL,
  "last_sent_at"   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  "used_at"        TIMESTAMPTZ,
  "created_at"     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  CONSTRAINT "sensitive_change_challenges_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sensitive_change_challenges_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "sensitive_change_challenges_user_id_change_type_idx"
  ON "sensitive_change_challenges" ("user_id", "change_type");

CREATE INDEX IF NOT EXISTS "sensitive_change_challenges_expires_at_idx"
  ON "sensitive_change_challenges" ("expires_at");
