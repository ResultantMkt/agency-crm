import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const sequenceId = searchParams.get("sequenceId")

    const where = sequenceId ? { sequenceId } : undefined

    const templates = await prisma.whatsAppTemplate.findMany({
      where,
      include: { sequence: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    })

    return Response.json(templates)
  } catch (error) {
    console.error("[GET /api/whatsapp-templates]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role !== "ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 })

    const body = await request.json()
    const { name, body: templateBody, sequenceId } = body

    if (!name || typeof name !== "string") {
      return Response.json({ error: "name é obrigatório" }, { status: 400 })
    }
    if (!templateBody || typeof templateBody !== "string") {
      return Response.json({ error: "body é obrigatório" }, { status: 400 })
    }

    const template = await prisma.whatsAppTemplate.create({
      data: {
        name,
        body: templateBody,
        sequenceId: sequenceId ?? null,
      },
      include: { sequence: { select: { id: true, name: true } } },
    })

    return Response.json(template, { status: 201 })
  } catch (error) {
    console.error("[POST /api/whatsapp-templates]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
