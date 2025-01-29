/*
  Warnings:

  - You are about to drop the column `password_hash` on the `restaurants` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[email,restaurant_id]` on the table `members` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "members_email_key";

-- AlterTable
ALTER TABLE "restaurants" DROP COLUMN "password_hash",
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "members_email_restaurant_id_key" ON "members"("email", "restaurant_id");
