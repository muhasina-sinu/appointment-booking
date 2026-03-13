/*
  Warnings:

  - A unique constraint covering the columns `[phone]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `phone` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable: add clientPhone and clientEmail to appointments
ALTER TABLE "appointments" ADD COLUMN     "clientEmail" TEXT,
ADD COLUMN     "clientPhone" TEXT;

-- AlterTable: add phone to users (step 1: nullable)
ALTER TABLE "users" ADD COLUMN "phone" TEXT;

-- Backfill existing users with a unique placeholder phone
UPDATE "users" SET "phone" = 'placeholder_' || "id" WHERE "phone" IS NULL;

-- AlterTable: make phone NOT NULL
ALTER TABLE "users" ALTER COLUMN "phone" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");
