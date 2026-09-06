"use client"

import { useState, useEffect, useCallback } from "react"
import { RefreshCw, AlertTriangle, Wallet, Users, FileText, Repeat, CheckCircle, Clock, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"

interface AsaasBalance {
  balance: number
  availableBalance: number
}

interface AsaasCustomer {
  id: string
  name: string
  email?: string
  cpfCnpj?: string
}

interface AsaasPayment {
  id: string
  customer: string
  value: number
  netValue?: number
  billingType: string
  status: string
  dueDate: string
  paymentDate?: string | null
  description?: string | null
}

interface AsaasSubscription {
  id: string
  customer: string
  value: number
  billingType: string
  status: string
  cycle: string
  nextDueDate?: string | null
  description?: string | null
}

interface AsaasData {
  balance: AsaasBalance
  customers: { total: number; data: AsaasCustomer[] }
  payments: { total: number; data: AsaasPayment[] }
  subscriptions: { total: number; data: AsaasSubscription[] }
  fetchedAt: string
}

const PAYMENT_STATUS_MAP: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "outline" }> = {
  RECEIVED: { label: "Recebida", variant: "success" },
  CONFIRMED: { label: "Confirmada", variant: "success" },
  PENDING: { label: "Pendente", variant: "warning" },
  OVERDUE: { label: "Vencida", variant: "destructive" },
  REFUNDED: { label: "Devolvida", variant: "outline" },
  REFUND_REQUESTED: { label: "Dev. solicitada", variant: "outline" },
  CHARGEBACK_REQUESTED: { label: "Chargeback", variant: "destructive" },
  CHARGEBACK_DISPUTE: { label: "Disputa", variant: "destructive" },
  AWAITING_CHARGEBACK_REVERSAL: { label: "Aguard. reversão", variant: "outline" },
  DUNNING_REQUESTED: { label: "Negativação", variant: "outline" },
  DUNNING_RECEIVED: { label: "Neg. recebida", variant: "outline" },
  AWAITING_RISK_ANALYSIS: { label: "Análise de risco", variant: "warning" },
}

const BILLING_TYPE_MAP: Record<string, string> = {
  BOLETO: "Boleto",
  CREDIT_CARD: "Cartão",
  PIX: "Pix",
  DEBIT_CARD: "Déb. cartão",
  TRANSFER: "Transferência",
  DEPOSIT: "Depósito",
  UNDEFINED: "—",
}

const CYCLE_MAP: Record<string, string> = {
  WEEKLY: "Semanal",
  BIWEEKLY: "Quinzenal",
  MONTHLY: "Mensal",
  QUARTERLY: "Trimestral",
  SEMIANNUALLY: "Semestral",
  YEARLY: "Anual",
}

function formatDateBR(dateStr?: string | null) {
  if (!dateStr) return "—"
  const [y, m, d] = dateStr.split("-")
  return `${d}/${m}/${y}`
}

