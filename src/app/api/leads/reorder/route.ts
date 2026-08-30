import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  updates: z
    .array(z.object({ id: z.string(), position: z.number().int().min(0) }))
    .min(1)
    .max(500),
})

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 })

  const { updates } = parsed.data

  await prisma.$transaction(
    updates.map(({ id, position }) =>
      prisma.lead.update({ where: { id }, data: { position } })
    )
  )

  return NextResponse.json({ ok: true })
}
