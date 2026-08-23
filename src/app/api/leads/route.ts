import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { createLeadSchema } from "@/lib/validations/lead"
import { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const stage = searchParams.get("stage")
    const assignedToId = searchParams.get("assignedToId")

    const where: Record<string, unknown> = {}
    if (stage) where.stage = stage
    if (assignedToId) where.assignedToId = assignedToId

    const leads = await prisma.lead.findMany({
      where,
      include: {
        assignedTo: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return Response.json(leads)
  } catch (error) {
    console.error("[GET /api/leads]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = createLeadSchema.safeParse(body)

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
        stage: data.stage ?? "LEAD",
        assignedToId: data.assignedToId,
        estimatedValue: data.estimatedValue,
        notes: data.notes,
      },
    })

    await prisma.leadHistory.create({
      data: {
        leadId: lead.id,
        toStage: lead.stage,
        changedById: session.user.id,
        note: "Lead criado",
      },
    })

    return Response.json(lead, { status: 201 })
  } catch (error) {
    console.error("[POST /api/leads]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
