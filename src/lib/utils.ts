import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Decimal } from "@prisma/client/runtime/client"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | Decimal): string {
  const num = typeof value === "number" ? value : Number(value)
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d)
}

export function formatMonth(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(d)
}

export function getStartOfMonth(date?: Date): Date {
  const d = date ? new Date(date) : new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function getEndOfMonth(date?: Date): Date {
  const d = date ? new Date(date) : new Date()
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}
