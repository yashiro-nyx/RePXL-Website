-- Enable Row Level Security (RLS) on all existing public tables to protect against unauthorized direct PostgREST/Supabase data API access.
DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl.tablename);
    END LOOP;
END $$;

-- Explicit ALTER statements for all known schema tables to ensure static determinism
ALTER TABLE IF EXISTS "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."password_reset_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."mobile_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."push_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."cart_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."review_images" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."addresses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."wishlist_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."vouchers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."admin_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."recent_auth_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."newsletter_subscribers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."return_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."return_request_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."return_request_images" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."static_pages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."banners" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."homepage_content_blocks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."platform_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."user_notification_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."notification_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."customer_mfa" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."customer_mfa_challenges" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."sensitive_change_challenges" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."retired_auth_emails" ENABLE ROW LEVEL SECURITY;

-- Create an event trigger function so any future tables created in public automatically have RLS enabled
CREATE OR REPLACE FUNCTION public.pgrst_auto_enable_rls()
RETURNS event_trigger AS $$
DECLARE
    cmd record;
BEGIN
    FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands() WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS')
    LOOP
        IF cmd.schema_name = 'public' THEN
            EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY;', cmd.object_identity);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

DROP EVENT TRIGGER IF EXISTS auto_enable_rls_trigger;
CREATE EVENT TRIGGER auto_enable_rls_trigger
ON ddl_command_end
WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS')
EXECUTE FUNCTION public.pgrst_auto_enable_rls();

