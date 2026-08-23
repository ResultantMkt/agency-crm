import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { updateClientSchema } from "@/lib/validations/client"
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

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        receivables: { orderBy: { referenceMonth: "desc" } },
        tasks: true,
      },
    })

    if (!client) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    return Response.json(client)
  } catch (error) {
    console.error("[GET /api/clients/[id]]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

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

    const existing = await prisma.client.findUnique({ where: { id } })
    if (!existing) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    const body = await request.json()
    const parsed = updateClientSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: "Validation error", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const data = parsed.data
    const updateData: Record<string, unknown> = { ...data }

    if (data.startDate) updateData.startDate = new Date(data.startDate)
    if (data.endDate) updateData.endDate = new Date(data.endDate)

    const updated = await prisma.client.update({
      where: { id },
      data: updateData,
    })

    return Response.json(updated)
  } catch (error) {
    console.error("[PATCH /api/clients/[id]]", error)
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

    const existing = await prisma.client.findUnique({ where: { id } })
    if (!existing) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    await prisma.client.delete({ where: { id } })

    return Response.json({ success: true })
  } catch (error) {
    console.error("[DELETE /api/clients/[id]]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
