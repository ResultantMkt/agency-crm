"use client"

import { useState, useRef } from "react"
import { Upload, Download, X, CheckCircle2, AlertCircle, SkipForward } from "lucide-react"
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { Lead } from "@/types/models"

// ─── CSV template ─────────────────────────────────────────────────────────────

const CSV_TEMPLATE = [
  "Nome,Telefone,Email,Origem,Estagio,ValorEstimado,Notas",
  "João Silva,11999990001,joao@exemplo.com,TRAFFIC,LEAD,5000,Veio pelo anúncio",
].join("\n")

const SOURCE_MAP: Record<string, string> = {
  "tráfego pago": "TRAFFIC",
  "trafego pago": "TRAFFIC",
  traffic: "TRAFFIC",
  prospecção: "PROSPECTING",
  prospeccao: "PROSPECTING",
  prospecting: "PROSPECTING",
  indicação: "REFERRAL",
  indicacao: "REFERRAL",
  referral: "REFERRAL",
  outro: "OTHER",
  other: "OTHER",
}

const STAGE_MAP: Record<string, string> = {
  lead: "LEAD",
  mql: "MQL",
  "triagem agendada": "SCREENING_SCHEDULED",
  screening_scheduled: "SCREENING_SCHEDULED",
  "triagem realizada": "SCREENING_DONE",
  screening_done: "SCREENING_DONE",
  "reunião de fechamento": "CLOSING_MEETING",
  "reuniao de fechamento": "CLOSING_MEETING",
  closing_meeting: "CLOSING_MEETING",
  "proposta enviada": "PROPOSAL_SENT",
  proposal_sent: "PROPOSAL_SENT",
  fechamento: "CLOSED",
  closed: "CLOSED",
  perdido: "LOST",
  lost: "LOST",
}

// ─── CSV parser ───────────────────────────────────────────────────────────────

function parseCSV(text: string): string[][] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")
  return lines
    .filter((l) => l.trim() !== "")
    .map((line) => {
      const cols: string[] = []
      let cur = ""
      let inQuotes = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ }
          else inQuotes = !inQuotes
        } else if (ch === "," && !inQuotes) {
          cols.push(cur.trim()); cur = ""
        } else {
          cur += ch
        }
      }
      cols.push(cur.trim())
      return cols
    })
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "")
}

const HEADER_ALIASES: Record<string, string> = {
  nome: "name", name: "name",
  telefone: "phone", tel: "phone", phone: "phone", celular: "phone",
  email: "email", "e-mail": "email",
  origem: "source", source: "source",
  estagio: "stage", estágio: "stage", stage: "stage",
  valorestimado: "estimatedValue", valor: "estimatedValue", value: "estimatedValue",
  notas: "notes", notes: "notes", observacoes: "notes", observações: "notes",
}

interface ParsedRow {
  rowIndex: number
  name?: string
  phone?: string
  email?: string
  source?: string
  stage?: string
  estimatedValue?: string
  notes?: string
}

interface ValidationError {
  row: number
  message: string
}

