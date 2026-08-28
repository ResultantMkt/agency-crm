"use client"

import { useState, useEffect, useCallback } from "react"
import { Pencil, Check, X } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Metrics {
  period: { dateFrom: string; dateTo: string; key: string }
  funnel: Record<string, number>
  acquisition: {
    newClients: number
    newMrr: number
    trafficInvestment: number
    cac: number | null
  }
  conversionRates: {
    leadToMql: number
    mqlToMeeting: number
    meetingToClose: number
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  LEAD: "Leads",
  MQL: "MQL",
  MEETING_SCHEDULED: "Ag. Reunião",
  MEETING_DONE: "Reunião Feita",
  PROPOSAL: "Propostas",
  CLOSED: "Fechados",
  LOST: "Perdidos",
}

const STAGE_ORDER = [
  "LEAD",
  "MQL",
  "MEETING_SCHEDULED",
  "MEETING_DONE",
  "PROPOSAL",
  "CLOSED",
  "LOST",
] as const

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function monthStartStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
}

function monthEndStr(): string {
  const d = new Date()
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border border-gray-700/50 bg-gray-800/50 p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  )
}

function InvestmentCard({
  periodKey,
  value,
  onSave,
}: {
  periodKey: string
  value: number
  onSave: (v: number) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState("")
  const [saving, setSaving] = useState(false)

  function startEdit() {
    setInput(String(value))
    setEditing(true)
  }

  async function save() {
    const parsed = parseFloat(input.replace(",", "."))
    if (isNaN(parsed) || parsed < 0) { setEditing(false); return }
    setSaving(true)
    await onSave(parsed)
    setSaving(false)
    setEditing(false)
  }

  // Reset edit state when period changes
  useEffect(() => { setEditing(false) }, [periodKey])

  return (
    <div className="rounded-lg border border-gray-700/50 bg-gray-800/50 p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        Investimento em Tráfego
      </p>
      {editing ? (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-gray-400">R$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false) }}
            className="w-32 rounded border border-gray-600 bg-gray-900 px-2 py-1 text-lg font-bold text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus
          />
          <button onClick={save} disabled={saving} className="rounded p-1 text-emerald-400 hover:bg-emerald-900/30">
            <Check className="h-4 w-4" />
          </button>
          <button onClick={() => setEditing(false)} className="rounded p-1 text-red-400 hover:bg-red-900/30">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="group mt-2 flex items-center gap-2">
          <p className="text-2xl font-bold text-white">{formatBRL(value)}</p>
          <button onClick={startEdit} className="rounded p-1 text-gray-600 opacity-0 transition-opacity group-hover:opacity-100 hover:text-gray-300">
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <p className="mt-1 text-xs text-gray-500">Clique no lápis para editar</p>
    </div>
  )
}

function StageCard({ label, count }: { label: string; count: number }) {
  return (
    <div className="rounded-lg border border-gray-700/50 bg-gray-800/50 p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-white">{count}</p>
    </div>
  )
}

function FunnelBar({ label, count, maxCount }: { label: string; count: number; maxCount: number }) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-300">{label}</span>
        <span className="text-sm text-gray-500">
          {count} <span className="text-gray-600">({pct.toFixed(0)}%)</span>
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-700">
        <div className="h-3 rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function ConversionCard({ from, to, rate }: { from: string; to: string; rate: number }) {
  const rateColor = rate >= 50 ? "text-emerald-400" : rate >= 25 ? "text-yellow-400" : "text-red-400"
  const barColor = rate >= 50 ? "bg-emerald-500" : rate >= 25 ? "bg-yellow-500" : "bg-red-500"
  return (
    <div className="rounded-lg border border-gray-700/30 bg-gray-900/50 p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-gray-300">{from} → {to}</p>
        <span className={`text-2xl font-bold ${rateColor}`}>{rate.toFixed(0)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-700">
        <div className={`h-2 rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(rate, 100)}%` }} />
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DashboardClient() {
  const [dateFrom, setDateFrom] = useState(monthStartStr)
  const [dateTo, setDateTo] = useState(monthEndStr)
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchMetrics = useCallback(async (from: string, to: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard/metrics?dateFrom=${from}&dateTo=${to}`)
      if (res.ok) setMetrics(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (dateFrom && dateTo && dateFrom <= dateTo) {
      fetchMetrics(dateFrom, dateTo)
    }
  }, [dateFrom, dateTo, fetchMetrics])

  async function saveInvestment(value: number) {
    if (!metrics) return
    await fetch("/api/dashboard/metrics", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ periodKey: metrics.period.key, value }),
    })
    await fetchMetrics(dateFrom, dateTo)
  }

  const funnel = metrics?.funnel ?? {}
  const acq = metrics?.acquisition
  const conv = metrics?.conversionRates

  const stageValues = STAGE_ORDER.map((s) => funnel[s] ?? 0)
  const maxCount = Math.max(...stageValues, 1)

  return (
    <div className="space-y-10">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-white">Comercial — Dashboard de Vendas</h2>

        {/* Seletor de intervalo de datas */}
        <div className="flex items-center gap-2 rounded-lg border border-gray-700/50 bg-gray-800/50 px-3 py-2">
          <label className="text-xs text-gray-500">De</label>
          <input
            type="date"
            value={dateFrom}
            max={dateTo || todayStr()}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded border-0 bg-transparent text-sm font-medium text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span className="text-gray-600">—</span>
          <label className="text-xs text-gray-500">Até</label>
          <input
            type="date"
            value={dateTo}
            min={dateFrom}
            max={todayStr()}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded border-0 bg-transparent text-sm font-medium text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {loading && <p className="text-sm text-gray-500">Carregando...</p>}

      {!loading && metrics && (
        <>
          {/* Seção 1: Aquisição */}
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Aquisição
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <MetricCard
                label="Novos Clientes"
                value={acq?.newClients ?? 0}
                sub="Leads fechados no período"
              />
              <MetricCard
                label="Novo MRR"
                value={formatBRL(acq?.newMrr ?? 0)}
                sub="Soma dos valores estimados"
              />
              <InvestmentCard
                periodKey={metrics.period.key}
                value={acq?.trafficInvestment ?? 0}
                onSave={saveInvestment}
              />
              <MetricCard
                label="CAC"
                value={acq?.cac != null ? formatBRL(acq.cac) : "—"}
                sub="Investimento ÷ Novos Clientes"
              />
            </div>
          </section>

          {/* Seção 2: Pipeline */}
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Pipeline
            </h3>
            <p className="mb-3 text-xs text-gray-600">
              Leads criados no período, agrupados pelo estágio atual
            </p>
            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-7">
              {STAGE_ORDER.map((stage) => (
                <StageCard key={stage} label={STAGE_LABELS[stage]} count={funnel[stage] ?? 0} />
              ))}
            </div>

            <div className="rounded-lg border border-gray-700/50 bg-gray-800/50 p-6">
              <h4 className="mb-1 text-base font-semibold text-white">Progressão do Funil</h4>
              <p className="mb-5 text-xs text-gray-500">
                Barras relativas ao estágio com maior volume no período
              </p>
              <div className="space-y-4">
                {STAGE_ORDER.map((stage) => (
                  <FunnelBar
                    key={stage}
                    label={STAGE_LABELS[stage]}
                    count={funnel[stage] ?? 0}
                    maxCount={maxCount}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* Seção 3: Taxas de Conversão */}
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Taxas de Conversão
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <ConversionCard from="Lead" to="MQL" rate={conv?.leadToMql ?? 0} />
              <ConversionCard from="MQL" to="Reunião" rate={conv?.mqlToMeeting ?? 0} />
              <ConversionCard from="Reunião" to="Fechado" rate={conv?.meetingToClose ?? 0} />
            </div>
          </section>
        </>
      )}
    </div>
  )
}
