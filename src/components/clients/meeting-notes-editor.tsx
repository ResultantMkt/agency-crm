"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import dynamic from "next/dynamic"

const BlockEditor = dynamic(
  () => import("@/components/clients/block-editor").then((m) => ({ default: m.BlockEditor })),
  { ssr: false, loading: () => <div className="h-64 rounded-lg border border-gray-200 bg-gray-50 animate-pulse" /> }
)

interface MeetingNotesEditorProps {
  clientId: string
  initialContent: unknown[]
}

type SaveStatus = "idle" | "saving" | "saved"

export function MeetingNotesEditor({ clientId, initialContent }: MeetingNotesEditorProps) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contentRef = useRef<unknown[]>(initialContent)

  const handleSave = useCallback(
    async (content: unknown[]) => {
      setSaveStatus("saving")
      try {
        await fetch(`/api/clients/${clientId}/meeting-notes`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        })
        setSaveStatus("saved")
        setTimeout(() => setSaveStatus("idle"), 2000)
      } catch {
        setSaveStatus("idle")
      }
    },
    [clientId]
  )

  const handleChange = useCallback(
    (content: unknown[]) => {
      contentRef.current = content
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        handleSave(contentRef.current)
      }, 1500)
    },
    [handleSave]
  )

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return (
    <div className="relative">
      {/* Save status */}
      <div className="absolute -top-8 right-0 flex items-center gap-1.5">
        {saveStatus === "saving" && (
          <span className="text-xs text-gray-400">Salvando...</span>
        )}
        {saveStatus === "saved" && (
          <span className="text-xs text-emerald-500 font-medium">Salvo</span>
        )}
      </div>

      <BlockEditor initialContent={initialContent} onChange={handleChange} />
    </div>
  )
}