function validateRows(rows: ParsedRow[]): { valid: ParsedRow[]; errors: ValidationError[] } {
  const valid: ParsedRow[] = []
  const errors: ValidationError[] = []
  const VALID_SOURCES = ["TRAFFIC", "PROSPECTING", "REFERRAL", "OTHER"]
  const VALID_STAGES = ["LEAD", "MQL", "SCREENING_SCHEDULED", "SCREENING_DONE", "CLOSING_MEETING", "PROPOSAL_SENT", "CLOSED", "LOST"]

  for (const row of rows) {
    const rowErrors: string[] = []

    if (!row.name?.trim()) rowErrors.push("Nome é obrigatório")
    if (!row.phone?.trim()) rowErrors.push("Telefone é obrigatório")

    // Normalize source
    if (row.source) {
      const mapped = SOURCE_MAP[row.source.toLowerCase().trim()] ?? row.source.toUpperCase()
      if (!VALID_SOURCES.includes(mapped)) {
        rowErrors.push(`Origem inválida: "${row.source}". Use: TRAFFIC, PROSPECTING, REFERRAL, OTHER`)
      } else {
        row.source = mapped
      }
    }

    // Normalize stage
    if (row.stage) {
      const key = row.stage.toLowerCase().trim()
      const mapped = STAGE_MAP[key] ?? row.stage.toUpperCase()
      if (!VALID_STAGES.includes(mapped)) {
        rowErrors.push(`Estágio inválido: "${row.stage}". Use: LEAD, MQL, SCREENING_SCHEDULED, SCREENING_DONE, CLOSING_MEETING, PROPOSAL_SENT, CLOSED, LOST`)
      } else {
        row.stage = mapped
      }
    }

    if (row.estimatedValue) {
      const v = parseFloat(row.estimatedValue.replace(",", "."))
      if (isNaN(v) || v <= 0) rowErrors.push("Valor estimado deve ser um número positivo")
    }

    if (rowErrors.length > 0) {
      errors.push({ row: row.rowIndex, message: rowErrors.join("; ") })
    } else {
      valid.push(row)
    }
  }

  return { valid, errors }
}

// ─── Import result ────────────────────────────────────────────────────────────

interface ImportResult {
  created: number
  skipped: number
  errors: { row: number; message: string }[]
}

// ─── Component ────────────────────────────────────────────────────────────────

interface CsvImportModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (leads: Lead[]) => void
}

