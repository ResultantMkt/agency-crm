import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { updateExpenseSchema } from "@/lib/validations/expense"
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

    const existing = await prisma.expense.findUnique({ where: { id } })
    if (!existing) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    const body = await request.json()
    const parsed = updateExpenseSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: "Validation error", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const data = parsed.data
    const updateData: Record<string, unknown> = { ...data }

    if (data.month) updateData.month = new Date(data.month)

    const updated = await prisma.expense.update({
      where: { id },
      data: updateData,
    })

    return Response.json(updated)
  } catch (error) {
    console.error("[PATCH /api/expenses/[id]]", error)
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

    const existing = await prisma.expense.findUnique({ where: { id } })
    if (!existing) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    await prisma.expense.delete({ where: { id } })

    return Response.json({ success: true })
  } catch (error) {
    console.error("[DELETE /api/expenses/[id]]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
