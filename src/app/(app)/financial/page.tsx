"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate, formatMonth } from "@/lib/utils"
import { ExpenseForm } from "@/components/financial/expense-form"
import { ReceivableForm } from "@/components/financial/receivable-form"

interface Expense {
  id: string
  description: string
  category: string
  value: string
  dueDay: number
  isRecurring: boolean
  month: string | null
}

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

type Tab = "expenses" | "receivables"

function addMonths(date: Date, n: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + n)
  return d
}

export default function FinancialPage() {
  const [tab, setTab] = useState<Tab>("expenses")
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date())
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [receivables, setReceivables] = useState<Receivable[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [loading, setLoading] = useState(false)

  const [expenseFormOpen, setExpenseFormOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>()
  const [receivableFormOpen, setReceivableFormOpen] = useState(false)
  const [editingReceivable, setEditingReceivable] = useState<Receivable | undefined>()

  const monthParam = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, "0")}`

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [expRes, recRes, cliRes] = await Promise.all([
        fetch(`/api/expenses?month=${monthParam}`),
        fetch(`/api/receivables?month=${monthParam}`),
        fetch("/api/clients?status=ACTIVE&limit=200"),
      ])
      if (expRes.ok) setExpenses(await expRes.json())
      if (recRes.ok) setReceivables(await recRes.json())
      if (cliRes.ok) {
        const data = await cliRes.json()
        setClients(Array.isArray(data) ? data : data.clients ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [monthParam])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function deleteExpense(id: string) {
    if (!confirm("Excluir esta despesa?")) return
    await fetch(`/api/expenses/${id}`, { method: "DELETE" })
    fetchData()
  }

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

  const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.value), 0)
  const totalPaid = receivables
    .filter((r) => r.status === "PAID")
    .reduce((s, r) => s + parseFloat(r.value), 0)
  const totalPending = receivables
    .filter((r) => r.status === "PENDING")
    .reduce((s, r) => s + parseFloat(r.value), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Financeiro</h2>
          <p className="mt-1 text-sm text-gray-400">Controle de despesas e recebíveis</p>
        </div>

        {/* Seletor de mês */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedMonth((d) => addMonths(d, -1))}
            className="rounded-lg border border-gray-700 bg-gray-800 p-1.5 text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[130px] text-center text-sm font-medium capitalize text-white">
            {formatMonth(selectedMonth)}
          </span>
          <button
            onClick={() => setSelectedMonth((d) => addMonths(d, 1))}
            className="rounded-lg border border-gray-700 bg-gray-800 p-1.5 text-gray-400 hover:text-white transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-gray-700/50 bg-gray-800/50 p-1 w-fit">
        {(["expenses", "receivables"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t
                ? "bg-gray-700 text-white shadow-sm"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {t === "expenses" ? "Despesas" : "Recebíveis"}
          </button>
        ))}
      </div>

      {/* Conteúdo da tab */}
      {tab === "expenses" && (
        <div className="rounded-lg border border-gray-700/50 bg-gray-800/50">
          <div className="flex items-center justify-between border-b border-gray-700/50 px-6 py-4">
            <h3 className="text-base font-semibold text-white">Despesas</h3>
            <Button
              size="sm"
              onClick={() => {
                setEditingExpense(undefined)
                setExpenseFormOpen(true)
              }}
            >
              <Plus className="h-4 w-4" />
              Nova Despesa
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700/50">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Categoria
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                    Dia Venc.
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                    Recorrente
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Carregando...
                    </td>
                  </tr>
                ) : expenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Nenhuma despesa encontrada para este mês.
                    </td>
                  </tr>
                ) : (
                  expenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-700/20 transition-colors">
                      <td className="px-6 py-4 text-gray-200">{expense.description}</td>
                      <td className="px-6 py-4">
                        <Badge variant="outline">{expense.category}</Badge>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-white">
                        {formatCurrency(parseFloat(expense.value))}
                      </td>
                      <td className="px-6 py-4 text-center text-gray-400">
                        Dia {expense.dueDay}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {expense.isRecurring ? (
                          <Badge variant="default">Sim</Badge>
                        ) : (
                          <Badge variant="outline">Não</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingExpense(expense)
                              setExpenseFormOpen(true)
                            }}
                            className="rounded p-1 text-gray-400 hover:text-white transition-colors"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteExpense(expense.id)}
                            className="rounded p-1 text-gray-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {expenses.length > 0 && (
                <tfoot>
                  <tr className="border-t border-gray-700/50 bg-gray-900/30">
                    <td colSpan={2} className="px-6 py-3 text-sm font-semibold text-gray-300">
                      Total
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-bold text-white">
                      {formatCurrency(totalExpenses)}
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {tab === "receivables" && (
        <div className="rounded-lg border border-gray-700/50 bg-gray-800/50">
          <div className="flex items-center justify-between border-b border-gray-700/50 px-6 py-4">
            <h3 className="text-base font-semibold text-white">Recebíveis</h3>
            <Button
              size="sm"
              onClick={() => {
                setEditingReceivable(undefined)
                setReceivableFormOpen(true)
              }}
            >
              <Plus className="h-4 w-4" />
              Novo Recebível
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700/50">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                    Mês Ref.
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                    Vencimento
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/30">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Carregando...
                    </td>
                  </tr>
                ) : receivables.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Nenhum recebível encontrado para este mês.
                    </td>
                  </tr>
                ) : (
                  receivables.map((rec) => (
                    <tr key={rec.id} className="hover:bg-gray-700/20 transition-colors">
                      <td className="px-6 py-4 text-gray-200">
                        {rec.client?.name ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-white">
                        {formatCurrency(parseFloat(rec.value))}
                      </td>
                      <td className="px-6 py-4 text-center text-gray-400 capitalize">
                        {formatMonth(rec.referenceMonth)}
                      </td>
                      <td className="px-6 py-4 text-center text-gray-400">
                        {formatDate(rec.dueDate)}
                      </td>
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
                              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/20 transition-colors"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              Pago
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingReceivable(rec)
                              setReceivableFormOpen(true)
                            }}
                            className="rounded p-1 text-gray-400 hover:text-white transition-colors"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteReceivable(rec.id)}
                            className="rounded p-1 text-gray-400 hover:text-red-400 transition-colors"
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
                  <tr className="border-t border-gray-700/50 bg-gray-900/30">
                    <td className="px-6 py-3 text-sm font-semibold text-gray-300">Total</td>
                    <td colSpan={5} />
                  </tr>
                  <tr className="bg-gray-900/20">
                    <td className="px-6 py-2 text-xs text-gray-500">Pago</td>
                    <td className="px-6 py-2 text-right text-sm font-bold text-emerald-400">
                      {formatCurrency(totalPaid)}
                    </td>
                    <td colSpan={4} />
                  </tr>
                  <tr className="bg-gray-900/20">
                    <td className="px-6 py-2 text-xs text-gray-500">Pendente</td>
                    <td className="px-6 py-2 text-right text-sm font-bold text-yellow-400">
                      {formatCurrency(totalPending)}
                    </td>
                    <td colSpan={4} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Modais */}
      <ExpenseForm
        open={expenseFormOpen}
        onClose={() => setExpenseFormOpen(false)}
        onSuccess={() => {
          setExpenseFormOpen(false)
          fetchData()
        }}
        expense={editingExpense}
      />

      <ReceivableForm
        open={receivableFormOpen}
        onClose={() => setReceivableFormOpen(false)}
        onSuccess={() => {
          setReceivableFormOpen(false)
          fetchData()
        }}
        receivable={editingReceivable}
        clients={clients}
      />
    </div>
  )
}
