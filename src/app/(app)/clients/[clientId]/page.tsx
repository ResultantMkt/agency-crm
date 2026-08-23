import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle2,
  Circle,
  RefreshCw,
} from "lucide-react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { ClientStatusBadge } from "@/components/clients/client-status-badge"
import { formatCurrency, formatDate, formatMonth, getStartOfMonth, getEndOfMonth, cn } from "@/lib/utils"
import type { Client, Task, Receivable, ReceivableStatus } from "@/types/models"

export const metadata: Metadata = {
  title: "Detalhe do Cliente — Agency CRM",
}

const RECEIVABLE_CONFIG: Record<
  ReceivableStatus,
  { label: string; variant: "success" | "warning" }
> = {
  PAID: { label: "Pago", variant: "success" },
  PENDING: { label: "Pendente", variant: "warning" },
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const { clientId } = await params

  const now = new Date()
  const startOfMonth = getStartOfMonth(now)
  const endOfMonth = getEndOfMonth(now)

  const rawClient = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      receivables: {
        where: {
          referenceMonth: { gte: startOfMonth, lte: endOfMonth },
        },
        orderBy: { dueDate: "asc" },
      },
      tasks: {
        include: { assignedTo: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!rawClient) notFound()

  const client: Client & { receivables: Receivable[]; tasks: Task[] } = JSON.parse(
    JSON.stringify(rawClient)
  )

  const BILLING_LABELS = { MONTHLY: "Mensal", OTHER: "Outro" }

  const totalReceivables = client.receivables.reduce(
    (sum, r) => sum + parseFloat(r.value),
    0
  )
  const paidReceivables = client.receivables
    .filter((r) => r.status === "PAID")
    .reduce((sum, r) => sum + parseFloat(r.value), 0)

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <Link
        href="/clients"
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar a Clientes
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">{client.name}</h2>
          <p className="text-sm text-gray-400 mt-1">
            Desde {formatDate(client.startDate)}
          </p>
        </div>
        <ClientStatusBadge status={client.status} />
      </div>

      {/* Info do contrato */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Valor do contrato"
          value={formatCurrency(parseFloat(client.contractValue))}
        />
        <InfoCard
          icon={<RefreshCw className="h-4 w-4" />}
          label="Tipo de cobrança"
          value={BILLING_LABELS[client.billingType]}
        />
        <InfoCard
          icon={<Calendar className="h-4 w-4" />}
          label="Início do contrato"
          value={formatDate(client.startDate)}
        />
        {client.endDate ? (
          <InfoCard
            icon={<Calendar className="h-4 w-4" />}
            label="Vencimento"
            value={formatDate(client.endDate)}
          />
        ) : client.duration ? (
          <InfoCard
            icon={<Clock className="h-4 w-4" />}
            label="Duração"
            value={`${client.duration} ${client.duration === 1 ? "mês" : "meses"}`}
          />
        ) : null}
      </div>

      {/* Notas */}
      {client.notes && (
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-lg px-4 py-4">
          <p className="text-xs font-semibold text-gray-400 mb-1.5">Notas</p>
          <p className="text-sm text-gray-300 whitespace-pre-wrap">{client.notes}</p>
        </div>
      )}

      {/* Recebíveis do mês atual */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-white">
            Recebíveis — {formatMonth(now)}
          </h3>
          {client.receivables.length > 0 && (
            <div className="text-sm text-gray-400">
              <span className="text-emerald-400 font-medium">{formatCurrency(paidReceivables)}</span>
              {" "}de{" "}
              <span className="font-medium text-white">{formatCurrency(totalReceivables)}</span>
              {" "}recebido
            </div>
          )}
        </div>

        {client.receivables.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum recebível registrado para este mês.</p>
        ) : (
          <div className="rounded-lg border border-gray-700/50 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700/50 bg-gray-800/80">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Vencimento
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {client.receivables.map((r) => {
                  const config = RECEIVABLE_CONFIG[r.status]
                  return (
                    <tr
                      key={r.id}
                      className="bg-gray-800/30 hover:bg-gray-800/60 transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-300">{formatDate(r.dueDate)}</td>
                      <td className="px-4 py-3 font-medium text-white">
                        {formatCurrency(parseFloat(r.value))}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={config.variant}>{config.label}</Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Tarefas vinculadas */}
      <section>
        <h3 className="text-base font-semibold text-white mb-3">
          Tarefas ({client.tasks.length})
        </h3>
        {client.tasks.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma tarefa vinculada a este cliente.</p>
        ) : (
          <ul className="space-y-2">
            {client.tasks.map((task) => (
              <li
                key={task.id}
                className="flex items-start gap-3 bg-gray-800/60 border border-gray-700/50 rounded-lg px-4 py-3"
              >
                {task.status === "DONE" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      task.status === "DONE" ? "text-gray-500 line-through" : "text-white"
                    )}
                  >
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{task.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    {task.assignedTo && (
                      <span className="text-xs text-gray-500">{task.assignedTo.name}</span>
                    )}
                    {task.dueDate && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(task.dueDate)}
                      </span>
                    )}
                  </div>
                </div>
                <Badge
                  variant={task.status === "DONE" ? "success" : "warning"}
                  className="shrink-0 text-xs"
                >
                  {task.status === "DONE" ? "Concluída" : "Pendente"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
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
    <div className="bg-gray-800/60 border border-gray-700/50 rounded-lg px-4 py-3">
      <div className="flex items-center gap-2 text-gray-400 mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-sm font-medium text-white truncate">{value}</p>
    </div>
  )
}
