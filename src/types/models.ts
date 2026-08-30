export type LeadStage = "LEAD" | "MQL" | "MEETING_SCHEDULED" | "MEETING_DONE" | "PROPOSAL" | "CLOSED" | "LOST"
export type LeadSource = "TRAFFIC" | "PROSPECTING" | "REFERRAL" | "OTHER"
export type ClientStatus = "ACTIVE" | "CHURN" | "NOT_RENEWED"
export type TaskStatus = "PENDING" | "DONE"
export type ReceivableStatus = "PAID" | "PENDING"
export type MessageDirection = "INBOUND" | "OUTBOUND"

export interface User {
  id: string
  name: string
  email: string
  role: string
}

export interface Lead {
  id: string
  name: string
  phone: string
  email?: string | null
  source: LeadSource
  stage: LeadStage
  assignedToId?: string | null
  estimatedValue?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
  assignedTo?: { name: string; email: string } | null
  tasks?: { id: string; title: string; description?: string | null; status: TaskStatus; dueDate?: string | null; assignedTo?: { name: string } | null }[]
}

export interface LeadHistory {
  id: string
  leadId: string
  fromStage?: LeadStage | null
  toStage: LeadStage
  note?: string | null
  changedById: string
  createdAt: string
  changedBy?: { name: string }
}

export interface Client {
  id: string
  name: string
  contractValue: string
  billingType: "MONTHLY" | "OTHER"
  startDate: string
  endDate?: string | null
  duration?: number | null
  status: ClientStatus
  notes?: string | null
  createdAt: string
  updatedAt: string
}

export interface Task {
  id: string
  title: string
  description?: string | null
  assignedToId?: string | null
  dueDate?: string | null
  status: TaskStatus
  leadId?: string | null
  clientId?: string | null
  createdAt: string
  updatedAt: string
  assignedTo?: { name: string } | null
  lead?: { name: string } | null
  client?: { name: string } | null
}

export interface Receivable {
  id: string
  clientId: string
  value: string
  referenceMonth: string
  status: ReceivableStatus
  dueDate: string
  createdAt: string
  client?: { name: string }
}

export interface Conversation {
  id: string
  leadId?: string | null
  clientId?: string | null
  phoneNumber: string
  contactName?: string | null
  contactNameManual?: boolean
  createdAt: string
  updatedAt: string
  lead?: { name: string } | null
  client?: { name: string } | null
  messages?: Message[]
}

export interface Message {
  id: string
  conversationId: string
  content: string
  direction: MessageDirection
  sentAt: string
  senderName?: string | null
}
