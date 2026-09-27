import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const labelId = searchParams.get("labelId")

    const where = labelId
      ? { labels: { some: { id: labelId } } }
      : undefined

    const automations = await prisma.automation.findMany({
      where,
      include: { labels: true },
      orderBy: { createdAt: "desc" },
    })

    return Response.json(automations)
  } catch (error) {
    console.error("[GET /api/automations]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role !== "ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 })

    const body = await request.json()
    const name = (body.name as string) || "Nova Automação"

    const automation = await prisma.automation.create({
      data: {
        name,
        trigger: { type: "", config: {} },
        steps: [],
      },
      include: { labels: true },
    })

    return Response.json(automation, { status: 201 })
  } catch (error) {
    console.error("[POST /api/automations]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
