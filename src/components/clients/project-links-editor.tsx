"use client"

import { useState, useEffect } from "react"
import { Plus, ExternalLink, Pencil, Trash2, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ClientProjectLink } from "@/types/models"

interface ProjectLinksEditorProps {
  clientId: string
}

interface SectionConfig {
  key: string
  label: string
  maxLinks: number
}

const SECTIONS: SectionConfig[] = [
  { key: "resumo", label: "Resumo do Projeto", maxLinks: 1 },
  { key: "estrategias", label: "Mapa de Estratégias", maxLinks: 1 },
  { key: "resultados", label: "Controle de Resultados", maxLinks: Infinity },
]

interface AddingState {
  url: string
  label: string
}

interface EditingState {
  id: string
  url: string
  label: string
}

export function ProjectLinksEditor({ clientId }: ProjectLinksEditorProps) {
  const [links, setLinks] = useState<ClientProjectLink[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState<Record<string, AddingState | null>>({})
  const [editing, setEditing] = useState<EditingState | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/clients/${clientId}/project-links`)
      .then((r) => r.json())
      .then((data) => {
        setLinks(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [clientId])

  function getLinksForSection(section: string) {
    return links.filter((l) => l.section === section).sort((a, b) => a.position - b.position)
  }

  async function handleAdd(section: string) {
    const state = adding[section]
    if (!state?.url) return

    setSaving(section)
    try {
      const sectionLinks = getLinksForSection(section)
      const position = sectionLinks.length

      const res = await fetch(`/api/clients/${clientId}/project-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, url: state.url, label: state.label || null, position }),
      })

      if (res.ok) {
        const created = await res.json()
        setLinks((prev) => [...prev, created])
        setAdding((prev) => ({ ...prev, [section]: null }))
      }
    } finally {
      setSaving(null)
    }
  }

  async function handleSaveEdit() {
    if (!editing) return
    setSaving(editing.id)
    try {
      const res = await fetch(`/api/clients/${clientId}/project-links/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: editing.url, label: editing.label || null }),
      })
      if (res.ok) {
        const updated = await res.json()
        setLinks((prev) => prev.map((l) => (l.id === editing.id ? updated : l)))
        setEditing(null)
      }
    } finally {
      setSaving(null)
    }
  }

  async function handleDelete(id: string) {
    setSaving(id)
    try {
      const res = await fetch(`/api/clients/${clientId}/project-links/${id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setLinks((prev) => prev.filter((l) => l.id !== id))
      }
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {SECTIONS.map((s) => (
          <div key={s.key} className="h-24 rounded-lg bg-gray-100 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {SECTIONS.map((section) => {
        const sectionLinks = getLinksForSection(section.key)
        const canAdd = sectionLinks.length < section.maxLinks
        const isAdding = !!adding[section.key]

        return (
          <div
            key={section.key}
            className="bg-white border border-gray-200/50 rounded-xl p-5 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">{section.label}</h3>
              {canAdd && !isAdding && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setAdding((prev) => ({ ...prev, [section.key]: { url: "", label: "" } }))
                  }
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar link
                </Button>
              )}
            </div>

            {/* Existing links */}
            <div className="space-y-2">
              {sectionLinks.map((link) => (
                <div key={link.id}>
                  {editing?.id === link.id ? (
                    <div className="flex flex-col gap-2 p-3 rounded-lg border border-purple-200 bg-purple-50/30">
                      <input
                        type="url"
                        value={editing.url}
                        onChange={(e) => setEditing({ ...editing, url: e.target.value })}
                        placeholder="URL *"
                        className="h-8 px-3 text-sm bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900 placeholder:text-gray-400"
                      />
                      <input
                        type="text"
                        value={editing.label}
                        onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                        placeholder="Rótulo (opcional)"
                        className="h-8 px-3 text-sm bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900 placeholder:text-gray-400"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          disabled={!editing.url || saving === editing.id}
                          className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-40 transition-colors"
                        >
                          <Check className="h-3 w-3" />
                          Salvar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(null)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
                        >
                          <X className="h-3 w-3" />
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group px-3 py-2 rounded-lg bg-gray-50 border border-gray-200/60 hover:border-gray-300 transition-colors">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 min-w-0 flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700"
                      >
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          {link.label || link.url}
                        </span>
                      </a>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() =>
                            setEditing({ id: link.id, url: link.url, label: link.label ?? "" })
                          }
                          className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(link.id)}
                          disabled={saving === link.id}
                          className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add form */}
            {isAdding && (
              <div className="mt-3 flex flex-col gap-2 p-3 rounded-lg border border-purple-200 bg-purple-50/30">
                <input
                  type="url"
                  value={adding[section.key]?.url ?? ""}
                  onChange={(e) =>
                    setAdding((prev) => ({
                      ...prev,
                      [section.key]: { ...prev[section.key]!, url: e.target.value },
                    }))
                  }
                  placeholder="URL *"
                  autoFocus
                  className="h-8 px-3 text-sm bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900 placeholder:text-gray-400"
                />
                <input
                  type="text"
                  value={adding[section.key]?.label ?? ""}
                  onChange={(e) =>
                    setAdding((prev) => ({
                      ...prev,
                      [section.key]: { ...prev[section.key]!, label: e.target.value },
                    }))
                  }
                  placeholder="Rótulo (opcional)"
                  className="h-8 px-3 text-sm bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 text-gray-900 placeholder:text-gray-400"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleAdd(section.key)}
                    disabled={!adding[section.key]?.url || saving === section.key}
                    className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-40 transition-colors"
                  >
                    <Check className="h-3 w-3" />
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setAdding((prev) => ({ ...prev, [section.key]: null }))
                    }
                    className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
                  >
                    <X className="h-3 w-3" />
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {sectionLinks.length === 0 && !isAdding && (
              <p className="text-sm text-gray-400">Nenhum link adicionado.</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
