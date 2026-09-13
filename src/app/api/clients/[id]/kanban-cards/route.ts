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
    const cards = await prisma.clientKanbanCard.findMany({
      where: { clientId: id },
      orderBy: { position: "asc" },
    })

    return Response.json(cards)
  } catch (error) {
    console.error("[GET /api/clients/[id]/kanban-cards]", error)
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
    const { columnKey, title, assignee, dueDate, position } = body

    if (!columnKey || !title) {
      return Response.json({ error: "columnKey and title are required" }, { status: 400 })
    }

    const card = await prisma.clientKanbanCard.create({
      data: {
        clientId: id,
        columnKey,
        title,
        assignee: assignee ?? null,
        dueDate: dueDate ? new Date(dueDate) : null,
        position: position ?? 0,
        content: [],
      },
    })

    return Response.json(card, { status: 201 })
  } catch (error) {
    console.error("[POST /api/clients/[id]/kanban-cards]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
