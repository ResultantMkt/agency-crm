import { prisma } from "@/lib/prisma"
import type { LeadSource } from "@/types/models"

interface LeadCaptureInput {
  name: string
  phone: string
  email?: string | null
  source: LeadSource
  notes?: string
}

interface LeadCaptureResult {
  leadId: string
  created: boolean
}

/**
 * Finds an existing lead by phone (or email as fallback) and returns it,
 * or creates a new one in stage LEAD if none is found.
 * Never creates a duplicate.
 */
export async function findOrCreateLead(
  input: LeadCaptureInput
): Promise<LeadCaptureResult> {
  const { name, phone, email, source, notes } = input

  // Build dedup conditions: phone is primary key, email is secondary
  const orConditions: { phone?: string; email?: string }[] = [{ phone }]
  if (email) orConditions.push({ email })

  const existing = await prisma.lead.findFirst({
    where: { OR: orConditions },
    select: { id: true },
  })

  if (existing) {
    // Fill in email only if the lead doesn't already have one
    if (email) {
      await prisma.lead.updateMany({
        where: { id: existing.id, email: null },
        data: { email },
      })
    }
    return { leadId: existing.id, created: false }
  }

  const lead = await prisma.lead.create({
    data: {
      name,
      phone,
      email: email ?? null,
      source,
      stage: "LEAD",
      notes: notes ?? null,
    },
  })

  return { leadId: lead.id, created: true }
}
