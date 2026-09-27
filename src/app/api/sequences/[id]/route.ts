import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { NextRequest } from "next/server"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const sequence = await prisma.sequence.findUnique({
      where: { id },
      include: { steps: { orderBy: { position: "asc" } } },
    })

    if (!sequence) return Response.json({ error: "Not found" }, { status: 404 })

    return Response.json(sequence)
  } catch (error) {
    console.error("[GET /api/sequences/[id]]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role !== "ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 })

    const { id } = await params

    const existing = await prisma.sequence.findUnique({ where: { id } })
    if (!existing) return Response.json({ error: "Not found" }, { status: 404 })

    const body = await request.json()
    const { name, description, steps } = body

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name
    if (description !== undefined) data.description = description

    await prisma.sequence.update({ where: { id }, data })

    // Replace all steps if provided
    if (Array.isArray(steps)) {
      await prisma.sequenceStep.deleteMany({ where: { sequenceId: id } })
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i] as {
          title?: string
          type?: string
          script?: string
          delayDays?: number
          delayHours?: number
          anchorField?: string
        }
        await prisma.sequenceStep.create({
          data: {
            sequenceId: id,
            position: i,
            title: s.title ?? "",
            type: s.type ?? "TASK",
            script: s.script ?? "",
            delayDays: s.delayDays ?? 0,
            delayHours: s.delayHours ?? 0,
            anchorField: s.anchorField ?? null,
          },
        })
      }
    }

    const updated = await prisma.sequence.findUnique({
      where: { id },
      include: { steps: { orderBy: { position: "asc" } } },
    })

    return Response.json(updated)
  } catch (error) {
    console.error("[PATCH /api/sequences/[id]]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role !== "ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 })

    const { id } = await params

    const existing = await prisma.sequence.findUnique({ where: { id } })
    if (!existing) return Response.json({ error: "Not found" }, { status: 404 })

    await prisma.sequence.delete({ where: { id } })

    return Response.json({ success: true })
  } catch (error) {
    console.error("[DELETE /api/sequences/[id]]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
