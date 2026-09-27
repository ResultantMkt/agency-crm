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

    const automation = await prisma.automation.findUnique({
      where: { id },
      include: {
        labels: true,
        runs: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    })

    if (!automation) return Response.json({ error: "Not found" }, { status: 404 })

    return Response.json(automation)
  } catch (error) {
    console.error("[GET /api/automations/[id]]", error)
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

    const existing = await prisma.automation.findUnique({ where: { id } })
    if (!existing) return Response.json({ error: "Not found" }, { status: 404 })

    const body = await request.json()
    const { name, description, active, trigger, steps, labelIds } = body

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name
    if (description !== undefined) data.description = description
    if (active !== undefined) data.active = active
    if (trigger !== undefined) data.trigger = trigger
    if (steps !== undefined) data.steps = steps

    if (labelIds !== undefined) {
      data.labels = {
        set: (labelIds as string[]).map((lid: string) => ({ id: lid })),
      }
    }

    const automation = await prisma.automation.update({
      where: { id },
      data,
      include: { labels: true },
    })

    return Response.json(automation)
  } catch (error) {
    console.error("[PATCH /api/automations/[id]]", error)
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

    const existing = await prisma.automation.findUnique({ where: { id } })
    if (!existing) return Response.json({ error: "Not found" }, { status: 404 })

    await prisma.automation.delete({ where: { id } })

    return Response.json({ success: true })
  } catch (error) {
    console.error("[DELETE /api/automations/[id]]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
