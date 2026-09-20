"use client"

import { useState, useRef } from "react"

interface LeadNameClientProps {
  leadId: string
  initialName: string
}

export function LeadNameClient({ leadId, initialName }: LeadNameClientProps) {
  const [name, setName] = useState(initialName)
  const [editing, setEditing] = useState(false)
  const [tempName, setTempName] = useState("")
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit() {
    setTempName(name)
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  async function save() {
    const trimmed = tempName.trim()
    if (!trimmed) { cancel(); return }
    if (trimmed === name) { setEditing(false); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      })
      if (res.ok) setName(trimmed)
    } finally {
      setSaving(false)
      setEditing(false)
    }
  }

  function cancel() {
    setEditing(false)
    setTempName("")
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={tempName}
        onChange={(e) => setTempName(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); save() }
          if (e.key === "Escape") cancel()
        }}
        disabled={saving}
        className="text-2xl font-bold text-gray-900 bg-gray-100 border border-purple-400 rounded px-2 py-0.5 w-full max-w-md focus:outline-none focus:ring-2 focus:ring-purple-500"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      title="Clique para editar o nome"
      className="group flex items-center gap-2 text-left"
    >
      <h2 className="text-2xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
        {name}
      </h2>
      <span className="opacity-0 group-hover:opacity-50 text-gray-500 text-sm transition-opacity select-none">
        ✎
      </span>
    </button>
  )
}
