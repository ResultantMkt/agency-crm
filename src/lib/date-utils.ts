const SP_TZ = "America/Sao_Paulo"

// Today's date in São Paulo as "YYYY-MM-DD"
function todaySP(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: SP_TZ }).format(new Date())
}

/**
 * Returns the cutoff Date for server-side Prisma overdue queries.
 * dueDates are stored as midnight UTC of the user's intended date (e.g. "2026-08-30" → 2026-08-30T00:00:00Z).
 * A task is overdue only after its due day has fully passed in São Paulo timezone.
 * The cutoff is midnight UTC of today's SP date, so only dates strictly before today's SP date match.
 */
export function getOverdueCutoff(): Date {
  return new Date(`${todaySP()}T00:00:00.000Z`)
}

/**
 * Returns true when a task is past its due date in São Paulo timezone.
 * Compares the UTC date portion of dueDate (which encodes the user's intended date)
 * against today's date in São Paulo — a task is overdue only if its date is strictly
 * before today in SP.
 */
export function isTaskOverdue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false
  const dueDateDay = new Date(dueDate).toISOString().slice(0, 10)
  return dueDateDay < todaySP()
}
