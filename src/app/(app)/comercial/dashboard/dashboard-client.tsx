"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Pencil, Check, X, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"

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

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function startOfWeek(d: Date): Date {
  const dow = (d.getDay() + 6) % 7
  return addDays(d, -dow)
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

function todayDate(): Date {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function monthStartStr(): string { return toDateStr(startOfMonth(todayDate())) }
function monthEndStr(): string { return toDateStr(endOfMonth(todayDate())) }

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function formatDisplayDate(s: string): string {
  const [y, m, d] = s.split("-")
  return `${d}/${m}/${y}`
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
  "LEAD", "MQL", "MEETING_SCHEDULED", "MEETING_DONE", "PROPOSAL", "CLOSED", "LOST",
] as const

const MONTH_NAMES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]

// ─── Date Range Picker ────────────────────────────────────────────────────────

function getShortcuts(today: Date) {
  const t = toDateStr(today)
  const yd = toDateStr(addDays(today, -1))
  const lastWeekStart = toDateStr(addDays(startOfWeek(today), -7))
  const lastWeekEnd = toDateStr(addDays(startOfWeek(today), -1))
  const lastMonthStart = toDateStr(new Date(today.getFullYear(), today.getMonth() - 1, 1))
  const lastMonthEnd = toDateStr(endOfMonth(new Date(today.getFullYear(), today.getMonth() - 1, 1)))
  return [
    { label: "Hoje", from: t, to: t },
    { label: "Ontem", from: yd, to: yd },
    { label: "Últimos 7 dias", from: toDateStr(addDays(today, -6)), to: t },
    { label: "Últimos 14 dias", from: toDateStr(addDays(today, -13)), to: t },
    { label: "Últimos 28 dias", from: toDateStr(addDays(today, -27)), to: t },
    { label: "Últimos 30 dias", from: toDateStr(addDays(today, -29)), to: t },
    { label: "Esta semana", from: toDateStr(startOfWeek(today)), to: t },
    { label: "Semana passada", from: lastWeekStart, to: lastWeekEnd },
    { label: "Este mês", from: toDateStr(startOfMonth(today)), to: t },
    { label: "Mês passado", from: lastMonthStart, to: lastMonthEnd },
  ]
}

function MonthGrid({
  year,
  month,
  pendingFrom,
  pendingTo,
  hoverDate,
  selectingSecond,
  maxDate,
  onDayClick,
  onDayHover,
}: {
  year: number
  month: number
  pendingFrom: string | null
  pendingTo: string | null
  hoverDate: string | null
  selectingSecond: boolean
  maxDate: string
  onDayClick: (d: string) => void
  onDayHover: (d: string) => void
}) {
  const firstDow = (new Date(year, month - 1, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month, 0).getDate()

  const effectiveTo = selectingSecond ? hoverDate : pendingTo
  const [rangeStart, rangeEnd] =
    pendingFrom && effectiveTo
      ? pendingFrom <= effectiveTo
        ? [pendingFrom, effectiveTo]
        : [effectiveTo, pendingFrom]
      : [null, null]

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div className="w-60">
      <p className="mb-2 text-center text-sm font-semibold text-white">
        {MONTH_NAMES_PT[month - 1]} {year}
      </p>
      <div className="grid grid-cols-7">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="py-1 text-center text-xs text-gray-500">{w}</div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`pad-${i}`} />
          const ds = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
          const disabled = ds > maxDate
          const isStart = ds === pendingFrom
          const isEnd = ds === pendingTo || (selectingSecond && ds === hoverDate)
          const inRange = !!rangeStart && !!rangeEnd && ds >= rangeStart && ds <= rangeEnd
          const isMid = inRange && !isStart && !isEnd

          return (
            <div
              key={ds}
              className={[
                "relative flex h-8 items-center justify-center",
                isMid ? "bg-blue-500/15" : "",
                isStart && rangeEnd && ds !== rangeEnd ? "bg-gradient-to-r from-transparent to-blue-500/15" : "",
                isEnd && rangeStart && ds !== rangeStart ? "bg-gradient-to-l from-transparent to-blue-500/15" : "",
              ].join(" ")}
            >
              <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && onDayClick(ds)}
                onMouseEnter={() => !disabled && onDayHover(ds)}
                className={[
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs transition-colors",
                  disabled ? "cursor-not-allowed text-gray-600" : "",
                  (isStart || isEnd) ? "bg-blue-600 font-semibold text-white" : "",
                  !disabled && !isStart && !isEnd ? "text-gray-300 hover:bg-gray-700 hover:text-white" : "",
                ].join(" ")}
              >
                {day}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DateRangePicker({
  dateFrom,
  dateTo,
  onApply,
}: {
  dateFrom: string
  dateTo: string
  onApply: (from: string, to: string) => void
}) {
  const today = todayDate()
  const todayStr = toDateStr(today)
  const shortcuts = getShortcuts(today)

  const [open, setOpen] = useState(false)
  const [pendingFrom, setPendingFrom] = useState<string | null>(dateFrom)
  const [pendingTo, setPendingTo] = useState<string | null>(dateTo)
  const [selectingSecond, setSelectingSecond] = useState(false)
  const [hoverDate, setHoverDate] = useState<string | null>(null)

  // Left calendar shows the month of dateFrom (or prev month if same as current)
  const initViewDate = () => {
    const d = dateFrom ? new Date(dateFrom + "T00:00:00") : today
    return { year: d.getFullYear(), month: d.getMonth() + 1 }
  }
  const [viewLeft, setViewLeft] = useState(initViewDate)

  const rightYear = viewLeft.month === 12 ? viewLeft.year + 1 : viewLeft.year
  const rightMonth = viewLeft.month === 12 ? 1 : viewLeft.month + 1

  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [open])

  function openPicker() {
    setPendingFrom(dateFrom)
    setPendingTo(dateTo)
    setSelectingSecond(false)
    setHoverDate(null)
    setViewLeft(initViewDate())
    setOpen(true)
  }

  function applyShortcut(from: string, to: string) {
    onApply(from, to)
    setOpen(false)
  }

  function handleDayClick(ds: string) {
    if (!selectingSecond) {
      setPendingFrom(ds)
      setPendingTo(null)
      setSelectingSecond(true)
    } else {
      const [f, t] = ds < pendingFrom! ? [ds, pendingFrom!] : [pendingFrom!, ds]
      setPendingFrom(f)
      setPendingTo(t)
      setSelectingSecond(false)
    }
  }

  function handleApply() {
    if (pendingFrom && pendingTo) {
      onApply(pendingFrom, pendingTo)
      setOpen(false)
    }
  }

  function prevMonth() {
    setViewLeft((v) =>
      v.month === 1 ? { year: v.year - 1, month: 12 } : { year: v.year, month: v.month - 1 }
    )
  }

  function nextMonth() {
    setViewLeft((v) =>
      v.month === 12 ? { year: v.year + 1, month: 1 } : { year: v.year, month: v.month + 1 }
    )
  }

  const activeShortcut = shortcuts.find((s) => s.from === dateFrom && s.to === dateTo)
  const triggerLabel = activeShortcut
    ? activeShortcut.label
    : `${formatDisplayDate(dateFrom)} — ${formatDisplayDate(dateTo)}`

  const canApply = !!(pendingFrom && pendingTo)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={openPicker}
        className="flex items-center gap-2 rounded-lg border border-gray-700/50 bg-gray-800/50 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700/50 transition-colors"
      >
        <CalendarDays className="h-4 w-4 text-gray-400" />
        {triggerLabel}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 flex overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-2xl">
          {/* Shortcuts */}
          <div className="w-44 border-r border-gray-700 py-2">
            {shortcuts.map((s) => {
              const active = s.from === dateFrom && s.to === dateTo
              return (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => applyShortcut(s.from, s.to)}
                  className={[
                    "w-full px-4 py-2 text-left text-sm transition-colors",
                    active
                      ? "bg-blue-600/20 text-blue-400 font-medium"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white",
                  ].join(" ")}
                >
                  {s.label}
                </button>
              )
            })}
          </div>

          {/* Calendar */}
          <div className="flex flex-col p-4">
            {/* Month navigation */}
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={prevMonth}
                className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex gap-16">
                <span className="w-60 text-center text-sm text-gray-400">
                  {MONTH_NAMES_PT[viewLeft.month - 1]} {viewLeft.year}
                </span>
                <span className="w-60 text-center text-sm text-gray-400">
                  {MONTH_NAMES_PT[rightMonth - 1]} {rightYear}
                </span>
              </div>
              <button
                type="button"
                onClick={nextMonth}
                className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-6" onMouseLeave={() => setHoverDate(null)}>
              <MonthGrid
                year={viewLeft.year}
                month={viewLeft.month}
                pendingFrom={pendingFrom}
                pendingTo={pendingTo}
                hoverDate={hoverDate}
                selectingSecond={selectingSecond}
                maxDate={todayStr}
                onDayClick={handleDayClick}
                onDayHover={setHoverDate}
              />
              <MonthGrid
                year={rightYear}
                month={rightMonth}
                pendingFrom={pendingFrom}
                pendingTo={pendingTo}
                hoverDate={hoverDate}
                selectingSecond={selectingSecond}
                maxDate={todayStr}
                onDayClick={handleDayClick}
                onDayHover={setHoverDate}
              />
            </div>

            {/* Selected range display + apply */}
            <div className="mt-4 flex items-center justify-between border-t border-gray-700 pt-4">
              <span className="text-sm text-gray-400">
                {pendingFrom && pendingTo
                  ? `${formatDisplayDate(pendingFrom)} — ${formatDisplayDate(pendingTo)}`
                  : pendingFrom
                  ? `${formatDisplayDate(pendingFrom)} — selecione o fim`
                  : "Selecione o início"}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={!canApply}
                  className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Metric cards ─────────────────────────────────────────────────────────────

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

  useEffect(() => { setEditing(false) }, [periodKey])

  async function save() {
    const parsed = parseFloat(input.replace(",", "."))
    if (isNaN(parsed) || parsed < 0) { setEditing(false); return }
    setSaving(true)
    await onSave(parsed)
    setSaving(false)
    setEditing(false)
  }

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
          <button
            onClick={() => { setInput(String(value)); setEditing(true) }}
            className="rounded p-1 text-gray-600 opacity-0 transition-opacity group-hover:opacity-100 hover:text-gray-300"
          >
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
    fetchMetrics(dateFrom, dateTo)
  }, [dateFrom, dateTo, fetchMetrics])

  function handleApply(from: string, to: string) {
    setDateFrom(from)
    setDateTo(to)
  }

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
      <div className="flex items-center justify-end">
        <DateRangePicker dateFrom={dateFrom} dateTo={dateTo} onApply={handleApply} />
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
              <MetricCard label="Novos Clientes" value={acq?.newClients ?? 0} sub="Leads fechados no período" />
              <MetricCard label="Novo MRR" value={formatBRL(acq?.newMrr ?? 0)} sub="Soma dos valores estimados" />
              <InvestmentCard periodKey={metrics.period.key} value={acq?.trafficInvestment ?? 0} onSave={saveInvestment} />
              <MetricCard label="CAC" value={acq?.cac != null ? formatBRL(acq.cac) : "—"} sub="Investimento ÷ Novos Clientes" />
            </div>
          </section>

          {/* Seção 2: Pipeline */}
          <section>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Pipeline
            </h3>
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
                  <FunnelBar key={stage} label={STAGE_LABELS[stage]} count={funnel[stage] ?? 0} maxCount={maxCount} />
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
