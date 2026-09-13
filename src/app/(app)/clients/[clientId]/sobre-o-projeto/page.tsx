import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ProjectLinksEditor } from "@/components/clients/project-links-editor"

export const metadata: Metadata = {
  title: "Sobre o Projeto — Agency CRM",
}

export default async function SobreOProjetoPage({
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

  return (
    <div className="space-y-6 max-w-2xl">
      <Link
        href={`/clients/${clientId}`}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar a {client.name}
      </Link>

      <div>
        <h2 className="text-2xl font-bold text-gray-900">Sobre o Projeto</h2>
        <p className="text-sm text-gray-500 mt-1">
          Links e materiais de referência do projeto de {client.name}.
        </p>
      </div>

      <ProjectLinksEditor clientId={clientId} />
    </div>
  )
}
