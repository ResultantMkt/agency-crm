"use client"

import { useEffect, useState } from "react"
import {
  MessageSquare,
  Calendar,
  Globe,
  Eye,
  EyeOff,
  Copy,
  Check,
  Wifi,
  WifiOff,
  Loader2,
  QrCode,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"

interface Integration {
  id: string
  name: string
  config: Record<string, string>
  updatedAt: string
}

type WaStatus = "idle" | "checking" | "connected" | "disconnected" | "awaiting_qr"

function usePasswordToggle() {
  const [show, setShow] = useState(false)
  return { show, toggle: () => setShow((v) => !v) }
}

export default function IntegrationsPage() {
  // Z-API credentials state
  const [zapiInstanceId, setZapiInstanceId] = useState("")
  const [zapiToken, setZapiToken] = useState("")
  const [zapiBaseUrl, setZapiBaseUrl] = useState("https://api.z-api.io/instances")
  const [zapiSaving, setZapiSaving] = useState(false)
  const [zapiSuccess, setZapiSuccess] = useState(false)
  const [zapiError, setZapiError] = useState<string | null>(null)
  const zapiTokenToggle = usePasswordToggle()

  // WhatsApp connection state
  const [waStatus, setWaStatus] = useState<WaStatus>("idle")
  const [waQrCode, setWaQrCode] = useState<string | null>(null)
  const [waConnecting, setWaConnecting] = useState(false)
  const [waDisconnecting, setWaDisconnecting] = useState(false)
  const [waError, setWaError] = useState<string | null>(null)

  // Google Calendar state
  const [gcClientId, setGcClientId] = useState("")
  const [gcClientSecret, setGcClientSecret] = useState("")
  const [gcSaving, setGcSaving] = useState(false)
  const [gcSuccess, setGcSuccess] = useState(false)
  const [gcError, setGcError] = useState<string | null>(null)
  const gcSecretToggle = usePasswordToggle()

  // Respondi state
  const [webhookOrigin, setWebhookOrigin] = useState("")
  const [copied, setCopied] = useState(false)

  // Poll status every 5s while awaiting QR scan
  useEffect(() => {
    if (waStatus !== "awaiting_qr") return

    const poll = async () => {
      try {
        const res = await fetch("/api/zapi/status")
        if (!res.ok) return
        const data = await res.json()
        if (data.connected) {
          setWaStatus("connected")
          setWaQrCode(null)
        }
      } catch {
        // silently ignore poll errors
      }
    }

    const id = setInterval(poll, 5000)
    return () => clearInterval(id)
  }, [waStatus])

  useEffect(() => {
    if (typeof window !== "undefined") {
      setWebhookOrigin(window.location.origin)
    }

    async function loadIntegrations() {
      try {
        const res = await fetch("/api/settings/integrations")
        if (!res.ok) return
        const integrations: Integration[] = await res.json()

        const zapi = integrations.find((i) => i.name === "ZAPI")
        if (zapi?.config) {
          const instanceId = zapi.config.instanceId ?? ""
          const token = zapi.config.token ?? ""
          setZapiInstanceId(instanceId)
          setZapiToken(token)
          setZapiBaseUrl(zapi.config.baseUrl ?? "https://api.z-api.io/instances")
          if (instanceId && token) fetchWaStatus()
        }

        const gc = integrations.find((i) => i.name === "GOOGLE_CALENDAR")
        if (gc?.config) {
          setGcClientId(gc.config.clientId ?? "")
          setGcClientSecret(gc.config.clientSecret ?? "")
        }
      } catch {
        // silently ignore
      }
    }

    loadIntegrations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchWaStatus() {
    setWaStatus("checking")
    setWaError(null)
    try {
      const res = await fetch("/api/zapi/status")
      if (res.status === 400) {
        setWaStatus("idle")
        return
      }
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || "Erro ao verificar status")
      }
      const data = await res.json()
      setWaStatus(data.connected ? "connected" : "disconnected")
    } catch (err) {
      setWaStatus("disconnected")
      setWaError(err instanceof Error ? err.message : "Erro ao verificar status")
    }
  }

  async function handleConnect() {
    setWaConnecting(true)
    setWaError(null)
    try {
      const res = await fetch("/api/zapi/qrcode")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao obter QR code")
      if (!data.value) throw new Error("QR code não disponível. Tente novamente.")
      setWaQrCode(data.value)
      setWaStatus("awaiting_qr")
    } catch (err) {
      setWaError(err instanceof Error ? err.message : "Erro ao conectar")
    } finally {
      setWaConnecting(false)
    }
  }

  async function handleDisconnect() {
    setWaDisconnecting(true)
    setWaError(null)
    try {
      const res = await fetch("/api/zapi/disconnect", { method: "POST" })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || "Erro ao desconectar")
      }
      setWaStatus("disconnected")
      setWaQrCode(null)
    } catch (err) {
      setWaError(err instanceof Error ? err.message : "Erro ao desconectar")
    } finally {
      setWaDisconnecting(false)
    }
  }

  async function saveIntegration(
    name: string,
    config: Record<string, string>,
    setSaving: (v: boolean) => void,
    setSuccess: (v: boolean) => void,
    setError: (v: string | null) => void
  ): Promise<boolean> {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/settings/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, config }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao salvar")
      }
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
      return false
    } finally {
      setSaving(false)
    }
  }

  async function handleZapiSave() {
    const ok = await saveIntegration(
      "ZAPI",
      { instanceId: zapiInstanceId, token: zapiToken, baseUrl: zapiBaseUrl },
      setZapiSaving,
      setZapiSuccess,
      setZapiError
    )
    if (ok && zapiInstanceId && zapiToken) fetchWaStatus()
  }

  async function handleCopyWebhook() {
    const url = `${webhookOrigin}/api/webhooks/lead`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert("Não foi possível copiar. Copie manualmente: " + url)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Integrações</h1>
        <p className="text-sm text-gray-400 mt-1">
          Configure as integrações externas da plataforma
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Card 1: Z-API */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 border border-green-500/20">
                <MessageSquare className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <CardTitle>Z-API — WhatsApp</CardTitle>
              </div>
            </div>
            <CardDescription className="mt-2">
              Integração com WhatsApp via Z-API para envio e recebimento de mensagens.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="zapi-instance">Instance ID</Label>
              <Input
                id="zapi-instance"
                value={zapiInstanceId}
                onChange={(e) => setZapiInstanceId(e.target.value)}
                placeholder="Seu Instance ID"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zapi-token">Token</Label>
              <div className="relative">
                <Input
                  id="zapi-token"
                  type={zapiTokenToggle.show ? "text" : "password"}
                  value={zapiToken}
                  onChange={(e) => setZapiToken(e.target.value)}
                  placeholder="Token de autenticação"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={zapiTokenToggle.toggle}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {zapiTokenToggle.show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="zapi-base-url">Base URL</Label>
              <Input
                id="zapi-base-url"
                value={zapiBaseUrl}
                onChange={(e) => setZapiBaseUrl(e.target.value)}
                placeholder="https://api.z-api.io/instances"
              />
            </div>

            {zapiError && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {zapiError}
              </p>
            )}
            {zapiSuccess && (
              <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                Configurações salvas!
              </p>
            )}

            <Button
              className="w-full"
              disabled={zapiSaving}
              onClick={handleZapiSave}
            >
              {zapiSaving ? "Salvando..." : "Salvar"}
            </Button>

            {/* WhatsApp Connection */}
            {waStatus !== "idle" && (
              <div className="border-t border-gray-700 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-300">Conexão WhatsApp</span>
                  {waStatus === "checking" && (
                    <Badge variant="outline" className="gap-1.5 text-gray-400">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Verificando...
                    </Badge>
                  )}
                  {waStatus === "connected" && (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 gap-1.5">
                      <Wifi className="h-3 w-3" />
                      Conectado
                    </Badge>
                  )}
                  {waStatus === "disconnected" && (
                    <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 gap-1.5">
                      <WifiOff className="h-3 w-3" />
                      Desconectado
                    </Badge>
                  )}
                  {waStatus === "awaiting_qr" && (
                    <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 gap-1.5">
                      <QrCode className="h-3 w-3" />
                      Aguardando leitura...
                    </Badge>
                  )}
                </div>

                {waStatus === "awaiting_qr" && waQrCode && (
                  <div className="flex flex-col items-center gap-2 py-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={waQrCode}
                      alt="QR Code WhatsApp"
                      className="w-48 h-48 rounded-lg border border-gray-600 bg-white"
                    />
                    <p className="text-xs text-gray-400 text-center">
                      Abra o WhatsApp → Dispositivos conectados → Conectar dispositivo
                    </p>
                  </div>
                )}

                {waError && (
                  <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {waError}
                  </p>
                )}

                {waStatus === "connected" ? (
                  <Button
                    variant="outline"
                    className="w-full text-red-400 border-red-500/30 hover:bg-red-500/10"
                    disabled={waDisconnecting}
                    onClick={handleDisconnect}
                  >
                    {waDisconnecting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Desconectando...
                      </>
                    ) : (
                      <>
                        <WifiOff className="h-4 w-4 mr-2" />
                        Desconectar
                      </>
                    )}
                  </Button>
                ) : waStatus !== "awaiting_qr" ? (
                  <Button
                    variant="outline"
                    className="w-full text-green-400 border-green-500/30 hover:bg-green-500/10"
                    disabled={waConnecting || waStatus === "checking"}
                    onClick={handleConnect}
                  >
                    {waConnecting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Obtendo QR code...
                      </>
                    ) : (
                      <>
                        <QrCode className="h-4 w-4 mr-2" />
                        Conectar WhatsApp
                      </>
                    )}
                  </Button>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Google Agenda */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Calendar className="h-5 w-5 text-blue-400" />
                </div>
                <CardTitle>Google Agenda</CardTitle>
              </div>
              <Badge variant="warning">Em breve</Badge>
            </div>
            <CardDescription className="mt-2">
              Sincronização de reuniões e compromissos com o Google Calendar. (Em breve)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gc-client-id">Client ID</Label>
              <Input
                id="gc-client-id"
                value={gcClientId}
                onChange={(e) => setGcClientId(e.target.value)}
                placeholder="Google OAuth Client ID"
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gc-client-secret">Client Secret</Label>
              <div className="relative">
                <Input
                  id="gc-client-secret"
                  type={gcSecretToggle.show ? "text" : "password"}
                  value={gcClientSecret}
                  onChange={(e) => setGcClientSecret(e.target.value)}
                  placeholder="Google OAuth Client Secret"
                  className="pr-10"
                  disabled
                />
                <button
                  type="button"
                  onClick={gcSecretToggle.toggle}
                  disabled
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  {gcSecretToggle.show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {gcError && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {gcError}
              </p>
            )}
            {gcSuccess && (
              <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                Configurações salvas!
              </p>
            )}

            <Button
              className="w-full"
              disabled={gcSaving}
              onClick={() =>
                saveIntegration(
                  "GOOGLE_CALENDAR",
                  { clientId: gcClientId, clientSecret: gcClientSecret },
                  setGcSaving,
                  setGcSuccess,
                  setGcError
                )
              }
            >
              {gcSaving ? "Salvando..." : "Salvar"}
            </Button>
          </CardContent>
        </Card>

        {/* Card 3: Respondi Forms */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 border border-orange-500/20">
                <Globe className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <CardTitle>Respondi Forms</CardTitle>
              </div>
            </div>
            <CardDescription className="mt-2">
              Receba leads automaticamente do formulário Respondi no pipeline CRM.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="respondi-webhook">URL do Webhook (cole no painel Respondi)</Label>
              <div className="flex gap-2">
                <Input
                  id="respondi-webhook"
                  readOnly
                  value={webhookOrigin ? `${webhookOrigin}/api/webhooks/lead` : "Carregando..."}
                  className="flex-1 text-gray-400 cursor-text select-all"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyWebhook}
                  className="shrink-0 gap-1.5"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-400" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copiar
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-sm text-yellow-300">
              Configure também o header{" "}
              <code className="rounded bg-gray-700 px-1 py-0.5 font-mono text-xs text-yellow-200">
                x-webhook-secret
              </code>{" "}
              com o valor do seu{" "}
              <code className="rounded bg-gray-700 px-1 py-0.5 font-mono text-xs text-yellow-200">
                WEBHOOK_SECRET
              </code>{" "}
              para segurança.
            </div>
          </CardContent>
        </Card>

      </div>

      <p className="text-xs text-gray-500 text-center pt-2">
        As credenciais são armazenadas de forma segura no banco de dados.
      </p>
    </div>
  )
}
