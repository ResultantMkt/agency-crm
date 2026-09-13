import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ClientKanbanBoard } from "@/components/clients/client-kanban-board"

export const metadata: Metadata = {
  title: "Kanban de Atividades — Agency CRM",
}

export default async function KanbanDeAtividadesPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const { clientId } = await params

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, name: true },
  })

  if (!client) notFound()

  const rawCards = await prisma.clientKanbanCard.findMany({
    where: { clientId },
    orderBy: { position: "asc" },
  })

  const cards = JSON.parse(JSON.stringify(rawCards))

  return (
    <div className="flex flex-col h-full space-y-6">
      <Link
        href={`/clients/${clientId}`}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar a {client.name}
      </Link>

      <div>
        <h2 className="text-2xl font-bold text-gray-900">Kanban de Atividades</h2>
        <p className="text-sm text-gray-500 mt-1">
          Gerencie as atividades do projeto de {client.name}.
        </p>
      </div>

      <ClientKanbanBoard clientId={clientId} initialCards={cards} />
    </div>
  )
}
