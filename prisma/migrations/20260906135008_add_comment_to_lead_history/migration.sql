-- AlterTable
ALTER TABLE "LeadHistory" ADD COLUMN     "comment" TEXT,
ADD COLUMN     "commentAt" TIMESTAMP(3),
ADD COLUMN     "commentByName" TEXT;
