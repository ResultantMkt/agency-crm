"use client"

import "@blocknote/core/fonts/inter.css"
import "@blocknote/mantine/style.css"
import { useCreateBlockNote } from "@blocknote/react"
import { BlockNoteView } from "@blocknote/mantine"
import type { Block } from "@blocknote/core"
import { useCallback } from "react"

interface BlockEditorProps {
  initialContent: unknown[]
  onChange: (content: unknown[]) => void
}

export function BlockEditor({ initialContent, onChange }: BlockEditorProps) {
  const editor = useCreateBlockNote({
    initialContent: initialContent?.length ? (initialContent as Block[]) : undefined,
    uploadFile: async (file: File) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })
    },
  })

  const handleChange = useCallback(() => {
    onChange(editor.document as unknown[])
  }, [editor, onChange])

  return (
    <BlockNoteView
      editor={editor}
      theme="light"
      onChange={handleChange}
      className="min-h-[200px] rounded-lg border border-gray-200 bg-white"
    />
  )
}
