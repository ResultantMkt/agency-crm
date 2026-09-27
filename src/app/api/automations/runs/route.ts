import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
    const take = 20
    const skip = (page - 1) * take

    const [runs, total] = await Promise.all([
      prisma.automationRun.findMany({
        include: {
          automation: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.automationRun.count(),
    ])

    return Response.json({ runs, total, page, pages: Math.ceil(total / take) })
  } catch (error) {
    console.error("[GET /api/automations/runs]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
