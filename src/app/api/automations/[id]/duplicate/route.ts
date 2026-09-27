import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { NextRequest } from "next/server"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role !== "ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 })

    const { id } = await params

    const existing = await prisma.automation.findUnique({
      where: { id },
      include: { labels: true },
    })
    if (!existing) return Response.json({ error: "Not found" }, { status: 404 })

    const copy = await prisma.automation.create({
      data: {
        name: `Cópia de ${existing.name}`,
        description: existing.description,
        active: false,
        trigger: existing.trigger as object,
        steps: existing.steps as object,
        labels: {
          connect: existing.labels.map((l) => ({ id: l.id })),
        },
      },
      include: { labels: true },
    })

    return Response.json(copy, { status: 201 })
  } catch (error) {
    console.error("[POST /api/automations/[id]/duplicate]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
