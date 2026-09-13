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
    <div className="flex justify-center">
      <div className="w-full max-w-2xl space-y-10">
        {/* Voltar */}
        <Link
          href="/clients"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar a Clientes
        </Link>

        {/* Logo + nome */}
        <div className="flex flex-col items-center text-center gap-4 py-4">
          {client.logoUrl ? (
            <img
              src={client.logoUrl}
              alt={client.name}
              className="h-24 w-24 rounded-full object-cover shadow-md ring-4 ring-white"
            />
          ) : (
            <div className="h-24 w-24 rounded-full bg-purple-600 flex items-center justify-center text-white text-2xl font-bold uppercase shadow-md ring-4 ring-white">
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

        {/* Subpáginas — grade 2×2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SUBPAGES.map(({ slug, label, icon: Icon, description }) => (
            <Link
              key={slug}
              href={`/clients/${clientId}/${slug}`}
              className="group flex items-start gap-4 rounded-xl border border-gray-200/70 bg-white px-5 py-5 shadow-sm hover:shadow-md hover:border-purple-200 hover:-translate-y-0.5 transition-all duration-150"
            >
              <div className="shrink-0 rounded-lg bg-purple-50 border border-purple-100 p-2.5 group-hover:bg-purple-100 transition-colors">
                <Icon className="h-5 w-5 text-purple-600" />
              </div>
              <div className="min-w-0 pt-0.5">
                <p className="text-sm font-semibold text-gray-900">{label}</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
