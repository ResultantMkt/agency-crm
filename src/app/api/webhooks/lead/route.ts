import { prisma } from "@/lib/prisma"
import { webhookLeadSchema } from "@/lib/validations/lead"
import { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get("x-webhook-secret")

    if (!secret || secret !== process.env.WEBHOOK_SECRET) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = webhookLeadSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: "Validation error", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const data = parsed.data

    const lead = await prisma.lead.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        source: data.source ?? "OTHER",
        stage: "LEAD",
        notes: data.notes,
      },
    })

    return Response.json({ success: true, leadId: lead.id }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/webhooks/lead]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
