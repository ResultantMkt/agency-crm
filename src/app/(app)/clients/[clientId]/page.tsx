import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Clock,
  Tag,
  FileText,
  Kanban,
  BookOpen,
  Link2,
} from "lucide-react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ClientStatusBadge } from "@/components/clients/client-status-badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { Client } from "@/types/models"

export const metadata: Metadata = {
  title: "Detalhe do Cliente — Agency CRM",
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

const DURATION_LABELS: Record<number, string> = {
  3: "3 meses",
  6: "6 meses",
  12: "1 ano",
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const { clientId } = await params

  const rawClient = await prisma.client.findUnique({
    where: { id: clientId },
  })

  if (!rawClient) notFound()

  const client: Client = JSON.parse(JSON.stringify(rawClient))

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Back */}
      <Link
        href="/clients"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar a Clientes
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{client.name}</h2>
          {client.niche && (
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              {client.niche}
            </p>
          )}
        </div>
        <ClientStatusBadge status={client.status} />
      </div>

      {/* Dados do contrato */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <InfoCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Valor do contrato"
          value={formatCurrency(parseFloat(client.contractValue))}
        />
        <InfoCard
          icon={<Calendar className="h-4 w-4" />}
          label="Início do contrato"
          value={formatDate(client.startDate)}
        />
        {client.endDate ? (
          <InfoCard
            icon={<Calendar className="h-4 w-4" />}
            label="Término do contrato"
            value={formatDate(client.endDate)}
          />
        ) : client.duration ? (
          <InfoCard
            icon={<Clock className="h-4 w-4" />}
            label="Duração"
            value={DURATION_LABELS[client.duration] ?? `${client.duration} meses`}
          />
        ) : null}
      </div>

      {/* Subpáginas */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Páginas do cliente
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SUBPAGES.map(({ slug, label, icon: Icon, description }) => (
            <Link
              key={slug}
              href={`/clients/${clientId}/${slug}`}
              className="group flex items-start gap-4 rounded-lg border border-gray-200/50 bg-gray-100/40 px-4 py-4 hover:bg-gray-100/80 hover:border-gray-300/60 transition-all"
            >
              <div className="mt-0.5 rounded-md bg-white/80 p-2 border border-gray-200/60 group-hover:border-gray-300/60 transition-colors">
                <Icon className="h-4 w-4 text-gray-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="bg-gray-100/60 border border-gray-200/50 rounded-lg px-4 py-3">
      <div className="flex items-center gap-2 text-gray-500 mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-sm font-medium text-gray-900 truncate">{value}</p>
    </div>
  )
}
