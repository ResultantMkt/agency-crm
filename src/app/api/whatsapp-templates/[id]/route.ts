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
    const { name, body: templateBody, sequenceId } = body

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name
    if (templateBody !== undefined) data.body = templateBody
    if (sequenceId !== undefined) data.sequenceId = sequenceId

    const template = await prisma.whatsAppTemplate.update({
      where: { id },
      data,
      include: { sequence: { select: { id: true, name: true } } },
    })

    return Response.json(template)
  } catch (error) {
    console.error("[PATCH /api/whatsapp-templates/[id]]", error)
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

    await prisma.whatsAppTemplate.delete({ where: { id } })

    return Response.json({ success: true })
  } catch (error) {
    console.error("[DELETE /api/whatsapp-templates/[id]]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
