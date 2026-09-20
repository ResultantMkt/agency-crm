import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { sendWhatsAppMedia, type MediaType } from "@/lib/zapi"
import { NextRequest } from "next/server"
import { z } from "zod"

const schema = z.object({
  conversationId: z.string().min(1),
  mediaType: z.enum(["image", "video", "audio", "document"]),
  mediaUrl: z.string().url().optional(),     // Vercel Blob URL (preferred)
  mediaBase64: z.string().min(1).optional(), // legacy: small images only
  mediaName: z.string().optional(),
  caption: z.string().optional(),
}).refine((d) => d.mediaUrl ?? d.mediaBase64, {
  message: "mediaUrl or mediaBase64 is required",
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

    const { conversationId, mediaType, mediaUrl, mediaBase64, mediaName, caption } = parsed.data
    const mediaData = mediaUrl ?? mediaBase64!

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, phoneNumber: true },
    })
    if (!conversation) return Response.json({ error: "Conversation not found" }, { status: 404 })

    await sendWhatsAppMedia(
      conversation.phoneNumber,
      mediaType as MediaType,
      mediaData,
      mediaName,
      caption
    )

    const storedUrl = mediaUrl
      ?? (mediaBase64 && mediaType === "image" && mediaBase64.length < 800_000 ? mediaBase64 : null)

    const message = await prisma.message.create({
      data: {
        conversationId,
        content: caption ?? mediaName ?? mediaType,
        direction: "OUTBOUND",
        senderName: session.user.name ?? null,
        mediaType,
        mediaName: mediaName ?? null,
        mediaUrl: storedUrl,
      },
    })

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    })

    return Response.json(message, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal server error"
    console.error("[POST /api/messages/send-media]", msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}
