"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Pencil, Check, X, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChannelMetrics {
  source: string
  label: string
  investment: number
  leads: number
  mql: number
  screeningScheduled: number
  screeningDone: number
  closingMeeting: number
  closings: number
  closingValue: number
  costPerLead: number | null
  costPerMql: number | null
  costPerScreeningScheduled: number | null
  costPerScreeningDone: number | null
  costPerClosingMeeting: number | null
  cac: number | null
  ltv: number
  roas: number | null
  rateLeadToMql: number
  rateMqlToScreening: number
  rateClosingMeetingToClosing: number
  rateLeadToClosing: number
}

interface Metrics {
  period: { dateFrom: string; dateTo: string; key: string }
  channels: ChannelMetrics[]
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

function fmtRate(value: number): string {
  return `${value.toFixed(1)}%`
}

function fmtRoas(value: number | null): string {
  if (value === null) return "—"
  return `${value.toFixed(2)}x`
}

function fmtCost(value: number | null): string {
  if (value === null) return "—"
  return formatBRL(value)
}

// ─── Constants ────────────────────────────────────────────────────────────────

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
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
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

          <div className="flex flex-col p-4">
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

// ─── Metric cell ──────────────────────────────────────────────────────────────

function Cell({ label, value, highlight }: { label: string; value: string; highlight?: "green" | "yellow" | "red" }) {
  const valueColor =
    highlight === "green" ? "text-emerald-400" :
    highlight === "yellow" ? "text-yellow-400" :
    highlight === "red" ? "text-red-400" :
    "text-white"
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500 leading-none">{label}</span>
      <span className={`text-sm font-semibold ${valueColor}`}>{value}</span>
    </div>
  )
}

// ─── Investment inline edit ───────────────────────────────────────────────────

function InvestmentInline({
  source,
  periodKey,
  value,
  onSave,
}: {
  source: string
  periodKey: string
  value: number
  onSave: (source: string, value: number) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => { setEditing(false) }, [periodKey])

  async function save() {
    const parsed = parseFloat(input.replace(",", "."))
    if (isNaN(parsed) || parsed < 0) { setEditing(false); return }
    setSaving(true)
    await onSave(source, parsed)
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-400">R$</span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false) }}
          className="w-28 rounded border border-gray-600 bg-gray-900 px-2 py-0.5 text-sm font-semibold text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          autoFocus
        />
        <button onClick={save} disabled={saving} className="rounded p-0.5 text-emerald-400 hover:bg-emerald-900/30">
          <Check className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => setEditing(false)} className="rounded p-0.5 text-red-400 hover:bg-red-900/30">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="group flex items-center gap-1.5">
      <span className="text-sm font-semibold text-white">{formatBRL(value)}</span>
      <button
        onClick={() => { setInput(String(value)); setEditing(true) }}
        className="rounded p-0.5 text-gray-600 opacity-0 transition-opacity group-hover:opacity-100 hover:text-gray-300"
      >
        <Pencil className="h-3 w-3" />
      </button>
    </div>
  )
}

// ─── Channel block ────────────────────────────────────────────────────────────

function ChannelBlock({
  ch,
  periodKey,
  onSaveInvestment,
}: {
  ch: ChannelMetrics
  periodKey: string
  onSaveInvestment: (source: string, value: number) => Promise<void>
}) {
  return (
    <div className="rounded-xl border border-gray-700/50 bg-gray-800/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700/50 bg-gray-800/60">
        <h3 className="text-sm font-semibold text-white">{ch.label}</h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Investimento</span>
          <InvestmentInline
            source={ch.source}
            periodKey={periodKey}
            value={ch.investment}
            onSave={onSaveInvestment}
          />
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Funil */}
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-600">Funil</p>
          <div className="grid grid-cols-4 gap-x-6 gap-y-3 sm:grid-cols-7">
            <Cell label="Leads" value={String(ch.leads)} />
            <Cell label="MQL" value={String(ch.mql)} />
            <Cell label="Triag. Ag." value={String(ch.screeningScheduled)} />
            <Cell label="Triag. Real." value={String(ch.screeningDone)} />
            <Cell label="Reun. Fech." value={String(ch.closingMeeting)} />
            <Cell label="Fechamentos" value={String(ch.closings)} highlight="green" />
            <Cell label="Valor Fech." value={formatBRL(ch.closingValue)} highlight="green" />
          </div>
        </div>

        {/* Custos */}
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-600">Custos</p>
          <div className="grid grid-cols-3 gap-x-6 gap-y-3 sm:grid-cols-6">
            <Cell label="Custo/Lead" value={fmtCost(ch.costPerLead)} />
            <Cell label="Custo/MQL" value={fmtCost(ch.costPerMql)} />
            <Cell label="Custo/Triag.Ag." value={fmtCost(ch.costPerScreeningScheduled)} />
            <Cell label="Custo/Triag.Real." value={fmtCost(ch.costPerScreeningDone)} />
            <Cell label="Custo/Reun.Fech." value={fmtCost(ch.costPerClosingMeeting)} />
            <Cell label="CAC" value={fmtCost(ch.cac)} />
          </div>
        </div>

        {/* Taxas e Retorno */}
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-600">Conversão & Retorno</p>
          <div className="grid grid-cols-3 gap-x-6 gap-y-3 sm:grid-cols-6">
            <Cell label="Lead → MQL" value={fmtRate(ch.rateLeadToMql)} />
            <Cell label="MQL → Triagem" value={fmtRate(ch.rateMqlToScreening)} />
            <Cell label="Fech. → Fecham." value={fmtRate(ch.rateClosingMeetingToClosing)} />
            <Cell label="Lead → Fecham." value={fmtRate(ch.rateLeadToClosing)} />
            <Cell label="LTV" value={formatBRL(ch.ltv)} highlight="green" />
            <Cell label="ROAS LTV" value={fmtRoas(ch.roas)} highlight={ch.roas !== null && ch.roas >= 1 ? "green" : ch.roas !== null ? "red" : undefined} />
          </div>
        </div>
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

  async function saveInvestment(source: string, value: number) {
    if (!metrics) return
    await fetch("/api/dashboard/metrics", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, periodKey: metrics.period.key, value }),
    })
    await fetchMetrics(dateFrom, dateTo)
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-end">
        <DateRangePicker dateFrom={dateFrom} dateTo={dateTo} onApply={handleApply} />
      </div>

      {loading && <p className="text-sm text-gray-500">Carregando...</p>}

      {!loading && metrics && (
        <div className="space-y-4">
          {metrics.channels.map((ch) => (
            <ChannelBlock
              key={ch.source}
              ch={ch}
              periodKey={metrics.period.key}
              onSaveInvestment={saveInvestment}
            />
          ))}
        </div>
      )}
    </div>
  )
}
