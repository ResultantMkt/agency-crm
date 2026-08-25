import { auth } from "@/lib/auth"
import { processNextQueueItem } from "@/lib/queue"

async function handle() {
  try {
    const result = await processNextQueueItem()
    return Response.json(result)
  } catch (error) {
    console.error("[/api/queue/process]", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${cronSecret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
  }
  return handle()
}

export async function POST() {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
  return handle()
}
