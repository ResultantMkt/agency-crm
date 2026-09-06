-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "groupName" TEXT,
ADD COLUMN     "isGroup" BOOLEAN NOT NULL DEFAULT false;
