import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { NextRequest } from "next/server"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      select: { leadId: true, phoneNumber: true, contactName: true },
    })
    if (!conversation) return Response.json({ error: "Not found" }, { status: 404 })

    let lead = null
    if (conversation.leadId) {
      lead = await prisma.lead.findUnique({
        where: { id: conversation.leadId },
        include: {
          assignedTo: { select: { id: true, name: true } },
          tasks: {
            orderBy: { dueDate: "asc" },
            select: { id: true, title: true, status: true, dueDate: true, assignedTo: { select: { name: true } } },
          },
        },
      })
    }

    if (!lead) {
      const normalized = conversation.phoneNumber.replace(/\D/g, "")
      lead = await prisma.lead.findFirst({
        where: { phone: { contains: normalized } },
        include: {
          assignedTo: { select: { id: true, name: true } },
          tasks: {
            orderBy: { dueDate: "asc" },
            select: { id: true, title: true, status: true, dueDate: true, assignedTo: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    }

    const users = await prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    })

    return Response.json({ lead, users, contactName: conversation.contactName })
  } catch (error) {
    console.error("[GET /api/conversations/[id]/lead]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
