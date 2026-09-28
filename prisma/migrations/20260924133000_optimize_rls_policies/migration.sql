-- Optimize user-scoped policies with (select auth.uid()) to prevent per-row function evaluation (InitPlan optimization)

DROP POLICY IF EXISTS "Users can view own profile" ON "public"."users";
CREATE POLICY "Users can view own profile" ON "public"."users"
  FOR SELECT TO authenticated USING ((select auth.uid())::text = id);

DROP POLICY IF EXISTS "Users can update own profile" ON "public"."users";
CREATE POLICY "Users can update own profile" ON "public"."users"
  FOR UPDATE TO authenticated USING ((select auth.uid())::text = id) WITH CHECK ((select auth.uid())::text = id);

DROP POLICY IF EXISTS "Users can manage own addresses" ON "public"."addresses";
CREATE POLICY "Users can manage own addresses" ON "public"."addresses"
  FOR ALL TO authenticated USING ((select auth.uid())::text = user_id) WITH CHECK ((select auth.uid())::text = user_id);

DROP POLICY IF EXISTS "Users can manage own cart items" ON "public"."cart_items";
CREATE POLICY "Users can manage own cart items" ON "public"."cart_items"
  FOR ALL TO authenticated USING ((select auth.uid())::text = user_id) WITH CHECK ((select auth.uid())::text = user_id);

DROP POLICY IF EXISTS "Users can manage own wishlist items" ON "public"."wishlist_items";
CREATE POLICY "Users can manage own wishlist items" ON "public"."wishlist_items"
  FOR ALL TO authenticated USING ((select auth.uid())::text = user_id) WITH CHECK ((select auth.uid())::text = user_id);

DROP POLICY IF EXISTS "Users can view own orders" ON "public"."orders";
CREATE POLICY "Users can view own orders" ON "public"."orders"
  FOR SELECT TO authenticated USING ((select auth.uid())::text = user_id);

DROP POLICY IF EXISTS "Users can view own order items" ON "public"."order_items";
CREATE POLICY "Users can view own order items" ON "public"."order_items"
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM "public"."orders"
      WHERE orders.id = order_items.order_id AND orders.user_id = (select auth.uid())::text
    )
  );

DROP POLICY IF EXISTS "Users can view own notifications" ON "public"."notifications";
CREATE POLICY "Users can view own notifications" ON "public"."notifications"
  FOR SELECT TO authenticated USING ((select auth.uid())::text = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON "public"."notifications";
CREATE POLICY "Users can update own notifications" ON "public"."notifications"
  FOR UPDATE TO authenticated USING ((select auth.uid())::text = user_id) WITH CHECK ((select auth.uid())::text = user_id);

DROP POLICY IF EXISTS "Users can manage own notification preferences" ON "public"."user_notification_preferences";
CREATE POLICY "Users can manage own notification preferences" ON "public"."user_notification_preferences"
  FOR ALL TO authenticated USING ((select auth.uid())::text = user_id) WITH CHECK ((select auth.uid())::text = user_id);

DROP POLICY IF EXISTS "Users can view own return requests" ON "public"."return_requests";
CREATE POLICY "Users can view own return requests" ON "public"."return_requests"
  FOR SELECT TO authenticated USING ((select auth.uid())::text = user_id);

DROP POLICY IF EXISTS "Users can view own return request items" ON "public"."return_request_items";
CREATE POLICY "Users can view own return request items" ON "public"."return_request_items"
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM "public"."return_requests"
      WHERE return_requests.id = return_request_items.return_request_id AND return_requests.user_id = (select auth.uid())::text
    )
  );

DROP POLICY IF EXISTS "Users can view own return request images" ON "public"."return_request_images";
CREATE POLICY "Users can view own return request images" ON "public"."return_request_images"
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM "public"."return_requests"
      WHERE return_requests.id = return_request_images.return_request_id AND return_requests.user_id = (select auth.uid())::text
    )
  );

