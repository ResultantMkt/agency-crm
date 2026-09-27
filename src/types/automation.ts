export type TriggerType =
  | "lead.created"
  | "lead.stage_changed"
  | "lead.won"
  | "lead.lost"
  | "lead.updated"
  | "lead.updated_any"
  | "activity.created"
  | "form.submitted"

export interface TriggerConfig {
  fromStage?: string
  toStage?: string
  field?: string
}

export interface AutomationTrigger {
  type: TriggerType
  config: TriggerConfig
}

export type ConditionField = "stage" | "source" | "assignedToId" | "estimatedValue" | "name" | "email" | "phone"
export type ConditionOperator = "equals" | "not_equals" | "contains" | "is_empty" | "is_not_empty"

export interface ConditionStep {
  id: string
  type: "condition"
  field: ConditionField
  operator: ConditionOperator
  value?: string
}

export type ActionType =
  | "notify_whatsapp_group"
  | "start_sequence"
  | "create_task"
  | "change_stage"
  | "assign_user"
  | "call_webhook"

export interface ActionStep {
  id: string
  type: "action"
  actionType: ActionType
  config: Record<string, unknown>
}

export type AutomationStep = ConditionStep | ActionStep

export interface AutomationWithLabels {
  id: string
  name: string
  description: string | null
  active: boolean
  trigger: AutomationTrigger
  steps: AutomationStep[]
  runCount: number
  lastRunAt: string | null
  createdAt: string
  updatedAt: string
  labels: { id: string; name: string; color: string }[]
}
