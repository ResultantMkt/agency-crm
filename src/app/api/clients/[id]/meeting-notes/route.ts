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
    const notes = await prisma.clientMeetingNotes.findUnique({
      where: { clientId: id },
    })

    return Response.json(notes ?? { content: [] })
  } catch (error) {
    console.error("[GET /api/clients/[id]/meeting-notes]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const { content } = body

    const notes = await prisma.clientMeetingNotes.upsert({
      where: { clientId: id },
      create: { clientId: id, content: content ?? [] },
      update: { content: content ?? [] },
    })

    return Response.json(notes)
  } catch (error) {
    console.error("[PUT /api/clients/[id]/meeting-notes]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