export function CsvImportModal({ open, onClose, onSuccess }: CsvImportModalProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [clientErrors, setClientErrors] = useState<ValidationError[]>([])
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  function reset() {
    setFileName(null)
    setClientErrors([])
    setParsedRows([])
    setImporting(false)
    setResult(null)
    if (fileRef.current) fileRef.current.value = ""
  }

  function handleClose() {
    reset()
    onClose()
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "modelo-importacao-leads.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setClientErrors([])
    setParsedRows([])
    setResult(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const rows = parseCSV(text)
      if (rows.length < 2) {
        setClientErrors([{ row: 0, message: "O arquivo não contém dados além do cabeçalho." }])
        return
      }

      const headers = rows[0].map(normalizeHeader)
      const fieldMap: Record<number, string> = {}
      headers.forEach((h, i) => {
        const field = HEADER_ALIASES[h]
        if (field) fieldMap[i] = field
      })

      if (!Object.values(fieldMap).includes("name") || !Object.values(fieldMap).includes("phone")) {
        setClientErrors([{ row: 0, message: "O CSV precisa ter colunas 'Nome' e 'Telefone'." }])
        return
      }

      const dataRows: ParsedRow[] = rows.slice(1).map((cols, i) => {
        const row: ParsedRow = { rowIndex: i + 2 }
        Object.entries(fieldMap).forEach(([idx, field]) => {
          const val = cols[Number(idx)]?.trim() || undefined
          ;(row as unknown as Record<string, string | undefined>)[field] = val
        })
        return row
      })

      const { valid, errors } = validateRows(dataRows)
      setClientErrors(errors)
      setParsedRows(valid)
    }
    reader.readAsText(file, "UTF-8")
  }

  async function handleImport() {
    if (parsedRows.length === 0) return
    setImporting(true)
    try {
      const payload = parsedRows.map((r) => ({
        name: r.name,
        phone: r.phone,
        email: r.email || null,
        source: r.source || "OTHER",
        stage: r.stage || "LEAD",
        estimatedValue: r.estimatedValue
          ? parseFloat(r.estimatedValue.replace(",", "."))
          : null,
        notes: r.notes || null,
      }))

      const res = await fetch("/api/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: payload }),
      })

      const data = await res.json()
      if (!res.ok) {
        setClientErrors([{ row: 0, message: data.error ?? "Erro ao importar" }])
        return
      }

      setResult(data)

      if (data.created > 0) {
        const leadsRes = await fetch("/api/leads")
        if (leadsRes.ok) {
          const allLeads = await leadsRes.json()
          onSuccess(allLeads)
        }
      }
    } finally {
      setImporting(false)
    }
  }

  const hasFile = !!fileName
  const hasValidRows = parsedRows.length > 0
  const hasClientErrors = clientErrors.length > 0

  return (
    <DialogRoot open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar Leads via CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Template download */}
          <div className="flex items-center justify-between rounded-lg border border-gray-700/50 bg-gray-800/40 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-white">Modelo de CSV</p>
              <p className="text-xs text-gray-500">Nome, Telefone, Email, Origem, Estágio, Valor, Notas</p>
            </div>
            <button
              type="button"
              onClick={downloadTemplate}
              className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              <Download className="h-4 w-4" />
              Baixar modelo
            </button>
          </div>

          {/* File upload */}
          <div>
            <label
              htmlFor="csv-upload"
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-700 bg-gray-800/30 px-6 py-8 transition-colors hover:border-gray-600 hover:bg-gray-800/50"
            >
              <Upload className="h-8 w-8 text-gray-500" />
              <span className="text-sm text-gray-400">
                {fileName ?? "Clique para selecionar o arquivo CSV"}
              </span>
              {hasFile && !result && (
                <span className="text-xs text-gray-600">Clique para trocar o arquivo</span>
              )}
            </label>
            <input
              id="csv-upload"
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFile}
              disabled={!!result}
            />
          </div>

          {/* Validation summary (pre-import) */}
          {hasFile && !result && (
            <div className="space-y-2">
              {hasValidRows && (
                <div className="flex items-center gap-2 text-sm text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {parsedRows.length} linha{parsedRows.length !== 1 ? "s" : ""} válida{parsedRows.length !== 1 ? "s" : ""} pronta{parsedRows.length !== 1 ? "s" : ""} para importar
                </div>
              )}
              {hasClientErrors && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-red-400 mb-1">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {clientErrors.length} erro{clientErrors.length !== 1 ? "s" : ""} encontrado{clientErrors.length !== 1 ? "s" : ""}
                  </div>
                  <ul className="space-y-1 max-h-36 overflow-y-auto">
                    {clientErrors.map((e, i) => (
                      <li key={i} className="text-xs text-red-300">
                        {e.row > 0 ? `Linha ${e.row}: ` : ""}{e.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Import result */}
          {result && (
            <div className="rounded-lg border border-gray-700/50 bg-gray-800/50 p-4 space-y-3">
              <p className="text-sm font-semibold text-white">Resultado da importação</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {result.created} lead{result.created !== 1 ? "s" : ""} criado{result.created !== 1 ? "s" : ""}
                </div>
                {result.skipped > 0 && (
                  <div className="flex items-center gap-2 text-sm text-yellow-400">
                    <SkipForward className="h-4 w-4 shrink-0" />
                    {result.skipped} ignorado{result.skipped !== 1 ? "s" : ""} por duplicidade (telefone já existe)
                  </div>
                )}
                {result.errors.length > 0 && (
                  <div className="rounded border border-red-500/30 bg-red-500/10 p-2 space-y-1">
                    <div className="flex items-center gap-2 text-xs font-medium text-red-400">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      {result.errors.length} erro{result.errors.length !== 1 ? "s" : ""}
                    </div>
                    <ul className="space-y-0.5 max-h-28 overflow-y-auto">
                      {result.errors.map((e, i) => (
                        <li key={i} className="text-xs text-red-300">Linha {e.row}: {e.message}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {result ? (
            <Button onClick={handleClose} size="md">Fechar</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={handleClose} size="md" disabled={importing}>
                <X className="h-4 w-4" />
                Cancelar
              </Button>
              <Button
                onClick={handleImport}
                size="md"
                disabled={!hasValidRows || importing}
              >
                <Upload className="h-4 w-4" />
                {importing ? "Importando..." : `Importar ${hasValidRows ? parsedRows.length : ""} lead${parsedRows.length !== 1 ? "s" : ""}`}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </DialogRoot>
  )
}
