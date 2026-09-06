import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-purple-500/10 text-purple-700 border border-purple-500/20",
        success:
          "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20",
        warning:
          "bg-yellow-500/10 text-yellow-700 border border-yellow-500/20",
        destructive:
          "bg-red-500/10 text-red-700 border border-red-500/20",
        outline:
          "border border-gray-300 text-gray-600 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
