-- AlterTable
ALTER TABLE "members" ADD COLUMN     "provider" TEXT,
ALTER COLUMN "password_hash" DROP NOT NULL;
