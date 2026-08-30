import { z } from "zod"

export const createLeadSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  phone: z.string().min(1, "Telefone é obrigatório"),
  email: z.string().email("Email inválido").or(z.literal("")).nullish(),
  source: z
    .enum(["TRAFFIC", "PROSPECTING", "REFERRAL", "OTHER"])
    .default("OTHER"),
  stage: z
    .enum(["LEAD", "MQL", "SCREENING_SCHEDULED", "SCREENING_DONE", "CLOSING_MEETING", "PROPOSAL_SENT", "CLOSED", "LOST"])
    .default("LEAD"),
  assignedToId: z.string().nullish(),
  estimatedValue: z.coerce.number().positive("Valor estimado deve ser positivo").nullish(),
  notes: z.string().nullish(),
})

export const updateLeadSchema = createLeadSchema.partial().extend({
  stage: z
    .enum(["LEAD", "MQL", "SCREENING_SCHEDULED", "SCREENING_DONE", "CLOSING_MEETING", "PROPOSAL_SENT", "CLOSED", "LOST"])
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
