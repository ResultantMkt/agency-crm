"use client"

import { useState, useRef, useEffect } from "react"
import { Filter, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { LeadSource, LeadStage, User } from "@/types/models"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KanbanFilterState {
  sources: LeadSource[]
  assignedToIds: string[]   // "__unassigned__" = sem responsável
  stages: LeadStage[]
  createdFrom: string       // YYYY-MM-DD
  createdTo: string         // YYYY-MM-DD
}

export const EMPTY_FILTERS: KanbanFilterState = {
  sources: [],
  assignedToIds: [],
  stages: [],
  createdFrom: "",
  createdTo: "",
}

export function countActiveFilters(f: KanbanFilterState): number {
  return [
    f.sources.length > 0,
    f.assignedToIds.length > 0,
    f.stages.length > 0,
    !!(f.createdFrom || f.createdTo),
  ].filter(Boolean).length
}

// ─── Options ──────────────────────────────────────────────────────────────────

const SOURCE_OPTIONS: { value: LeadSource; label: string }[] = [
  { value: "TRAFFIC", label: "Tráfego pago" },
  { value: "PROSPECTING", label: "Prospecção" },
  { value: "REFERRAL", label: "Indicação" },
  { value: "OTHER", label: "Outro" },
]

const STAGE_OPTIONS: { value: LeadStage; label: string }[] = [
  { value: "LEAD", label: "Lead" },
  { value: "MQL", label: "MQL" },
  { value: "SCREENING_SCHEDULED", label: "Triagem Agendada" },
  { value: "SCREENING_DONE", label: "Triagem Realizada" },
  { value: "CLOSING_MEETING", label: "Reun. Fechamento" },
  { value: "PROPOSAL_SENT", label: "Proposta Enviada" },
  { value: "CLOSED", label: "Fechamento" },
  { value: "LOST", label: "Perdido" },
]

export const UNASSIGNED_ID = "__unassigned__"

// ─── Component ────────────────────────────────────────────────────────────────

interface KanbanFiltersProps {
  filters: KanbanFilterState
  users: User[]
  onChange: (filters: KanbanFilterState) => void
}

export function KanbanFilters({ filters, users, onChange }: KanbanFiltersProps) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const count = countActiveFilters(filters)

  useEffect(() => {
    if (!open) return
    function onOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onOutside)
    return () => document.removeEventListener("mousedown", onOutside)
  }, [open])

  function toggle<T extends string>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
  }

  return (
    <div ref={panelRef} className="relative">
      {/* Trigger button */}
      <Button
        variant={count > 0 ? "default" : "outline"}
        size="md"
        onClick={() => setOpen((v) => !v)}
        className={count > 0 ? "bg-blue-600 hover:bg-blue-700 border-transparent" : ""}
      >
        <Filter className="h-4 w-4" />
        Filtros
        {count > 0 && (
          <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold">
            {count}
          </span>
        )}
      </Button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-11 z-50 w-[320px] rounded-xl border border-gray-700 bg-gray-900 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-800">
            <span className="text-sm font-semibold text-white">Filtros</span>
            {count > 0 && (
              <button
                type="button"
                onClick={() => onChange(EMPTY_FILTERS)}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                <X className="h-3 w-3" />
                Limpar tudo
              </button>
            )}
          </div>

          <div className="p-4 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Origem */}
            <FilterSection title="Origem">
              <div className="grid grid-cols-2 gap-y-2 gap-x-3">
                {SOURCE_OPTIONS.map((o) => (
                  <FilterCheckbox
                    key={o.value}
                    label={o.label}
                    checked={filters.sources.includes(o.value)}
                    onChange={() =>
                      onChange({ ...filters, sources: toggle(filters.sources, o.value) })
                    }
                  />
                ))}
              </div>
            </FilterSection>

            {/* Responsável */}
            <FilterSection title="Responsável">
              <div className="space-y-2">
                <FilterCheckbox
                  label="Sem responsável"
                  checked={filters.assignedToIds.includes(UNASSIGNED_ID)}
                  onChange={() =>
                    onChange({
                      ...filters,
                      assignedToIds: toggle(filters.assignedToIds, UNASSIGNED_ID),
                    })
                  }
                />
                <div className="grid grid-cols-2 gap-y-2 gap-x-3">
                  {users.map((u) => (
                    <FilterCheckbox
                      key={u.id}
                      label={u.name.split(" ")[0]}
                      checked={filters.assignedToIds.includes(u.id)}
                      onChange={() =>
                        onChange({
                          ...filters,
                          assignedToIds: toggle(filters.assignedToIds, u.id),
                        })
                      }
                    />
                  ))}
                </div>
              </div>
            </FilterSection>

            {/* Etapa */}
            <FilterSection title="Etapa do funil">
              <div className="grid grid-cols-2 gap-y-2 gap-x-3">
                {STAGE_OPTIONS.map((o) => (
                  <FilterCheckbox
                    key={o.value}
                    label={o.label}
                    checked={filters.stages.includes(o.value)}
                    onChange={() =>
                      onChange({ ...filters, stages: toggle(filters.stages, o.value) })
                    }
                  />
                ))}
              </div>
            </FilterSection>

            {/* Data de criação */}
            <FilterSection title="Data de criação">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1 block">
                    De
                  </label>
                  <input
                    type="date"
                    value={filters.createdFrom}
                    onChange={(e) => onChange({ ...filters, createdFrom: e.target.value })}
                    className="w-full text-xs bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1 block">
                    Até
                  </label>
                  <input
                    type="date"
                    value={filters.createdTo}
                    min={filters.createdFrom || undefined}
                    onChange={(e) => onChange({ ...filters, createdTo: e.target.value })}
                    className="w-full text-xs bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              {(filters.createdFrom || filters.createdTo) && (
                <button
                  type="button"
                  onClick={() => onChange({ ...filters, createdFrom: "", createdTo: "" })}
                  className="mt-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Limpar datas
                </button>
              )}
            </FilterSection>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
        {title}
      </p>
      {children}
    </div>
  )
}

function FilterCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <div
        className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
          checked
            ? "bg-blue-600 border-blue-600"
            : "bg-gray-800 border-gray-600 group-hover:border-gray-500"
        }`}
        onClick={onChange}
      >
        {checked && (
          <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 10 8" fill="none">
            <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span
        className={`text-xs truncate transition-colors ${checked ? "text-white" : "text-gray-400 group-hover:text-gray-300"}`}
        onClick={onChange}
      >
        {label}
      </span>
    </label>
  )
}
