import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { createClientSchema } from "@/lib/validations/client"
import { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    const where: Record<string, unknown> = {}
    if (status) where.status = status

    const clients = await prisma.client.findMany({
      where,
      orderBy: { name: "asc" },
    })

    return Response.json(clients)
  } catch (error) {
    console.error("[GET /api/clients]", error)
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
    const parsed = createClientSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: "Validation error", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const data = parsed.data

    const client = await prisma.client.create({
      data: {
        name: data.name,
        contractValue: data.contractValue,
        billingType: data.billingType,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        duration: data.duration,
        status: data.status ?? "ACTIVE",
        notes: data.notes,
      },
    })

    return Response.json(client, { status: 201 })
  } catch (error) {
    console.error("[POST /api/clients]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
