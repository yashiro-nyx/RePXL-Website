-- Migration: customer_profile_and_notif_prefs
-- ADDITIVE ONLY — no tables dropped, no columns altered, no data deleted.

-- 1. Add Gender enum type
DO $$ BEGIN
  CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Add extended profile columns to users (all nullable — existing rows unaffected)
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "username"      TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS "gender"        "Gender",
  ADD COLUMN IF NOT EXISTS "date_of_birth" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "avatar_url"    TEXT;

-- 3. Add REPIXL_UPDATE to the NotificationEvent enum
DO $$ BEGIN
  ALTER TYPE "NotificationEvent" ADD VALUE IF NOT EXISTS 'REPIXL_UPDATE';
EXCEPTION WHEN others THEN null;
END $$;

-- 4. Create UserNotificationPreference table (one-to-one with users)
CREATE TABLE IF NOT EXISTS "user_notification_preferences" (
  "user_id"              TEXT         NOT NULL,
  "email_order_updates"  BOOLEAN      NOT NULL DEFAULT true,
  "email_promotions"     BOOLEAN      NOT NULL DEFAULT true,
  "email_repixl_updates" BOOLEAN      NOT NULL DEFAULT true,
  "in_app_order_updates" BOOLEAN      NOT NULL DEFAULT true,
  "in_app_promotions"    BOOLEAN      NOT NULL DEFAULT true,
  "in_app_repixl_updates" BOOLEAN     NOT NULL DEFAULT true,
  "updated_at"           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT "user_notification_preferences_pkey" PRIMARY KEY ("user_id"),
  CONSTRAINT "user_notification_preferences_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);
