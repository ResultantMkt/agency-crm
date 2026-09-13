import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { NextRequest } from "next/server"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; linkId: string }> }
) {
  try {
    const session = await auth()
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const { linkId } = await params
    const body = await request.json()
    const { label, url } = body

    const link = await prisma.clientProjectLink.update({
      where: { id: linkId },
      data: { label, url },
    })

    return Response.json(link)
  } catch (error) {
    console.error("[PATCH /api/clients/[id]/project-links/[linkId]]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; linkId: string }> }
) {
  try {
    const session = await auth()
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const { linkId } = await params
    await prisma.clientProjectLink.delete({ where: { id: linkId } })

    return Response.json({ success: true })
  } catch (error) {
    console.error("[DELETE /api/clients/[id]/project-links/[linkId]]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
