import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { NextRequest } from "next/server"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; cardId: string }> }
) {
  try {
    const session = await auth()
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const { cardId } = await params
    const body = await request.json()
    const { title, columnKey, assignee, dueDate, position, content } = body

    const updateData: Record<string, unknown> = {}
    if (title !== undefined) updateData.title = title
    if (columnKey !== undefined) updateData.columnKey = columnKey
    if (assignee !== undefined) updateData.assignee = assignee
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null
    if (position !== undefined) updateData.position = position
    if (content !== undefined) updateData.content = content

    const card = await prisma.clientKanbanCard.update({
      where: { id: cardId },
      data: updateData,
    })

    return Response.json(card)
  } catch (error) {
    console.error("[PATCH /api/clients/[id]/kanban-cards/[cardId]]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; cardId: string }> }
) {
  try {
    const session = await auth()
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const { cardId } = await params
    await prisma.clientKanbanCard.delete({ where: { id: cardId } })

    return Response.json({ success: true })
  } catch (error) {
    console.error("[DELETE /api/clients/[id]/kanban-cards/[cardId]]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
