"use client"

import { useState, useEffect, useRef } from "react"
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Camera } from "lucide-react"
import type { Client } from "@/types/models"

interface ClientFormProps {
  open: boolean
  onClose: () => void
  onSuccess: (client: Client) => void
  client?: Client
}

interface FormState {
  name: string
  niche: string
  logoUrl: string
  startDate: string
  endDate: string
  duration: string
  contractValue: string
}

const DEFAULT_FORM: FormState = {
  name: "",
  niche: "",
  logoUrl: "",
  startDate: "",
  endDate: "",
  duration: "",
  contractValue: "",
}

function toInputDate(dateStr?: string | null): string {
  if (!dateStr) return ""
  return dateStr.split("T")[0]
}

function getInitials(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?"
}

function resizeToBase64(file: File, size = 96): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext("2d")
      if (!ctx) { reject(new Error("canvas")); return }
      const scale = Math.max(size / img.width, size / img.height)
      const w = img.width * scale
      const h = img.height * scale
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL("image/jpeg", 0.82))
    }
    img.onerror = reject
    img.src = url
  })
}

export function ClientForm({ open, onClose, onSuccess, client }: ClientFormProps) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const isEditing = !!client

  useEffect(() => {
    if (client) {
      setForm({
        name: client.name,
        niche: client.niche ?? "",
        logoUrl: client.logoUrl ?? "",
        startDate: toInputDate(client.startDate),
        endDate: toInputDate(client.endDate),
        duration: client.duration?.toString() ?? "",
        contractValue: client.contractValue,
      })
    } else {
      setForm(DEFAULT_FORM)
    }
    setError(null)
  }, [client, open])

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const b64 = await resizeToBase64(file)
      set("logoUrl", b64)
    } catch {
      setError("Não foi possível processar a imagem.")
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const payload = {
      name: form.name.trim(),
      niche: form.niche.trim() || null,
      logoUrl: form.logoUrl || null,
      contractValue: parseFloat(form.contractValue),
      startDate: form.startDate || undefined,
      endDate: form.endDate || null,
      duration: form.duration ? parseInt(form.duration, 10) : null,
    }

    try {
      const url = isEditing ? `/api/clients/${client.id}` : "/api/clients"
      const method = isEditing ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Erro ao salvar cliente")
      }

      const saved: Client = await res.json()
      onSuccess(saved)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }

  return (
    <DialogRoot open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative shrink-0 h-16 w-16 rounded-full overflow-hidden border-2 border-dashed border-gray-300 hover:border-purple-400 transition-colors group"
            >
              {form.logoUrl ? (
                <img src={form.logoUrl} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-purple-600 text-white text-lg font-bold uppercase">
                  {form.name ? getInitials(form.name) : <Camera className="h-5 w-5 opacity-60" />}
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-5 w-5 text-white" />
              </div>
            </button>
            <div className="text-sm text-gray-500">
              <p className="font-medium text-gray-700">Logo do cliente</p>
              <p>Clique para fazer upload. JPG ou PNG.</p>
              {form.logoUrl && (
                <button
                  type="button"
                  className="text-xs text-red-500 hover:underline mt-0.5"
                  onClick={() => { set("logoUrl", ""); if (fileRef.current) fileRef.current.value = "" }}
                >
                  Remover logo
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Nome */}
          <div className="space-y-1.5">
            <Label htmlFor="client-name">Nome *</Label>
            <Input
              id="client-name"
              placeholder="Nome da empresa ou cliente"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
          </div>

          {/* Nicho */}
          <div className="space-y-1.5">
            <Label htmlFor="client-niche">Nicho</Label>
            <Input
              id="client-niche"
              placeholder="Ex: E-commerce, Saúde, Educação..."
              value={form.niche}
              onChange={(e) => set("niche", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Data de Início */}
            <div className="space-y-1.5">
              <Label htmlFor="client-start">Data de Início *</Label>
              <Input
                id="client-start"
                type="date"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
                required
              />
            </div>

            {/* Data de Término */}
            <div className="space-y-1.5">
              <Label htmlFor="client-end">Data de Término</Label>
              <Input
                id="client-end"
                type="date"
                value={form.endDate}
                onChange={(e) => set("endDate", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Duração do contrato */}
            <div className="space-y-1.5">
              <Label>Duração do contrato</Label>
              <Select
                value={form.duration}
                onValueChange={(v) => set("duration", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 meses</SelectItem>
                  <SelectItem value="6">6 meses</SelectItem>
                  <SelectItem value="12">1 ano</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Valor do contrato */}
            <div className="space-y-1.5">
              <Label htmlFor="client-value">Valor do contrato (R$) *</Label>
              <Input
                id="client-value"
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={form.contractValue}
                onChange={(e) => set("contractValue", e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : isEditing ? "Salvar alterações" : "Criar cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  )
}
