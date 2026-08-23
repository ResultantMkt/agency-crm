import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { createExpenseSchema } from "@/lib/validations/expense"
import { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get("month")

    if (month) {
      const monthDate = new Date(month)
      const startOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
      const endOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999)

      const expenses = await prisma.expense.findMany({
        where: {
          OR: [
            { isRecurring: true },
            {
              month: {
                gte: startOfMonth,
                lte: endOfMonth,
              },
            },
          ],
        },
        orderBy: { createdAt: "desc" },
      })

      return Response.json(expenses)
    }

    const expenses = await prisma.expense.findMany({
      orderBy: { createdAt: "desc" },
    })

    return Response.json(expenses)
  } catch (error) {
    console.error("[GET /api/expenses]", error)
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
    const parsed = createExpenseSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: "Validation error", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const data = parsed.data

    const expense = await prisma.expense.create({
      data: {
        description: data.description,
        category: data.category,
        value: data.value,
        dueDay: data.dueDay,
        isRecurring: data.isRecurring ?? false,
        month: data.month ? new Date(data.month) : undefined,
      },
    })

    return Response.json(expense, { status: 201 })
  } catch (error) {
    console.error("[POST /api/expenses]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
