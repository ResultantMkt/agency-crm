import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { createReceivableSchema } from "@/lib/validations/receivable"
import { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get("month")
    const status = searchParams.get("status")
    const clientId = searchParams.get("clientId")

    const where: Record<string, unknown> = {}

    if (status) where.status = status
    if (clientId) where.clientId = clientId

    if (month) {
      const monthDate = new Date(month)
      const startOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
      const endOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999)
      where.referenceMonth = { gte: startOfMonth, lte: endOfMonth }
    }

    const receivables = await prisma.receivable.findMany({
      where,
      include: {
        client: { select: { name: true } },
      },
      orderBy: { referenceMonth: "desc" },
    })

    return Response.json(receivables)
  } catch (error) {
    console.error("[GET /api/receivables]", error)
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
    const parsed = createReceivableSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: "Validation error", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const data = parsed.data

    const receivable = await prisma.receivable.create({
      data: {
        clientId: data.clientId,
        value: data.value,
        referenceMonth: new Date(data.referenceMonth),
        status: data.status ?? "PENDING",
        dueDate: new Date(data.dueDate),
      },
    })

    return Response.json(receivable, { status: 201 })
  } catch (error) {
    console.error("[POST /api/receivables]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
