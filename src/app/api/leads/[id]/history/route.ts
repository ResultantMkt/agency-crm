import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { NextRequest } from "next/server"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const history = await prisma.leadHistory.findMany({
      where: { leadId: id },
      include: {
        changedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return Response.json(history)
  } catch (error) {
    console.error("[GET /api/leads/[id]/history]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
