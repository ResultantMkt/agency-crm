import { z } from "zod"

export const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  assignedToId: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(["PENDING", "DONE"]).default("PENDING"),
  leadId: z.string().optional(),
  clientId: z.string().optional(),
})

export const updateTaskSchema = createTaskSchema.partial()

export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
