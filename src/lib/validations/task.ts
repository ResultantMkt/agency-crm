import { z } from "zod"

export const createTaskSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().nullish(),
  assignedToId: z.string().nullish(),
  dueDate: z.string().nullish(),
  status: z.enum(["PENDING", "DONE"]).default("PENDING"),
  leadId: z.string().nullish(),
  clientId: z.string().nullish(),
})

export const updateTaskSchema = createTaskSchema.partial()

export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
