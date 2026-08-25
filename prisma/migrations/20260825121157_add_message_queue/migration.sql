-- CreateEnum
CREATE TYPE "MessageQueueStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "MessageQueue" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "MessageQueueStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZapiQueueState" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "sentToday" INTEGER NOT NULL DEFAULT 0,
    "lastResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consecutiveErrors" INTEGER NOT NULL DEFAULT 0,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "pauseReason" TEXT,
    "lastSentAt" TIMESTAMP(3),
    "nextAllowedAt" TIMESTAMP(3),
    "maxPerDay" INTEGER NOT NULL DEFAULT 200,
    "minDelaySeconds" INTEGER NOT NULL DEFAULT 3,
    "maxDelaySeconds" INTEGER NOT NULL DEFAULT 10,
    "warmupEnabled" BOOLEAN NOT NULL DEFAULT false,
    "warmupStartDate" TIMESTAMP(3),
    "warmupMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZapiQueueState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MessageQueue_messageId_key" ON "MessageQueue"("messageId");

-- AddForeignKey
ALTER TABLE "MessageQueue" ADD CONSTRAINT "MessageQueue_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageQueue" ADD CONSTRAINT "MessageQueue_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
