import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const integrations = await prisma.integration.findMany({
      select: {
        id: true,
        name: true,
        config: true,
        updatedAt: true,
      },
    })

    return Response.json(integrations)
  } catch (error) {
    console.error("[GET /api/settings/integrations]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, config } = body as { name: string; config: Record<string, string> }

    if (!name) {
      return Response.json({ error: "name é obrigatório" }, { status: 400 })
    }

    const integration = await prisma.integration.upsert({
      where: { name },
      update: { config },
      create: { name, config },
    })

    return Response.json(integration)
  } catch (error) {
    console.error("[POST /api/settings/integrations]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
