-- AlterTable
ALTER TABLE "addresses" ADD COLUMN     "city_code" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "province_code" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "region_code" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "tracking_number" SET DATA TYPE TEXT,
ALTER COLUMN "delivery_status" SET DATA TYPE TEXT;
