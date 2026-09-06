import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role !== "ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 })

    const { id } = await params
    const body = await request.json()
    const parsed = z.object({
      name: z.string().min(1).max(50).optional(),
      color: z.string().nullable().optional(),
    }).safeParse(body)
    if (!parsed.success) return Response.json({ error: "Invalid input" }, { status: 400 })

    const stage = await prisma.pipelineStage.update({
      where: { id },
      data: { ...parsed.data },
    })
    return Response.json(stage)
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role !== "ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 })

    const { id } = await params

    const stageRecord = await prisma.pipelineStage.findUnique({ where: { id } })
    if (!stageRecord) return Response.json({ error: "Not found" }, { status: 404 })

    const leadsCount = await prisma.lead.count({ where: { stage: stageRecord.key } })
    if (leadsCount > 0) {
      return Response.json(
        { error: `Não é possível excluir: ${leadsCount} lead(s) nesta etapa. Mova-os primeiro.` },
        { status: 409 }
      )
    }

    await prisma.pipelineStage.delete({ where: { id } })
    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
