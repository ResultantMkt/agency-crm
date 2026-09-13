import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, FileText, Kanban, BookOpen, Link2 } from "lucide-react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const metadata: Metadata = {
  title: "Cliente — Agency CRM",
}

const SUBPAGES = [
  {
    slug: "sobre-o-projeto",
    label: "Sobre o Projeto",
    icon: FileText,
    description: "Briefing, objetivos e contexto do projeto",
  },
  {
    slug: "kanban-de-atividades",
    label: "Kanban de Atividades",
    icon: Kanban,
    description: "Quadro de tarefas e fluxo de trabalho",
  },
  {
    slug: "atas-de-reuniao",
    label: "Atas de Reunião",
    icon: BookOpen,
    description: "Registro das reuniões e decisões",
  },
  {
    slug: "acessos-e-links",
    label: "Acessos e Links",
    icon: Link2,
    description: "Credenciais, ferramentas e links úteis",
  },
]

function getInitials(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?"
}

export default async function ClientHubPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const { clientId } = await params

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, niche: true, logoUrl: true },
  })

  if (!client) notFound()

  return (
    <div className="max-w-2xl space-y-8">
      {/* Voltar */}
      <Link
        href="/clients"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar a Clientes
      </Link>

      {/* Logo + nome */}
      <div className="flex flex-col items-center text-center gap-4 py-6">
        {client.logoUrl ? (
          <img
            src={client.logoUrl}
            alt={client.name}
            className="h-24 w-24 rounded-full object-cover shadow-sm ring-2 ring-gray-100"
          />
        ) : (
          <div className="h-24 w-24 rounded-full bg-purple-600 flex items-center justify-center text-white text-2xl font-bold uppercase shadow-sm ring-2 ring-gray-100">
            {getInitials(client.name)}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
          {client.niche && (
            <p className="text-sm text-gray-500 mt-1">{client.niche}</p>
          )}
        </div>
      </div>

      {/* Subpáginas */}
      <div className="space-y-2">
        {SUBPAGES.map(({ slug, label, icon: Icon, description }) => (
          <Link
            key={slug}
            href={`/clients/${clientId}/${slug}`}
            className="group flex items-center gap-4 rounded-xl border border-gray-200/60 bg-white px-4 py-4 hover:border-gray-300 hover:bg-gray-50/60 transition-all"
          >
            <div className="shrink-0 rounded-lg bg-gray-100 p-2.5 border border-gray-200/60 group-hover:border-gray-300/60 transition-colors">
              <Icon className="h-4 w-4 text-gray-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">{label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
