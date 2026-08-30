import { prisma } from "@/lib/prisma"
import { normalizePhone } from "@/lib/zapi"
import { findOrCreateLead } from "@/lib/lead-capture"
import { NextRequest } from "next/server"

type ZapiMediaType = "image" | "video" | "audio" | "document" | "sticker"

function extractMedia(body: Record<string, unknown>): {
  mediaType: ZapiMediaType | null
  mediaUrl: string | null
  mediaName: string | null
  caption: string | null
} {
  const type = body.type as string | undefined
  if (!type || type === "text") return { mediaType: null, mediaUrl: null, mediaName: null, caption: null }

  if (type === "image" || type === "video") {
    const media = body[type] as Record<string, string> | undefined
    return {
      mediaType: type as ZapiMediaType,
      mediaUrl: media?.url ?? null,
      mediaName: null,
      caption: media?.caption ?? null,
    }
  }
  if (type === "audio") {
    const audio = body.audio as Record<string, string> | undefined
    return { mediaType: "audio", mediaUrl: audio?.url ?? null, mediaName: null, caption: null }
  }
  if (type === "document") {
    const doc = body.document as Record<string, string> | undefined
    return {
      mediaType: "document",
      mediaUrl: doc?.url ?? null,
      mediaName: doc?.fileName ?? doc?.filename ?? null,
      caption: doc?.caption ?? null,
    }
  }
  if (type === "sticker") {
    return { mediaType: "sticker", mediaUrl: null, mediaName: null, caption: null }
  }
  return { mediaType: null, mediaUrl: null, mediaName: null, caption: null }
}

export async function POST(request: NextRequest) {
  const secret = process.env.WEBHOOK_SECRET
  if (secret) {
    const provided =
      request.nextUrl.searchParams.get("secret") ??
      request.headers.get("x-webhook-secret")
    if (provided !== secret) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  try {
    const body = await request.json()

    const rawPhone: string | undefined = body.phone ?? body.from
    const text: string | undefined = body.text?.message ?? body.message?.text
    const senderName: string | undefined = body.senderName ?? body.pushName
    const incomingName: string | undefined =
      body.subject ?? body.chatName ?? body.groupName ??
      body.pushname ?? body.pushName ?? body.senderName

    const { mediaType, mediaUrl, mediaName, caption } = extractMedia(body as Record<string, unknown>)

    // Ignore stickers and messages with no content (text or media)
    const hasText = !!text
    const hasMedia = !!mediaType && mediaType !== "sticker" && !!mediaUrl
    if ((!hasText && !hasMedia) || !rawPhone) {
      return Response.json({ ok: true })
    }

    const cleanPhone = rawPhone.replace("@s.whatsapp.net", "")
    const phoneNumber = normalizePhone(cleanPhone)
    if (!phoneNumber) return Response.json({ ok: true })

    const conversation = await prisma.conversation.upsert({
      where: { phoneNumber },
      create: { phoneNumber, leadId: null, clientId: null, contactName: incomingName ?? null },
      update: { updatedAt: new Date() },
    })

    if (incomingName) {
      await prisma.conversation.updateMany({
        where: { phoneNumber, contactNameManual: false },
        data: { contactName: incomingName },
      })
    }

    if (!conversation.leadId) {
      const { leadId, created } = await findOrCreateLead({
        name: incomingName ?? phoneNumber,
        phone: phoneNumber,
        source: "OTHER",
        notes: "Lead gerado automaticamente via WhatsApp",
      })
      await prisma.conversation.update({ where: { id: conversation.id }, data: { leadId } })
      if (created) console.log(`[zapi webhook] Lead criado: ${phoneNumber}`)
    }

    const messageContent = hasMedia
      ? (caption ?? mediaName ?? mediaType ?? "")
      : (text ?? "")

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        content: messageContent,
        direction: "INBOUND",
        senderName: senderName ?? null,
        mediaType: hasMedia ? mediaType : null,
        mediaUrl: hasMedia ? mediaUrl : null,
        mediaName: hasMedia ? mediaName : null,
      },
    })

    return Response.json({ ok: true })
  } catch (error) {
    console.error("[POST /api/webhooks/zapi]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
