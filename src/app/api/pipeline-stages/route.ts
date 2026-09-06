import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"

export async function GET() {
  try {
    const stages = await prisma.pipelineStage.findMany({ orderBy: { position: "asc" } })
    return Response.json(stages)
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role !== "ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 })

    const body = await request.json()
    const parsed = z.object({
      name: z.string().min(1).max(50),
      color: z.string().optional(),
    }).safeParse(body)
    if (!parsed.success) return Response.json({ error: "Invalid input" }, { status: 400 })

    const { name, color } = parsed.data
    const key = Date.now().toString(36) + Math.random().toString(36).slice(2)

    const last = await prisma.pipelineStage.findFirst({ orderBy: { position: "desc" } })
    const position = (last?.position ?? -1) + 1

    const stage = await prisma.pipelineStage.create({ data: { key, name, position, color } })
    return Response.json(stage, { status: 201 })
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
