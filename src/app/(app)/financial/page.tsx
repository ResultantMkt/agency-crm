"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Wallet, BarChart3 } from "lucide-react"
import { formatCurrency, formatMonth } from "@/lib/utils"

function addMonths(date: Date, n: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + n)
  return d
}

export default function FinancialOverviewPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [expenses, setExpenses] = useState<{ value: string; category: string }[]>([])
  const [receivables, setReceivables] = useState<{ value: string; status: string }[]>([])
  const [loading, setLoading] = useState(false)

  const monthParam = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, "0")}`

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [expRes, recRes] = await Promise.all([
        fetch(`/api/expenses?month=${monthParam}`),
        fetch(`/api/receivables?month=${monthParam}`),
      ])
      if (expRes.ok) setExpenses(await expRes.json())
      if (recRes.ok) setReceivables(await recRes.json())
    } finally {
      setLoading(false)
    }
  }, [monthParam])

  useEffect(() => { fetchData() }, [fetchData])

  const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.value), 0)
  const totalPaid = receivables.filter((r) => r.status === "PAID").reduce((s, r) => s + parseFloat(r.value), 0)
  const totalPending = receivables.filter((r) => r.status === "PENDING").reduce((s, r) => s + parseFloat(r.value), 0)
  const net = totalPaid - totalExpenses

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Visão Geral</h2>
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
      </div>

      <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 transition-opacity ${loading ? "opacity-60" : ""}`}>
        <SummaryCard
          label="Faturado (Pago)"
          value={totalPaid}
          icon={TrendingUp}
          iconClass="text-emerald-600 bg-emerald-50"
          valueClass="text-emerald-600"
        />
        <SummaryCard
          label="A Receber (Pendente)"
          value={totalPending}
          icon={Wallet}
          iconClass="text-yellow-600 bg-yellow-50"
          valueClass="text-yellow-600"
        />
        <SummaryCard
          label="Despesas do Mês"
          value={totalExpenses}
          icon={TrendingDown}
          iconClass="text-red-500 bg-red-50"
          valueClass="text-red-600"
        />
        <SummaryCard
          label="Resultado (Pago − Desp.)"
          value={net}
          icon={BarChart3}
          iconClass={net >= 0 ? "text-emerald-600 bg-emerald-50" : "text-red-500 bg-red-50"}
          valueClass={net >= 0 ? "text-emerald-600" : "text-red-600"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Despesas por Categoria</h3>
          {expenses.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhuma despesa neste mês.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(
                expenses.reduce<Record<string, number>>((acc, e) => {
                  acc[e.category] = (acc[e.category] ?? 0) + parseFloat(e.value)
                  return acc
                }, {})
              )
                .sort(([, a], [, b]) => b - a)
                .map(([cat, val]) => (
                  <div key={cat} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{cat}</span>
                    <span className="font-medium text-gray-900">{formatCurrency(val)}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Recebíveis do Mês</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Pago</span>
              <span className="text-sm font-semibold text-emerald-600">{formatCurrency(totalPaid)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Pendente</span>
              <span className="text-sm font-semibold text-yellow-600">{formatCurrency(totalPending)}</span>
            </div>
            <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900">Total</span>
              <span className="text-sm font-bold text-gray-900">{formatCurrency(totalPaid + totalPending)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  iconClass,
  valueClass,
}: {
  label: string
  value: number
  icon: React.ElementType
  iconClass: string
  valueClass: string
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className={`inline-flex items-center justify-center h-9 w-9 rounded-lg mb-3 ${iconClass}`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${valueClass}`}>{formatCurrency(value)}</p>
    </div>
  )
}
