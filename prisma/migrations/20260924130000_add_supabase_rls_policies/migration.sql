-- Public storefront catalog & content read policies (anon and authenticated)
DROP POLICY IF EXISTS "Allow public read access to active products" ON "public"."products";
CREATE POLICY "Allow public read access to active products" ON "public"."products"
  FOR SELECT TO anon, authenticated USING (status = 'ACTIVE');

DROP POLICY IF EXISTS "Allow public read access to reviews" ON "public"."reviews";
CREATE POLICY "Allow public read access to reviews" ON "public"."reviews"
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow public read access to review images" ON "public"."review_images";
CREATE POLICY "Allow public read access to review images" ON "public"."review_images"
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow public read access to active banners" ON "public"."banners";
CREATE POLICY "Allow public read access to active banners" ON "public"."banners"
  FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Allow public read access to published static pages" ON "public"."static_pages";
CREATE POLICY "Allow public read access to published static pages" ON "public"."static_pages"
  FOR SELECT TO anon, authenticated USING (status = 'PUBLISHED');

DROP POLICY IF EXISTS "Allow public read access to published homepage blocks" ON "public"."homepage_content_blocks";
CREATE POLICY "Allow public read access to published homepage blocks" ON "public"."homepage_content_blocks"
  FOR SELECT TO anon, authenticated USING (is_published = true);

DROP POLICY IF EXISTS "Allow public read access to active vouchers" ON "public"."vouchers";
CREATE POLICY "Allow public read access to active vouchers" ON "public"."vouchers"
  FOR SELECT TO anon, authenticated USING (status = 'ACTIVE');

-- User-scoped policies (authenticated users only, mapped to auth.uid())
DROP POLICY IF EXISTS "Users can view own profile" ON "public"."users";
CREATE POLICY "Users can view own profile" ON "public"."users"
  FOR SELECT TO authenticated USING (auth.uid()::text = id);

DROP POLICY IF EXISTS "Users can update own profile" ON "public"."users";
CREATE POLICY "Users can update own profile" ON "public"."users"
  FOR UPDATE TO authenticated USING (auth.uid()::text = id) WITH CHECK (auth.uid()::text = id);

DROP POLICY IF EXISTS "Users can manage own addresses" ON "public"."addresses";
CREATE POLICY "Users can manage own addresses" ON "public"."addresses"
  FOR ALL TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can manage own cart items" ON "public"."cart_items";
CREATE POLICY "Users can manage own cart items" ON "public"."cart_items"
  FOR ALL TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can manage own wishlist items" ON "public"."wishlist_items";
CREATE POLICY "Users can manage own wishlist items" ON "public"."wishlist_items"
  FOR ALL TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can view own orders" ON "public"."orders";
CREATE POLICY "Users can view own orders" ON "public"."orders"
  FOR SELECT TO authenticated USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can view own order items" ON "public"."order_items";
CREATE POLICY "Users can view own order items" ON "public"."order_items"
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM "public"."orders"
      WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Users can view own notifications" ON "public"."notifications";
CREATE POLICY "Users can view own notifications" ON "public"."notifications"
  FOR SELECT TO authenticated USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON "public"."notifications";
CREATE POLICY "Users can update own notifications" ON "public"."notifications"
  FOR UPDATE TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can manage own notification preferences" ON "public"."user_notification_preferences";
CREATE POLICY "Users can manage own notification preferences" ON "public"."user_notification_preferences"
  FOR ALL TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can view own return requests" ON "public"."return_requests";
CREATE POLICY "Users can view own return requests" ON "public"."return_requests"
  FOR SELECT TO authenticated USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can view own return request items" ON "public"."return_request_items";
CREATE POLICY "Users can view own return request items" ON "public"."return_request_items"
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM "public"."return_requests"
      WHERE return_requests.id = return_request_items.return_request_id AND return_requests.user_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Users can view own return request images" ON "public"."return_request_images";
CREATE POLICY "Users can view own return request images" ON "public"."return_request_images"
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM "public"."return_requests"
      WHERE return_requests.id = return_request_images.return_request_id AND return_requests.user_id = auth.uid()::text
    )
  );

