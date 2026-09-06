"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate, formatMonth } from "@/lib/utils"
import { ReceivableForm } from "@/components/financial/receivable-form"

interface Receivable {
  id: string
  clientId: string
  value: string
  referenceMonth: string
  dueDate: string
  status: "PAID" | "PENDING"
  client?: { name: string }
}

interface ClientOption {
  id: string
  name: string
}

function addMonths(date: Date, n: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + n)
  return d
}

export default function ContractsPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [receivables, setReceivables] = useState<Receivable[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [loading, setLoading] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingReceivable, setEditingReceivable] = useState<Receivable | undefined>()

  const monthParam = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, "0")}`

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [recRes, cliRes] = await Promise.all([
        fetch(`/api/receivables?month=${monthParam}`),
        fetch("/api/clients?status=ACTIVE&limit=200"),
      ])
      if (recRes.ok) setReceivables(await recRes.json())
      if (cliRes.ok) {
        const data = await cliRes.json()
        setClients(Array.isArray(data) ? data : data.clients ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [monthParam])

  useEffect(() => { fetchData() }, [fetchData])

  async function deleteReceivable(id: string) {
    if (!confirm("Excluir este recebível?")) return
    await fetch(`/api/receivables/${id}`, { method: "DELETE" })
    fetchData()
  }

  async function markAsPaid(id: string) {
    await fetch(`/api/receivables/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAID" }),
    })
    fetchData()
  }

  const totalPaid = receivables.filter((r) => r.status === "PAID").reduce((s, r) => s + parseFloat(r.value), 0)
  const totalPending = receivables.filter((r) => r.status === "PENDING").reduce((s, r) => s + parseFloat(r.value), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Controle de Contratos</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedMonth((d) => addMonths(d, -1))}
              className="rounded-lg border border-gray-200 bg-gray-100 p-1.5 text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[130px] text-center text-sm font-medium capitalize text-gray-900">
              {formatMonth(selectedMonth)}
            </span>
            <button
              onClick={() => setSelectedMonth((d) => addMonths(d, 1))}
              className="rounded-lg border border-gray-200 bg-gray-100 p-1.5 text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setEditingReceivable(undefined)
              setFormOpen(true)
            }}
          >
            <Plus className="h-4 w-4" />
            Novo Recebível
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Cliente</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Valor</th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Mês Ref.</th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Vencimento</th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Carregando...</td>
                </tr>
              ) : receivables.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Nenhum recebível encontrado para este mês.
                  </td>
                </tr>
              ) : (
                receivables.map((rec) => (
                  <tr key={rec.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-800">{rec.client?.name ?? "—"}</td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      {formatCurrency(parseFloat(rec.value))}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-500 capitalize">
                      {formatMonth(rec.referenceMonth)}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-500">{formatDate(rec.dueDate)}</td>
                    <td className="px-6 py-4 text-center">
                      {rec.status === "PAID" ? (
                        <Badge variant="success">Pago</Badge>
                      ) : (
                        <Badge variant="warning">Pendente</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {rec.status === "PENDING" && (
                          <button
                            onClick={() => markAsPaid(rec.id)}
                            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Pago
                          </button>
                        )}
                        <button
                          onClick={() => { setEditingReceivable(rec); setFormOpen(true) }}
                          className="rounded p-1 text-gray-500 hover:text-gray-900 transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteReceivable(rec.id)}
                          className="rounded p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {receivables.length > 0 && (
              <tfoot>
                <tr className="border-t border-gray-200 bg-gray-50">
                  <td className="px-6 py-3 text-sm font-semibold text-gray-600">Total</td>
                  <td colSpan={5} />
                </tr>
                <tr className="bg-white">
                  <td className="px-6 py-2 text-xs text-gray-500">Pago</td>
                  <td className="px-6 py-2 text-right text-sm font-bold text-emerald-600">
                    {formatCurrency(totalPaid)}
                  </td>
                  <td colSpan={4} />
                </tr>
                <tr className="bg-white">
                  <td className="px-6 py-2 text-xs text-gray-500">Pendente</td>
                  <td className="px-6 py-2 text-right text-sm font-bold text-yellow-600">
                    {formatCurrency(totalPending)}
                  </td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <ReceivableForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={() => { setFormOpen(false); fetchData() }}
        receivable={editingReceivable}
        clients={clients}
      />
    </div>
  )
}
