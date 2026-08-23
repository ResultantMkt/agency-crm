import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { NextRequest } from "next/server"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { sentAt: "asc" },
    })

    return Response.json(messages)
  } catch (error) {
    console.error("[GET /api/conversations/[id]/messages]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const conversation = await prisma.conversation.findUnique({ where: { id } })
    if (!conversation) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    const body = await request.json()
    const { content, senderName } = body

    if (!content || typeof content !== "string") {
      return Response.json(
        { error: "Validation error", details: [{ message: "content is required" }] },
        { status: 400 }
      )
    }

    const message = await prisma.message.create({
      data: {
        conversationId: id,
        content,
        direction: "OUTBOUND",
        senderName: senderName ?? session.user.name,
      },
    })

    await prisma.conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    })

    return Response.json(message, { status: 201 })
  } catch (error) {
    console.error("[POST /api/conversations/[id]/messages]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
