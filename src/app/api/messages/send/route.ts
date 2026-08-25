import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { conversationId, content } = body

    if (!conversationId || !content) {
      return Response.json(
        { error: "Validation error", details: [{ message: "conversationId and content are required" }] },
        { status: 400 }
      )
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    })

    if (!conversation) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        content,
        direction: "OUTBOUND",
        senderName: session.user.name,
      },
    })

    await Promise.all([
      prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      }),
      prisma.messageQueue.create({
        data: {
          conversationId,
          messageId: message.id,
          phone: conversation.phoneNumber,
          content,
        },
      }),
    ])

    return Response.json({ ...message, queued: true }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/messages/send]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
