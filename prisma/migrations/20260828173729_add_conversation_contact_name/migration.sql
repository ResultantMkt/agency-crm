-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "contactNameManual" BOOLEAN NOT NULL DEFAULT false;
