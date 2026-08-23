import { Badge } from "@/components/ui/badge"
import type { ClientStatus } from "@/types/models"

interface ClientStatusBadgeProps {
  status: ClientStatus
}

const STATUS_CONFIG: Record<
  ClientStatus,
  { label: string; variant: "success" | "destructive" | "warning" }
> = {
  ACTIVE: { label: "Ativo", variant: "success" },
  CHURN: { label: "Churn", variant: "destructive" },
  NOT_RENEWED: { label: "Não Renovou", variant: "warning" },
}

export function ClientStatusBadge({ status }: ClientStatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}
