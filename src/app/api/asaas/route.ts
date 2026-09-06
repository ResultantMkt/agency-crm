import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

const ASAAS_BASE = process.env.ASAAS_SANDBOX === "true"
  ? "https://sandbox.asaas.com/api/v3"
  : "https://api.asaas.com/v3"

async function asaasFetch(path: string, apiKey: string) {
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    headers: { access_token: apiKey },
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`Asaas ${path}: ${res.status} ${res.statusText}`)
  return res.json()
}

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const apiKey = process.env.ASAAS_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "ASAAS_API_KEY não configurada. Adicione a variável de ambiente no Vercel." },
      { status: 503 }
    )
  }

  try {
    const [balance, customers, payments, subscriptions] = await Promise.all([
      asaasFetch("/finance/balance", apiKey),
      asaasFetch("/customers?limit=100&offset=0", apiKey),
      asaasFetch("/payments?limit=100&offset=0", apiKey),
      asaasFetch("/subscriptions?status=ACTIVE&limit=100&offset=0", apiKey),
    ])

    return NextResponse.json({
      balance: {
        balance: balance.balance ?? 0,
        availableBalance: balance.availableBalance ?? balance.balance ?? 0,
      },
      customers: {
        total: customers.totalCount ?? customers.data?.length ?? 0,
        data: (customers.data ?? []).slice(0, 30),
      },
      payments: {
        total: payments.totalCount ?? payments.data?.length ?? 0,
        data: payments.data ?? [],
      },
      subscriptions: {
        total: subscriptions.totalCount ?? subscriptions.data?.length ?? 0,
        data: subscriptions.data ?? [],
      },
      fetchedAt: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao buscar dados do Asaas" },
      { status: 502 }
    )
  }
}
