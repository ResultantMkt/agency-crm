import { z } from "zod"

export const createClientSchema = z.object({
  name: z.string().min(1),
  niche: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  contractValue: z.number().positive(),
  billingType: z.enum(["MONTHLY", "OTHER"]).default("MONTHLY"),
  startDate: z.coerce.date(),
  endDate: z.string().optional().nullable(),
  duration: z.number().int().optional().nullable(),
  status: z.enum(["ACTIVE", "CHURN", "NOT_RENEWED"]).default("ACTIVE"),
  notes: z.string().optional().nullable(),
})

export const updateClientSchema = createClientSchema.partial()

export type CreateClientInput = z.infer<typeof createClientSchema>
export type UpdateClientInput = z.infer<typeof updateClientSchema>
