"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatMonth } from "@/lib/utils"
import { ExpenseForm } from "@/components/financial/expense-form"

interface Expense {
  id: string
  description: string
  category: string
  value: string
  dueDay: number
  isRecurring: boolean
  month: string | null
}

function addMonths(date: Date, n: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + n)
  return d
}

export default function ExpensesPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>()

  const monthParam = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, "0")}`

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/expenses?month=${monthParam}`)
      if (res.ok) setExpenses(await res.json())
    } finally {
      setLoading(false)
    }
  }, [monthParam])

  useEffect(() => { fetchData() }, [fetchData])

  async function deleteExpense(id: string) {
    if (!confirm("Excluir esta despesa?")) return
    await fetch(`/api/expenses/${id}`, { method: "DELETE" })
    fetchData()
  }

  const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.value), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Despesas Mensais</h2>
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
              setEditingExpense(undefined)
              setFormOpen(true)
            }}
          >
            <Plus className="h-4 w-4" />
            Nova Despesa
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Descrição</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Categoria</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Valor</th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Dia Venc.</th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Recorrente</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Carregando...</td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Nenhuma despesa encontrada para este mês.
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-800">{expense.description}</td>
                    <td className="px-6 py-4">
                      <Badge variant="outline">{expense.category}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      {formatCurrency(parseFloat(expense.value))}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-500">Dia {expense.dueDay}</td>
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
                          onClick={() => { setEditingExpense(expense); setFormOpen(true) }}
                          className="rounded p-1 text-gray-500 hover:text-gray-900 transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteExpense(expense.id)}
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
            {expenses.length > 0 && (
              <tfoot>
                <tr className="border-t border-gray-200 bg-gray-50">
                  <td colSpan={2} className="px-6 py-3 text-sm font-semibold text-gray-600">Total</td>
                  <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">
                    {formatCurrency(totalExpenses)}
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <ExpenseForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={() => { setFormOpen(false); fetchData() }}
        expense={editingExpense}
      />
    </div>
  )
}
