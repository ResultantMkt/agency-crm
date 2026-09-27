-- AddUniqueConstraint: Lead.phone
-- IMPORTANT: This migration will fail if there are duplicate phone values in the Lead table.
-- Run `npx tsx scripts/cleanup-zapi-leads.ts` first to identify and remove duplicates.

-- CreateIndex
CREATE UNIQUE INDEX "Lead_phone_key" ON "Lead"("phone");
