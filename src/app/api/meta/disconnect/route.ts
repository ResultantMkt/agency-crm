import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE() {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  try {
    await prisma.integration.deleteMany({ where: { name: "META_LEADGEN" } })
    return Response.json({ ok: true })
  } catch (err) {
    console.error("[meta disconnect]", err)
    return Response.json({ error: "Erro ao desconectar" }, { status: 500 })
  }
}
