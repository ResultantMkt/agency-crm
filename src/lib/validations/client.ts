import { z } from "zod"

export const createClientSchema = z.object({
  name: z.string().min(1),
  contractValue: z.number().positive(),
  billingType: z.enum(["MONTHLY", "OTHER"]),
  startDate: z.coerce.date(),
  endDate: z.string().optional(),
  duration: z.number().int().optional(),
  status: z.enum(["ACTIVE", "CHURN", "NOT_RENEWED"]).default("ACTIVE"),
  notes: z.string().optional(),
})

export const updateClientSchema = createClientSchema.partial()

export type CreateClientInput = z.infer<typeof createClientSchema>
export type UpdateClientInput = z.infer<typeof updateClientSchema>
