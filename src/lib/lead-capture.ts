import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { phoneBRVariants } from "@/lib/zapi"
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
 * Finds an existing lead by phone (all BR variants) or email, and returns it,
 * or creates a new one in stage LEAD if none is found.
 * Handles concurrent requests via unique constraint + P2002 catch to prevent duplicates.
 */
export async function findOrCreateLead(
  input: LeadCaptureInput
): Promise<LeadCaptureResult> {
  const { name, phone, email, source, notes } = input

  // Search using all Brazilian phone variants (with/without 55, with/without 9th digit)
  const phoneVariants = phoneBRVariants(phone)
  const orConditions: { phone?: string; email?: string }[] = phoneVariants.map(p => ({ phone: p }))
  if (email) orConditions.push({ email })

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

  // Try to create. If a concurrent request already created the same phone, catch P2002.
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
      // Race condition: another concurrent request created the lead just before us
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
