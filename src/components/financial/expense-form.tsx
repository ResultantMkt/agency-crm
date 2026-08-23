"use client"

import { useState, useEffect } from "react"
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

interface Expense {
  id: string
  description: string
  category: string
  value: string
  dueDay: number
  isRecurring: boolean
  month: string | null
}

interface ExpenseFormProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  expense?: Expense
}

const CATEGORY_SUGGESTIONS = ["Aluguel", "Salários", "Ferramentas", "Marketing", "Outros"]

export function ExpenseForm({ open, onClose, onSuccess, expense }: ExpenseFormProps) {
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [value, setValue] = useState("")
  const [dueDay, setDueDay] = useState("1")
  const [isRecurring, setIsRecurring] = useState(false)
  const [month, setMonth] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      if (expense) {
        setDescription(expense.description)
        setCategory(expense.category)
        setValue(expense.value)
        setDueDay(String(expense.dueDay))
        setIsRecurring(expense.isRecurring)
        setMonth(expense.month ? expense.month.slice(0, 7) : "")
      } else {
        setDescription("")
        setCategory("")
        setValue("")
        setDueDay("1")
        setIsRecurring(false)
        setMonth("")
      }
      setError("")
    }
  }, [open, expense])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const body = {
      description,
      category,
      value: parseFloat(value),
      dueDay: parseInt(dueDay),
      isRecurring,
      month: isRecurring ? null : month ? `${month}-01` : null,
    }

    try {
      const url = expense ? `/api/expenses/${expense.id}` : "/api/expenses"
      const method = expense ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Erro ao salvar despesa")
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado")
    } finally {
      setLoading(false)
    }
  }

  return (
    <DialogRoot open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{expense ? "Editar Despesa" : "Nova Despesa"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="rounded-lg bg-red-900/30 border border-red-700/50 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="exp-desc">Descrição</Label>
            <Input
              id="exp-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Servidor AWS"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="exp-category">Categoria</Label>
            <Input
              id="exp-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ex: Ferramentas"
              list="category-suggestions"
              required
            />
            <datalist id="category-suggestions">
              {CATEGORY_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="exp-value">Valor (R$)</Label>
              <Input
                id="exp-value"
                type="number"
                min="0"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0,00"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exp-dueday">Dia de Vencimento</Label>
              <Input
                id="exp-dueday"
                type="number"
                min="1"
                max="31"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="exp-recurring"
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
            />
            <Label htmlFor="exp-recurring" className="cursor-pointer">
              Despesa recorrente
            </Label>
          </div>

          {!isRecurring && (
            <div className="space-y-1.5">
              <Label htmlFor="exp-month">Mês</Label>
              <Input
                id="exp-month"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                required={!isRecurring}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : expense ? "Salvar Alterações" : "Criar Despesa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  )
}
