-- Add real-time package tracking columns to the orders table.
-- tracking_number is auto-generated with a CAM- prefix if not supplied by the carrier.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS tracking_number      VARCHAR(50)  NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS delivery_status      VARCHAR(50)  NOT NULL DEFAULT 'Order Placed',
  ADD COLUMN IF NOT EXISTS tracking_description TEXT         NOT NULL DEFAULT 'We are preparing your camera gear and checking lens optics.',
  ADD COLUMN IF NOT EXISTS tracking_progress    INT          NOT NULL DEFAULT 25;
