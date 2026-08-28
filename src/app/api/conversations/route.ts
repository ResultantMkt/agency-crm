import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const conversations = await prisma.conversation.findMany({
      include: {
        messages: {
          take: 1,
          orderBy: { sentAt: "desc" },
        },
        lead: { select: { name: true } },
        client: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
    })

    // Para conversas sem contactName (criadas antes do recurso), buscar o nome
    // do remetente na última mensagem INBOUND e usá-lo como fallback.
    const withoutName = conversations.filter((c) => !c.contactName)

    if (withoutName.length > 0) {
      const inboundMsgs = await prisma.message.findMany({
        where: {
          conversationId: { in: withoutName.map((c) => c.id) },
          direction: "INBOUND",
          senderName: { not: null },
        },
        orderBy: { sentAt: "desc" },
        distinct: ["conversationId"],
        select: { conversationId: true, senderName: true },
      })

      const nameMap: Record<string, string> = {}
      for (const msg of inboundMsgs) {
        if (msg.senderName) nameMap[msg.conversationId] = msg.senderName
      }

      // Persistir o nome encontrado para não precisar repetir a busca no futuro
      if (Object.keys(nameMap).length > 0) {
        await prisma.$transaction(
          Object.entries(nameMap).map(([id, name]) =>
            prisma.conversation.updateMany({
              where: { id, contactNameManual: false },
              data: { contactName: name },
            })
          )
        )

        return Response.json(
          conversations.map((c) => ({
            ...c,
            contactName: c.contactName ?? nameMap[c.id] ?? null,
          }))
        )
      }
    }

    return Response.json(conversations)
  } catch (error) {
    console.error("[GET /api/conversations]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
