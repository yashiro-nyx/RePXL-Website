CREATE TABLE "customer_mfa" (
  "user_id" TEXT NOT NULL PRIMARY KEY,
  "secret" TEXT,
  "enabled_at" TIMESTAMP(3),
  "pending_expires_at" TIMESTAMP(3),
  "last_step" INTEGER NOT NULL DEFAULT -1,
  "recovery_hashes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "recovery_acknowledged" BOOLEAN NOT NULL DEFAULT false,
  "version" INTEGER NOT NULL DEFAULT 0,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "window_started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_mfa_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "customer_mfa_challenges" (
  "token_hash" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "primary_at" TIMESTAMP(3) NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "customer_mfa_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "customer_mfa_challenges_user_id_idx" ON "customer_mfa_challenges"("user_id");
CREATE INDEX "customer_mfa_challenges_expires_at_idx" ON "customer_mfa_challenges"("expires_at");
