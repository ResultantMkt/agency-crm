"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Plus, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ClientForm } from "@/components/clients/client-form"
import type { Client } from "@/types/models"

interface ClientsClientProps {
  initialClients: Client[]
}

function getInitials(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?"
}

function ClientAvatar({ client }: { client: Client }) {
  if (client.logoUrl) {
    return (
      <img
        src={client.logoUrl}
        alt={client.name}
        className="h-11 w-11 rounded-full object-cover shrink-0"
      />
    )
  }
  return (
    <div className="h-11 w-11 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-bold uppercase shrink-0">
      {getInitials(client.name)}
    </div>
  )
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Clientes</h2>
          <p className="mt-1 text-sm text-gray-500">
            {clients.length} cliente{clients.length !== 1 ? "s" : ""} cadastrado{clients.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      {/* Lista de cards */}
      {clients.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-sm">Nenhum cliente cadastrado ainda.</p>
          <Button onClick={openCreate} variant="outline" size="sm" className="mt-4">
            <Plus className="h-4 w-4" />
            Adicionar primeiro cliente
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {clients.map((client) => (
            <li key={client.id}>
              <div className="relative group flex items-center gap-4 rounded-xl border border-gray-200/60 bg-white px-4 py-3.5 hover:border-gray-300 hover:bg-gray-50/60 transition-all">
                {/* Card clicável — leva para Sobre o Projeto */}
                <Link
                  href={`/clients/${client.id}/sobre-o-projeto`}
                  className="absolute inset-0 rounded-xl"
                  aria-label={`Abrir ${client.name}`}
                />

                <ClientAvatar client={client} />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{client.name}</p>
                  {client.niche && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">{client.niche}</p>
                  )}
                </div>

                {/* Ícone de informações — abre edição */}
                <button
                  type="button"
                  onClick={(e) => openEdit(client, e)}
                  className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                  title="Editar informações do cliente"
                >
                  <Info className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
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
