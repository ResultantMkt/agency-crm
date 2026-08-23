import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { updateLeadSchema } from "@/lib/validations/lead"
import { NextRequest } from "next/server"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        assignedTo: true,
        history: {
          include: {
            changedBy: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        tasks: true,
        conversations: true,
      },
    })

    if (!lead) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    return Response.json(lead)
  } catch (error) {
    console.error("[GET /api/leads/[id]]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const existing = await prisma.lead.findUnique({ where: { id } })
    if (!existing) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    const body = await request.json()
    const parsed = updateLeadSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: "Validation error", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const data = parsed.data

    const updated = await prisma.lead.update({
      where: { id },
      data,
    })

    if (data.stage && data.stage !== existing.stage) {
      await prisma.leadHistory.create({
        data: {
          leadId: id,
          fromStage: existing.stage,
          toStage: data.stage,
          changedById: session.user.id,
        },
      })
    }

    return Response.json(updated)
  } catch (error) {
    console.error("[PATCH /api/leads/[id]]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const existing = await prisma.lead.findUnique({ where: { id } })
    if (!existing) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    await prisma.lead.delete({ where: { id } })

    return Response.json({ success: true })
  } catch (error) {
    console.error("[DELETE /api/leads/[id]]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
