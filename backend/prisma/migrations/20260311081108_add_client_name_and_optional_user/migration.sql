-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "clientName" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;
