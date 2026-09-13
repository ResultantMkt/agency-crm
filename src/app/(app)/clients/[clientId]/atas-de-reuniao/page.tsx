import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { MeetingNotesEditor } from "@/components/clients/meeting-notes-editor"

export const metadata: Metadata = {
  title: "Atas de Reunião — Agency CRM",
}

export default async function AtasDeReuniaoPage({
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

  const notes = await prisma.clientMeetingNotes.findUnique({
    where: { clientId },
  })

  const initialContent = Array.isArray(notes?.content)
    ? (notes.content as unknown[])
    : []

  return (
    <div className="space-y-6 max-w-4xl">
      <Link
        href={`/clients/${clientId}`}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar a {client.name}
      </Link>

      <div>
        <h2 className="text-2xl font-bold text-gray-900">Atas de Reunião</h2>
        <p className="text-sm text-gray-500 mt-1">
          Registro de reuniões e decisões do projeto de {client.name}.
        </p>
      </div>

      <div className="relative pt-8">
        <MeetingNotesEditor clientId={clientId} initialContent={initialContent} />
      </div>
    </div>
  )
}
