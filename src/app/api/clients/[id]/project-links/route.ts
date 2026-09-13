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
    const links = await prisma.clientProjectLink.findMany({
      where: { clientId: id },
      orderBy: [{ section: "asc" }, { position: "asc" }],
    })

    return Response.json(links)
  } catch (error) {
    console.error("[GET /api/clients/[id]/project-links]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const { section, label, url, position } = body

    if (!url || !section) {
      return Response.json({ error: "section and url are required" }, { status: 400 })
    }

    const link = await prisma.clientProjectLink.create({
      data: { clientId: id, section, label, url, position: position ?? 0 },
    })

    return Response.json(link, { status: 201 })
  } catch (error) {
    console.error("[POST /api/clients/[id]/project-links]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