export default function AsaasPage() {
  const [data, setData] = useState<AsaasData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/asaas")
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Erro ${res.status}`)
      }
      const json = await res.json()
      setData(json)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao conectar com o Asaas")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const id = setInterval(fetchData, 60 * 60 * 1000)
    return () => clearInterval(id)
  }, [fetchData])

  const paidPayments = data?.payments.data.filter((p) =>
    p.status === "RECEIVED" || p.status === "CONFIRMED"
  ) ?? []
  const pendingPayments = data?.payments.data.filter((p) => p.status === "PENDING") ?? []
  const overduePayments = data?.payments.data.filter((p) => p.status === "OVERDUE") ?? []

  const paidTotal = paidPayments.reduce((s, p) => s + p.value, 0)
  const pendingTotal = pendingPayments.reduce((s, p) => s + p.value, 0)
  const overdueTotal = overduePayments.reduce((s, p) => s + p.value, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Controle de Dados (Asaas)</h2>
          {lastUpdated && (
            <p className="text-xs text-gray-500 mt-0.5">
              Última atualização: {lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-600" />
          <p className="text-sm text-yellow-800">
            Não foi possível atualizar os dados do Asaas: <span className="font-medium">{error}</span>
            {data && " — exibindo últimos dados válidos."}
          </p>
        </div>
      )}

      {loading && !data && (
        <div className="py-12 text-center text-gray-500 text-sm">Carregando dados do Asaas...</div>
      )}

      {data && (
        <>
          {/* Balance cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="inline-flex items-center justify-center h-9 w-9 rounded-lg mb-3 text-emerald-600 bg-emerald-50">
                <Wallet className="h-4.5 w-4.5" />
              </div>
              <p className="text-xs text-gray-500 mb-1">Saldo Disponível</p>
              <p className="text-2xl font-bold text-emerald-600">
                {formatCurrency(data.balance?.availableBalance ?? data.balance?.balance ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="inline-flex items-center justify-center h-9 w-9 rounded-lg mb-3 text-purple-600 bg-purple-50">
                <Wallet className="h-4.5 w-4.5" />
              </div>
              <p className="text-xs text-gray-500 mb-1">Saldo Total em Conta</p>
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(data.balance?.balance ?? 0)}
              </p>
            </div>
          </div>

          {/* Payment stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium text-gray-700">Pagas</span>
              </div>
              <p className="text-xl font-bold text-emerald-600">{formatCurrency(paidTotal)}</p>
              <p className="text-xs text-gray-500 mt-1">{paidPayments.length} cobrança{paidPayments.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium text-gray-700">Pendentes</span>
              </div>
              <p className="text-xl font-bold text-yellow-600">{formatCurrency(pendingTotal)}</p>
              <p className="text-xs text-gray-500 mt-1">{pendingPayments.length} cobrança{pendingPayments.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium text-gray-700">Vencidas</span>
              </div>
              <p className="text-xl font-bold text-red-600">{formatCurrency(overdueTotal)}</p>
              <p className="text-xs text-gray-500 mt-1">{overduePayments.length} cobrança{overduePayments.length !== 1 ? "s" : ""}</p>
            </div>
          </div>

          {/* Payments table */}
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-400" />
                <h3 className="text-base font-semibold text-gray-900">Cobranças</h3>
              </div>
              <span className="text-xs text-gray-500">{data.payments.total} no total</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Descrição</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Forma</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Valor</th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Vencimento</th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50">
                  {data.payments.data.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Nenhuma cobrança encontrada.</td>
                    </tr>
                  ) : (
                    data.payments.data.slice(0, 50).map((p) => {
                      const statusInfo = PAYMENT_STATUS_MAP[p.status] ?? { label: p.status, variant: "outline" as const }
                      return (
                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-3 text-gray-800">{p.description || "—"}</td>
                          <td className="px-6 py-3 text-gray-500">{BILLING_TYPE_MAP[p.billingType] ?? p.billingType}</td>
                          <td className="px-6 py-3 text-right font-medium text-gray-900">{formatCurrency(p.value)}</td>
                          <td className="px-6 py-3 text-center text-gray-500">{formatDateBR(p.dueDate)}</td>
                          <td className="px-6 py-3 text-center">
                            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Subscriptions */}
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4 text-gray-400" />
                <h3 className="text-base font-semibold text-gray-900">Assinaturas Ativas</h3>
              </div>
              <span className="text-xs text-gray-500">{data.subscriptions.total} ativas</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Descrição</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Ciclo</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Valor</th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Próx. Venc.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Forma</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50">
                  {data.subscriptions.data.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Nenhuma assinatura ativa.</td>
                    </tr>
                  ) : (
                    data.subscriptions.data.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3 text-gray-800">{s.description || "—"}</td>
                        <td className="px-6 py-3 text-gray-500">{CYCLE_MAP[s.cycle] ?? s.cycle}</td>
                        <td className="px-6 py-3 text-right font-medium text-gray-900">{formatCurrency(s.value)}</td>
                        <td className="px-6 py-3 text-center text-gray-500">{formatDateBR(s.nextDueDate)}</td>
                        <td className="px-6 py-3 text-gray-500">{BILLING_TYPE_MAP[s.billingType] ?? s.billingType}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Customers */}
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-400" />
                <h3 className="text-base font-semibold text-gray-900">Clientes</h3>
              </div>
              <span className="text-xs text-gray-500">{data.customers.total} cadastrados</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Nome</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">E-mail</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">CPF/CNPJ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50">
                  {data.customers.data.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-gray-500">Nenhum cliente encontrado.</td>
                    </tr>
                  ) : (
                    data.customers.data.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3 text-gray-800">{c.name}</td>
                        <td className="px-6 py-3 text-gray-500">{c.email || "—"}</td>
                        <td className="px-6 py-3 text-gray-500">{c.cpfCnpj || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
