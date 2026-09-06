-- CreateTable
CREATE TABLE "PipelineStage" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "color" TEXT,
    CONSTRAINT "PipelineStage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PipelineStage_key_key" ON "PipelineStage"("key");

-- Seed default stages
INSERT INTO "PipelineStage" ("id", "key", "name", "position") VALUES
    ('ps_lead_000000001', 'LEAD', 'Lead', 0),
    ('ps_mql_000000002', 'MQL', 'MQL', 1),
    ('ps_screening_sched', 'SCREENING_SCHEDULED', 'Triagem Agendada', 2),
    ('ps_screening_done0', 'SCREENING_DONE', 'Triagem Realizada', 3),
    ('ps_closing_meeting', 'CLOSING_MEETING', 'Reunião de Fechamento', 4),
    ('ps_proposal_sent00', 'PROPOSAL_SENT', 'Proposta Enviada', 5),
    ('ps_closed_00000006', 'CLOSED', 'Fechamento', 6),
    ('ps_lost_000000007', 'LOST', 'Perdido', 7);

-- AlterTable: Change Lead.stage from LeadStage enum to TEXT
ALTER TABLE "Lead" ALTER COLUMN "stage" TYPE TEXT USING "stage"::text;
ALTER TABLE "Lead" ALTER COLUMN "stage" SET DEFAULT 'LEAD';

-- AlterTable: Change LeadHistory stages from LeadStage enum to TEXT
ALTER TABLE "LeadHistory" ALTER COLUMN "fromStage" TYPE TEXT USING "fromStage"::text;
ALTER TABLE "LeadHistory" ALTER COLUMN "toStage" TYPE TEXT USING "toStage"::text;

-- Drop old enum type
DROP TYPE "LeadStage";
