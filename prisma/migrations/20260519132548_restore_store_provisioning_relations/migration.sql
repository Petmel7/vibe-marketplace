-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "is_primary" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_owner_id_seller_fkey" FOREIGN KEY ("owner_id") REFERENCES "seller_profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
