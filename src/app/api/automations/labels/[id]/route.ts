import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { NextRequest } from "next/server"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role !== "ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 })

    const { id } = await params
    const body = await request.json()
    const { name, color } = body

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name
    if (color !== undefined) data.color = color

    const label = await prisma.automationLabel.update({
      where: { id },
      data,
    })

    return Response.json(label)
  } catch (error) {
    console.error("[PATCH /api/automations/labels/[id]]", error)
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

    await prisma.automationLabel.delete({ where: { id } })

    return Response.json({ success: true })
  } catch (error) {
    console.error("[DELETE /api/automations/labels/[id]]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
