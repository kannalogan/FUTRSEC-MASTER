import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "whitespace-nowrap inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-ring/50 focus:ring-offset-1",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-sm hover:shadow-md hover:brightness-110",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:shadow-sm hover:brightness-105",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-sm hover:shadow-md hover:brightness-110",
        outline: "text-foreground border [border-color:var(--badge-outline)] hover:bg-accent/50 hover:text-accent-foreground",
        success: "border-transparent bg-success/15 text-success hover:bg-success/25 hover:shadow-sm",
        warning: "border-transparent bg-warning/15 text-warning hover:bg-warning/25 hover:shadow-sm",
        info: "border-transparent bg-info/15 text-info hover:bg-info/25 hover:shadow-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
