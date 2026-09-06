-- Migration: recent_auth_and_newsletter_doi
-- ADDITIVE ONLY — no tables dropped, no columns altered, no data deleted.

-- 1. recent_auth_records: server-side re-auth tracking for Security pages
CREATE TABLE IF NOT EXISTS "recent_auth_records" (
  "user_id"      TEXT        NOT NULL,
  "verified_at"  TIMESTAMPTZ NOT NULL,
  "expires_at"   TIMESTAMPTZ NOT NULL,
  "attempts"     INTEGER     NOT NULL DEFAULT 0,
  "window_start" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "recent_auth_records_pkey" PRIMARY KEY ("user_id"),
  CONSTRAINT "recent_auth_records_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

-- 2. SubscriberStatus enum
DO $$ BEGIN
  CREATE TYPE "SubscriberStatus" AS ENUM ('PENDING', 'CONFIRMED', 'UNSUBSCRIBED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 3. Add new columns to newsletter_subscribers (all nullable/defaulted — existing rows unaffected)
ALTER TABLE "newsletter_subscribers"
  ADD COLUMN IF NOT EXISTS "status"                    "SubscriberStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "confirmation_token_hash"   TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS "confirmation_expires_at"   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "confirmed_at"              TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "unsubscribe_token_hash"    TEXT UNIQUE;

-- 4. Migrate existing isSubscribed=true rows → CONFIRMED so nothing breaks
UPDATE "newsletter_subscribers"
  SET "status" = 'CONFIRMED', "confirmed_at" = NOW()
  WHERE "is_subscribed" = true AND "status" = 'PENDING';

-- 5. Migrate existing isSubscribed=false rows → UNSUBSCRIBED
UPDATE "newsletter_subscribers"
  SET "status" = 'UNSUBSCRIBED'
  WHERE "is_subscribed" = false AND "status" = 'PENDING';
