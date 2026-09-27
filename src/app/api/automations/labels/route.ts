import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { NextRequest } from "next/server"

export async function GET() {
  try {
    const session = await auth()
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const labels = await prisma.automationLabel.findMany({
      orderBy: { createdAt: "asc" },
    })

    return Response.json(labels)
  } catch (error) {
    console.error("[GET /api/automations/labels]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role !== "ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 })

    const body = await request.json()
    const { name, color } = body

    if (!name || typeof name !== "string") {
      return Response.json({ error: "name é obrigatório" }, { status: 400 })
    }

    const label = await prisma.automationLabel.create({
      data: {
        name,
        color: color ?? "#6366f1",
      },
    })

    return Response.json(label, { status: 201 })
  } catch (error) {
    console.error("[POST /api/automations/labels]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
