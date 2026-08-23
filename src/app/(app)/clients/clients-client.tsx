"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Eye } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ClientForm } from "@/components/clients/client-form"
import { ClientStatusBadge } from "@/components/clients/client-status-badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { Client } from "@/types/models"

interface ClientsClientProps {
  initialClients: Client[]
}

export function ClientsClient({ initialClients }: ClientsClientProps) {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>(initialClients)
  const [formOpen, setFormOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | undefined>(undefined)

  function openCreate() {
    setEditingClient(undefined)
    setFormOpen(true)
  }

  function openEdit(client: Client, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setEditingClient(client)
    setFormOpen(true)
  }

  function handleSuccess(client: Client) {
    setClients((prev) => {
      const idx = prev.findIndex((c) => c.id === client.id)
      if (idx !== -1) {
        const next = [...prev]
        next[idx] = client
        return next
      }
      return [client, ...prev]
    })
    router.refresh()
  }

  const BILLING_LABELS = { MONTHLY: "Mensal", OTHER: "Outro" }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Clientes</h2>
          <p className="mt-1 text-sm text-gray-400">
            {clients.length} cliente{clients.length !== 1 ? "s" : ""} cadastrado{clients.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      {/* Tabela */}
      {clients.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-700 p-12 text-center">
          <p className="text-gray-500 text-sm">Nenhum cliente cadastrado ainda.</p>
          <Button onClick={openCreate} variant="outline" size="sm" className="mt-4">
            <Plus className="h-4 w-4" />
            Adicionar primeiro cliente
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-700/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700/50 bg-gray-800/80">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Valor do contrato
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Início
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/30">
              {clients.map((client) => (
                <tr
                  key={client.id}
                  className="bg-gray-800/30 hover:bg-gray-800/60 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-white">{client.name}</td>
                  <td className="px-4 py-3 text-emerald-400 font-medium">
                    {formatCurrency(parseFloat(client.contractValue))}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {BILLING_LABELS[client.billingType]}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{formatDate(client.startDate)}</td>
                  <td className="px-4 py-3">
                    <ClientStatusBadge status={client.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => openEdit(client, e)}
                        className="h-8 w-8 p-0"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Link href={`/clients/${client.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Ver detalhes">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog */}
      <ClientForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={handleSuccess}
        client={editingClient}
      />
    </div>
  )
}
