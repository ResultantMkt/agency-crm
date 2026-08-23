import { z } from "zod"

export const createExpenseSchema = z.object({
  description: z.string().min(1),
  category: z.string().min(1),
  value: z.number().positive(),
  dueDay: z.number().int().min(1).max(31),
  isRecurring: z.boolean().default(false),
  month: z.string().optional(),
})

export const updateExpenseSchema = createExpenseSchema.partial()

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>
