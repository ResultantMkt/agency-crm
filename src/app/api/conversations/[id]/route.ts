import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { NextRequest } from "next/server"

const patchSchema = z.object({
  contactName: z.string().min(1).max(100).optional(),
  archived: z.boolean().optional(),
  pinned: z.boolean().optional(),
  favorite: z.boolean().optional(),
  pinnedMessageId: z.string().nullable().optional(),
  leadId: z.string().nullable().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const parsed = patchSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 })
    }

    const data: Record<string, unknown> = {}
    if (parsed.data.contactName !== undefined) {
      data.contactName = parsed.data.contactName.trim()
      data.contactNameManual = true
    }
    if (parsed.data.archived !== undefined) data.archived = parsed.data.archived
    if (parsed.data.pinned !== undefined) data.pinned = parsed.data.pinned
    if (parsed.data.favorite !== undefined) data.favorite = parsed.data.favorite
    if (parsed.data.pinnedMessageId !== undefined) data.pinnedMessageId = parsed.data.pinnedMessageId
    if (parsed.data.leadId !== undefined) data.leadId = parsed.data.leadId

    const conversation = await prisma.conversation.update({ where: { id }, data })
    return Response.json(conversation)
  } catch (error) {
    console.error("[PATCH /api/conversations/[id]]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    await prisma.conversation.delete({ where: { id } })
    return new Response(null, { status: 204 })
  } catch (error) {
    console.error("[DELETE /api/conversations/[id]]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
