import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

const VALID_SOURCES = ["TRAFFIC", "PROSPECTING", "REFERRAL", "OTHER"] as const
const VALID_STAGES = [
  "LEAD", "MQL", "SCREENING_SCHEDULED", "SCREENING_DONE",
  "CLOSING_MEETING", "PROPOSAL_SENT", "CLOSED", "LOST",
] as const

const rowSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  phone: z.string().min(1, "Telefone é obrigatório"),
  email: z.string().email("Email inválido").or(z.literal("")).nullish(),
  source: z.enum(VALID_SOURCES).default("OTHER"),
  stage: z.enum(VALID_STAGES).default("LEAD"),
  assignedToId: z.string().nullish(),
  estimatedValue: z.coerce.number().positive("Valor deve ser positivo").nullish(),
  notes: z.string().nullish(),
})

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    if (!Array.isArray(body.rows) || body.rows.length === 0) {
      return Response.json({ error: "rows must be a non-empty array" }, { status: 400 })
    }
    if (body.rows.length > 1000) {
      return Response.json({ error: "Máximo de 1000 linhas por importação" }, { status: 400 })
    }

    // Build a set of all existing phones for dedup
    const existingLeads = await prisma.lead.findMany({ select: { phone: true } })
    const existingPhones = new Set(existingLeads.map((l) => normalizePhone(l.phone)))

    let created = 0
    let skipped = 0
    const errors: { row: number; message: string }[] = []
    const newLeads: z.infer<typeof rowSchema>[] = []
    const newPhones = new Set<string>()

    // Validate all rows first
    for (let i = 0; i < body.rows.length; i++) {
      const row = body.rows[i]
      const parsed = rowSchema.safeParse(row)
      if (!parsed.success) {
        errors.push({ row: i + 1, message: parsed.error.issues.map((e) => e.message).join("; ") })
        continue
      }
      const normalized = normalizePhone(parsed.data.phone)
      if (existingPhones.has(normalized) || newPhones.has(normalized)) {
        skipped++
        continue
      }
      newPhones.add(normalized)
      newLeads.push(parsed.data)
    }

    // Bulk create valid, non-duplicate leads
    if (newLeads.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const data of newLeads) {
          const lead = await tx.lead.create({
            data: {
              name: data.name,
              phone: data.phone,
              email: data.email || null,
              source: data.source,
              stage: data.stage,
              assignedToId: data.assignedToId || null,
              estimatedValue: data.estimatedValue,
              notes: data.notes,
            },
          })
          await tx.leadHistory.create({
            data: {
              leadId: lead.id,
              toStage: lead.stage,
              changedById: session.user.id,
              note: "Lead importado via CSV",
            },
          })
          created++
        }
      })
    }

    return Response.json({ created, skipped, errors })
  } catch (error) {
    console.error("[POST /api/leads/import]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "")
}
