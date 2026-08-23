import { z } from "zod"

export const createLeadSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  source: z
    .enum(["TRAFFIC", "PROSPECTING", "REFERRAL", "OTHER"])
    .default("OTHER"),
  stage: z
    .enum(["LEAD", "MQL", "MEETING_SCHEDULED", "MEETING_DONE", "PROPOSAL", "CLOSED", "LOST"])
    .default("LEAD"),
  assignedToId: z.string().optional(),
  estimatedValue: z.number().positive().optional(),
  notes: z.string().optional(),
})

export const updateLeadSchema = createLeadSchema.partial().extend({
  stage: z
    .enum(["LEAD", "MQL", "MEETING_SCHEDULED", "MEETING_DONE", "PROPOSAL", "CLOSED", "LOST"])
    .optional(),
})

export const webhookLeadSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  source: z.enum(["TRAFFIC", "PROSPECTING", "REFERRAL", "OTHER"]).optional(),
  notes: z.string().optional(),
})

export type CreateLeadInput = z.infer<typeof createLeadSchema>
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>
export type WebhookLeadInput = z.infer<typeof webhookLeadSchema>
