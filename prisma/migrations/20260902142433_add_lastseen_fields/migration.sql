-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "reactions" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastSeenChatsAt" TIMESTAMP(3),
ADD COLUMN     "lastSeenCrmAt" TIMESTAMP(3);
