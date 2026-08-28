import { prisma } from "@/lib/prisma"
import { normalizePhone } from "@/lib/zapi"
import { findOrCreateLead } from "@/lib/lead-capture"
import { NextRequest } from "next/server"

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

    // Extrair campos do payload Z-API
    const rawPhone: string | undefined = body.phone ?? body.from
    const text: string | undefined = body.text?.message ?? body.message?.text
    const senderName: string | undefined = body.senderName ?? body.pushName
    // Nome do contato/grupo: subject para grupos (Z-API), pushname para individuais
    const incomingName: string | undefined =
      body.subject ??     // nome/assunto do grupo no WhatsApp (Z-API)
      body.chatName ??    // alternativas
      body.groupName ??
      body.pushname ??    // nome do contato no WhatsApp (Z-API — lowercase)
      body.pushName ??
      body.senderName

    // Ignorar mensagens sem texto (sticker, imagem, áudio, etc.)
    if (!text || !rawPhone) {
      return Response.json({ ok: true })
    }

    // Normalizar phone: remover @s.whatsapp.net e caracteres não-numéricos
    const cleanPhone = rawPhone.replace("@s.whatsapp.net", "")
    const phoneNumber = normalizePhone(cleanPhone)

    if (!phoneNumber) {
      return Response.json({ ok: true })
    }

    // Upsert da conversa pelo phoneNumber (unique)
    const conversation = await prisma.conversation.upsert({
      where: { phoneNumber },
      create: {
        phoneNumber,
        leadId: null,
        clientId: null,
        contactName: incomingName ?? null,
      },
      update: {
        updatedAt: new Date(),
      },
    })

    // Atualiza o nome somente se não foi editado manualmente pelo usuário
    if (incomingName) {
      await prisma.conversation.updateMany({
        where: { phoneNumber, contactNameManual: false },
        data: { contactName: incomingName },
      })
    }

    // Linkar conversa a um lead existente, ou criar novo lead automaticamente
    if (!conversation.leadId) {
      const { leadId, created } = await findOrCreateLead({
        name: incomingName ?? phoneNumber,
        phone: phoneNumber,
        source: "OTHER",
        notes: "Lead gerado automaticamente via WhatsApp",
      })

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { leadId },
      })

      if (created) {
        console.log(`[zapi webhook] Lead criado automaticamente: ${phoneNumber}`)
      }
    }

    // Criar mensagem INBOUND
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        content: text,
        direction: "INBOUND",
        senderName: senderName ?? null,
      },
    })

    return Response.json({ ok: true })
  } catch (error) {
    console.error("[POST /api/webhooks/zapi]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
