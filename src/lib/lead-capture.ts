import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { phoneBRVariants } from "@/lib/zapi"
import type { LeadSource } from "@/types/models"

interface LeadCaptureInput {
  name: string
  /** Pass null or empty string when the lead has no phone number. */
  phone?: string | null
  email?: string | null
  source: LeadSource
  notes?: string
}

interface LeadCaptureResult {
  leadId: string
  created: boolean
}

/**
 * Finds an existing lead by phone (all BR variants) or email, and returns it,
 * or creates a new one in stage LEAD if none is found.
 * Stores phone as NULL when empty — matches the partial unique index on the DB.
 */
export async function findOrCreateLead(
  input: LeadCaptureInput
): Promise<LeadCaptureResult> {
  const { name, email, source, notes } = input

  // Normalise: treat empty string as null
  const phone = input.phone?.trim() || null

  // Build dedup conditions
  const orConditions: { phone?: string | null; email?: string }[] = []
  if (phone) {
    const phoneVariants = phoneBRVariants(phone)
    for (const v of phoneVariants) orConditions.push({ phone: v })
  }
  if (email) orConditions.push({ email })

  if (orConditions.length === 0) {
    // No identifiers at all — create without dedup (shouldn't normally happen)
    const lead = await prisma.lead.create({
      data: { name, phone: null, email: null, source, stage: "LEAD", notes: notes ?? null },
    })
    return { leadId: lead.id, created: true }
  }

  const existing = await prisma.lead.findFirst({
    where: { OR: orConditions },
    select: { id: true },
  })

  if (existing) {
    if (email) {
      await prisma.lead.updateMany({
        where: { id: existing.id, email: null },
        data: { email },
      })
    }
    return { leadId: existing.id, created: false }
  }

  // Try to create. Catch P2002 from the partial unique index (concurrent race).
  try {
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
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const phoneVariants = phone ? phoneBRVariants(phone) : []
      const race = await prisma.lead.findFirst({
        where: { OR: phoneVariants.map(p => ({ phone: p })) },
        select: { id: true },
      })
      if (race) {
        if (email) {
          await prisma.lead.updateMany({ where: { id: race.id, email: null }, data: { email } })
        }
        return { leadId: race.id, created: false }
      }
    }
    throw e
  }
}
