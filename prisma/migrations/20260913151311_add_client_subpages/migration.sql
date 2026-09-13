-- CreateTable
CREATE TABLE "ClientProjectLink" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "label" TEXT,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientProjectLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientKanbanCard" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "columnKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "assignee" TEXT,
    "dueDate" TIMESTAMP(3),
    "position" INTEGER NOT NULL DEFAULT 0,
    "content" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientKanbanCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientMeetingNotes" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "content" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientMeetingNotes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientProjectLink_clientId_idx" ON "ClientProjectLink"("clientId");

-- CreateIndex
CREATE INDEX "ClientKanbanCard_clientId_idx" ON "ClientKanbanCard"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientMeetingNotes_clientId_key" ON "ClientMeetingNotes"("clientId");

-- AddForeignKey
ALTER TABLE "ClientProjectLink" ADD CONSTRAINT "ClientProjectLink_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientKanbanCard" ADD CONSTRAINT "ClientKanbanCard_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientMeetingNotes" ADD CONSTRAINT "ClientMeetingNotes_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
