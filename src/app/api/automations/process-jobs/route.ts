import { processAutomationJobs } from "@/lib/automation-engine"
import { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  // Vercel Cron passes a header; also allow internal calls
  const authHeader = request.headers.get("authorization")
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const result = await processAutomationJobs()
  return Response.json(result)
}
