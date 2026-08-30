-- Rename existing LeadStage enum values to match new funnel
ALTER TYPE "LeadStage" RENAME VALUE 'MEETING_SCHEDULED' TO 'SCREENING_SCHEDULED';
ALTER TYPE "LeadStage" RENAME VALUE 'MEETING_DONE' TO 'SCREENING_DONE';
ALTER TYPE "LeadStage" RENAME VALUE 'PROPOSAL' TO 'PROPOSAL_SENT';

-- Add new CLOSING_MEETING stage (must be outside explicit transaction on PG < 12;
-- Neon/Supabase use PG 15+ so this is safe inside the migration transaction)
ALTER TYPE "LeadStage" ADD VALUE IF NOT EXISTS 'CLOSING_MEETING' AFTER 'SCREENING_DONE';
