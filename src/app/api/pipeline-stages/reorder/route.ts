import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role !== "ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 })

    const body = await request.json()
    const parsed = z.object({
      stages: z.array(z.object({ id: z.string(), position: z.number().int().min(0) })),
    }).safeParse(body)
    if (!parsed.success) return Response.json({ error: "Invalid input" }, { status: 400 })

    await prisma.$transaction(
      parsed.data.stages.map(({ id, position }) =>
        prisma.pipelineStage.update({ where: { id }, data: { position } })
      )
    )
    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
