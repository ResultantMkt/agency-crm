import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { NextRequest } from "next/server"

export async function GET() {
  try {
    const session = await auth()
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const sequences = await prisma.sequence.findMany({
      include: {
        _count: { select: { steps: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return Response.json(sequences)
  } catch (error) {
    console.error("[GET /api/sequences]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role !== "ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 })

    const body = await request.json()
    const { name, description } = body

    if (!name || typeof name !== "string") {
      return Response.json({ error: "name é obrigatório" }, { status: 400 })
    }

    const sequence = await prisma.sequence.create({
      data: { name, description: description ?? null },
      include: { _count: { select: { steps: true } } },
    })

    return Response.json(sequence, { status: 201 })
  } catch (error) {
    console.error("[POST /api/sequences]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
