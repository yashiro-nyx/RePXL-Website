-- CreateTable
CREATE TABLE "review_images" (
    "id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "public_id" TEXT NOT NULL,
    "secure_url" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL DEFAULT 'image',
    "delivery_type" TEXT NOT NULL DEFAULT 'upload',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_request_images" (
    "id" TEXT NOT NULL,
    "return_request_id" TEXT NOT NULL,
    "public_id" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL DEFAULT 'image',
    "delivery_type" TEXT NOT NULL DEFAULT 'authenticated',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "return_request_images_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "review_images" ADD CONSTRAINT "review_images_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_request_images" ADD CONSTRAINT "return_request_images_return_request_id_fkey" FOREIGN KEY ("return_request_id") REFERENCES "return_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
