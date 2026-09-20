-- CreateTable
CREATE TABLE "BlockedContact" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "blockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockedContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlockedContact_phoneNumber_key" ON "BlockedContact"("phoneNumber");

-- CreateIndex
CREATE INDEX "BlockedContact_phoneNumber_idx" ON "BlockedContact"("phoneNumber");
