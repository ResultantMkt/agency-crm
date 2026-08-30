import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { sendWhatsAppMedia, type MediaType } from "@/lib/zapi"
import { NextRequest } from "next/server"
import { z } from "zod"

const schema = z.object({
  conversationId: z.string().min(1),
  mediaType: z.enum(["image", "video", "audio", "document"]),
  mediaBase64: z.string().min(1),   // data: URL (includes mime prefix)
  mediaName: z.string().optional(), // filename for documents
  caption: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 })
    }

    const { conversationId, mediaType, mediaBase64, mediaName, caption } = parsed.data

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, phoneNumber: true },
    })
    if (!conversation) return Response.json({ error: "Conversation not found" }, { status: 404 })

    // Send to Z-API directly (bypass queue — media is sent immediately)
    await sendWhatsAppMedia(
      conversation.phoneNumber,
      mediaType as MediaType,
      mediaBase64,
      mediaName,
      caption
    )

    // Store message (no mediaUrl for outbound — we don't get a public URL back from Z-API send)
    const message = await prisma.message.create({
      data: {
        conversationId,
        content: caption ?? mediaName ?? mediaType,
        direction: "OUTBOUND",
        senderName: session.user.name ?? null,
        mediaType,
        mediaName: mediaName ?? null,
        // mediaUrl: null — the base64 is too large to store; shown via optimistic URL during session
      },
    })

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    })

    return Response.json(message, { status: 201 })
  } catch (error) {
    console.error("[POST /api/messages/send-media]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
