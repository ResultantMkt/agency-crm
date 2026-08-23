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

    return Response.json(conversations)
  } catch (error) {
    console.error("[GET /api/conversations]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
