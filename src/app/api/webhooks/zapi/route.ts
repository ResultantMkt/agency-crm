import { prisma } from "@/lib/prisma"
import { normalizePhone, phoneBRVariants } from "@/lib/zapi"
import { findOrCreateLead } from "@/lib/lead-capture"
import { emitLeadEvent } from "@/lib/automation-engine"
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

/** Parse IGNORED_LEAD_PHONES env var (comma-separated) into a Set of all phone variants */
function buildIgnoredSet(): Set<string> {
  const raw = process.env.IGNORED_LEAD_PHONES ?? ""
  const set = new Set<string>()
  for (const entry of raw.split(",")) {
    const trimmed = entry.trim()
    if (!trimmed) continue
    for (const v of phoneBRVariants(trimmed)) set.add(v)
  }
  return set
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

    // Ignore echo events fired when the instance itself sends a message
    if (body.fromMe === true || body.isFromMe === true) {
      return Response.json({ ok: true })
    }

    // Ignore status updates, broadcasts, and newsletters
    if (
      body.isStatusMessage === true ||
      body.isNewsletter === true ||
      body.type === "broadcast" ||
      body.type === "status"
    ) {
      return Response.json({ ok: true })
    }

    const rawPhone: string | undefined = body.phone ?? body.from
    const text: string | undefined = body.text?.message ?? body.message?.text
    const senderName: string | undefined = body.senderName ?? body.pushName

    // Detect groups: Z-API may signal via the phone suffix (@g.us) or directly via body.isGroup
    const isGroup =
      body.isGroup === true ||
      (typeof rawPhone === "string" && rawPhone.includes("@g.us"))

    const groupName: string | null = isGroup
      ? ((body.subject ?? body.chatName ?? body.groupName ?? null) as string | null)
      : null
    const incomingName: string | undefined = isGroup
      ? (groupName ?? undefined)
      : ((body.subject ?? body.chatName ?? body.groupName ??
          body.pushname ?? body.pushName ?? body.senderName) as string | undefined)

    const { mediaType, mediaUrl, mediaName, caption } = extractMedia(body as Record<string, unknown>)

    // Ignore stickers and messages with no content (text or media)
    const hasText = !!text
    const hasMedia = !!mediaType && mediaType !== "sticker" && !!mediaUrl
    if ((!hasText && !hasMedia) || !rawPhone) {
      return Response.json({ ok: true })
    }

    const cleanPhone = rawPhone.replace("@s.whatsapp.net", "").replace("@g.us", "")
    const phoneNumber = normalizePhone(cleanPhone)
    if (!phoneNumber) return Response.json({ ok: true })

    const conversation = await prisma.conversation.upsert({
      where: { phoneNumber },
      create: {
        phoneNumber,
        leadId: null,
        clientId: null,
        contactName: incomingName ?? null,
        isGroup,
        groupName,
      },
      update: { updatedAt: new Date() },
    })

    if (incomingName) {
      await prisma.conversation.updateMany({
        where: { phoneNumber, contactNameManual: false },
        data: { contactName: incomingName, isGroup, groupName },
      })
    }

    // Only create a lead when:
    // 1. This conversation isn't already linked to a lead or client
    // 2. Not a group message
    // 3. Not in the ignored phones list (internal team numbers)
    // 4. Not blocked
    if (!conversation.leadId && !conversation.clientId && !isGroup) {
      const ignoredSet = buildIgnoredSet()
      const phoneVariants = phoneBRVariants(phoneNumber)
      const isIgnored = phoneVariants.some(v => ignoredSet.has(v))

      if (!isIgnored) {
        const blocked = await prisma.blockedContact.findFirst({
          where: { phoneNumber: { in: phoneVariants } },
        })

        if (!blocked) {
          const { leadId, created } = await findOrCreateLead({
            name: incomingName ?? phoneNumber,
            phone: phoneNumber,
            source: "OTHER",
            notes: "Lead gerado automaticamente via WhatsApp",
          })
          await prisma.conversation.update({ where: { id: conversation.id }, data: { leadId } })
          if (created) {
            console.log(`[zapi webhook] Lead criado: ${phoneNumber}`)
            emitLeadEvent("lead.created", leadId, { source: "OTHER", via: "zapi" }).catch(() => {})
          }
        }
      }
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
