"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface MetaPage {
  id: string
  name: string
}

export default function MetaPageSelectPage() {
  const router = useRouter()
  const [pages, setPages] = useState<MetaPage[]>([])
  const [connecting, setConnecting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    const search = new URLSearchParams(window.location.search)
    const encoded = search.get("pages") ?? ""
    if (!encoded) {
      setExpired(true)
      return
    }
    try {
      const decoded: MetaPage[] = JSON.parse(atob(encoded))
      setPages(decoded)
    } catch {
      setExpired(true)
    }
  }, [])

  async function handleSelect(page: MetaPage) {
    setConnecting(page.id)
    setError(null)
    try {
      const res = await fetch("/api/meta/oauth/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: page.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erro ao conectar")
      router.push(
        `/settings/integrations?meta=connected&page=${encodeURIComponent(page.name)}`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
      setConnecting(null)
    }
  }

  if (expired) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <XCircle className="h-10 w-10 text-red-400 mx-auto" />
            <p className="text-sm text-gray-300">
              Sessão expirada ou inválida. Inicie o fluxo novamente.
            </p>
            <Button
              variant="outline"
              onClick={() => router.push("/settings/integrations")}
            >
              Voltar para Integrações
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Escolha a página do Facebook</CardTitle>
          <CardDescription>
            Selecione a página que tem os formulários de Lead Ads que você quer conectar ao CRM.
            Todos os leads dessa página serão importados automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {pages.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            pages.map((page) => (
              <div
                key={page.id}
                className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3 gap-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{page.name}</p>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">ID: {page.id}</p>
                </div>
                <Button
                  size="sm"
                  className="shrink-0"
                  disabled={connecting !== null}
                  onClick={() => handleSelect(page)}
                >
                  {connecting === page.id ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Conectando...
                    </>
                  ) : connecting !== null ? (
                    "Aguarde..."
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      Conectar
                    </>
                  )}
                </Button>
              </div>
            ))
          )}

          <div className="pt-2">
            <button
              type="button"
              disabled={connecting !== null}
              onClick={() => router.push("/settings/integrations")}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-40"
            >
              Cancelar e voltar
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
