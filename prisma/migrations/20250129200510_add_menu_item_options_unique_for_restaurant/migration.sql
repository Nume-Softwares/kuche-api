/*
  Warnings:

  - Added the required column `restaurant_id` to the `menu_items_options` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "menu_items_options" ADD COLUMN     "restaurant_id" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "menu_items_options" ADD CONSTRAINT "menu_items_options_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
