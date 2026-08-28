import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { NextRequest } from "next/server"

const patchSchema = z.object({
  contactName: z.string().min(1, "Nome não pode ser vazio").max(100),
})

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
    const body = await request.json()
    const parsed = patchSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: "Validation error", details: parsed.error.issues },
        { status: 400 }
      )
    }

    const conversation = await prisma.conversation.update({
      where: { id },
      data: {
        contactName: parsed.data.contactName.trim(),
        contactNameManual: true,
      },
    })

    return Response.json(conversation)
  } catch (error) {
    console.error("[PATCH /api/conversations/[id]]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
