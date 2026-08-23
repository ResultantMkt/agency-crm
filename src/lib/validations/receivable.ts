import { z } from "zod"

export const createReceivableSchema = z.object({
  clientId: z.string().min(1),
  value: z.number().positive(),
  referenceMonth: z.string().min(1),
  status: z.enum(["PAID", "PENDING"]).default("PENDING"),
  dueDate: z.string().min(1),
})

export const updateReceivableSchema = createReceivableSchema.partial()

export type CreateReceivableInput = z.infer<typeof createReceivableSchema>
export type UpdateReceivableInput = z.infer<typeof updateReceivableSchema>
