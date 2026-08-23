import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { sendWhatsAppMessage } from "@/lib/zapi"
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

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    })

    try {
      await sendWhatsAppMessage(conversation.phoneNumber, content)
    } catch (zapiError) {
      const errorMessage =
        zapiError instanceof Error ? zapiError.message : "Erro desconhecido ao enviar via Z-API"
      return Response.json(
        { error: `Falha no envio via Z-API: ${errorMessage}` },
        { status: 502 }
      )
    }

    return Response.json(message, { status: 201 })
  } catch (error) {
    console.error("[POST /api/messages/send]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
