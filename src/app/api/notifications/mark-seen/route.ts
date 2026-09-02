import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { section } = (await request.json()) as { section: "crm" | "chats" }

  const data =
    section === "crm"
      ? { lastSeenCrmAt: new Date() }
      : { lastSeenChatsAt: new Date() }

  await prisma.user.update({ where: { id: session.user.id }, data })

  return Response.json({ ok: true })
}
