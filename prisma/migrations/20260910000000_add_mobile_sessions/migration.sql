CREATE TABLE "mobile_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "access_token_hash" TEXT NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "access_expires_at" TIMESTAMP(3) NOT NULL,
    "refresh_expires_at" TIMESTAMP(3) NOT NULL,
    "device_name" TEXT,
    "platform" TEXT,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mobile_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mobile_sessions_access_token_hash_key" ON "mobile_sessions"("access_token_hash");
CREATE UNIQUE INDEX "mobile_sessions_refresh_token_hash_key" ON "mobile_sessions"("refresh_token_hash");
CREATE INDEX "mobile_sessions_user_id_idx" ON "mobile_sessions"("user_id");
CREATE INDEX "mobile_sessions_refresh_expires_at_idx" ON "mobile_sessions"("refresh_expires_at");

ALTER TABLE "mobile_sessions" ADD CONSTRAINT "mobile_sessions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;