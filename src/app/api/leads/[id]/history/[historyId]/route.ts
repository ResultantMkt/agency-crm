import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { NextRequest } from "next/server"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; historyId: string }> }
) {
  try {
    const session = await auth()
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const { historyId } = await params
    const { comment } = await request.json()

    const updated = await prisma.leadHistory.update({
      where: { id: historyId },
      data: {
        comment: comment?.trim() || null,
        commentByName: comment?.trim() ? session.user.name : null,
        commentAt: comment?.trim() ? new Date() : null,
      },
      include: { changedBy: { select: { name: true } } },
    })

    return Response.json(updated)
  } catch (error) {
    console.error("[PATCH /api/leads/[id]/history/[historyId]]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
