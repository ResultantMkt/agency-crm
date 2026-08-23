import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { createTaskSchema } from "@/lib/validations/task"
import { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const assignedToId = searchParams.get("assignedToId")
    const status = searchParams.get("status")
    const leadId = searchParams.get("leadId")
    const clientId = searchParams.get("clientId")

    const where: Record<string, unknown> = {}
    if (assignedToId) where.assignedToId = assignedToId
    if (status) where.status = status
    if (leadId) where.leadId = leadId
    if (clientId) where.clientId = clientId

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignedTo: { select: { name: true } },
        lead: { select: { name: true } },
        client: { select: { name: true } },
      },
      orderBy: { dueDate: "asc" },
    })

    return Response.json(tasks)
  } catch (error) {
    console.error("[GET /api/tasks]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = createTaskSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: "Validation error", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const data = parsed.data

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        assignedToId: data.assignedToId,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        status: data.status ?? "PENDING",
        leadId: data.leadId,
        clientId: data.clientId,
      },
    })

    return Response.json(task, { status: 201 })
  } catch (error) {
    console.error("[POST /api/tasks]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
