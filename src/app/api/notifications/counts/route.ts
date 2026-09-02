import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { lastSeenCrmAt: true, lastSeenChatsAt: true },
  })

  const epoch = new Date(0)

  const [crm, chats] = await Promise.all([
    prisma.lead.count({
      where: { createdAt: { gt: user?.lastSeenCrmAt ?? epoch } },
    }),
    prisma.conversation.count({
      where: {
        archived: false,
        messages: {
          some: {
            direction: "INBOUND",
            sentAt: { gt: user?.lastSeenChatsAt ?? epoch },
          },
        },
      },
    }),
  ])

  return Response.json({ crm, chats })
}
