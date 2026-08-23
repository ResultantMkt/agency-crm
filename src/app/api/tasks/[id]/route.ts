import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { updateTaskSchema } from "@/lib/validations/task"
import { NextRequest } from "next/server"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const existing = await prisma.task.findUnique({ where: { id } })
    if (!existing) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    const body = await request.json()
    const parsed = updateTaskSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: "Validation error", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const data = parsed.data
    const updateData: Record<string, unknown> = { ...data }

    if (data.dueDate) updateData.dueDate = new Date(data.dueDate)

    const updated = await prisma.task.update({
      where: { id },
      data: updateData,
    })

    return Response.json(updated)
  } catch (error) {
    console.error("[PATCH /api/tasks/[id]]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const existing = await prisma.task.findUnique({ where: { id } })
    if (!existing) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    await prisma.task.delete({ where: { id } })

    return Response.json({ success: true })
  } catch (error) {
    console.error("[DELETE /api/tasks/[id]]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
