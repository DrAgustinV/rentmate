import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-gradient-to-r from-primary to-primary-hover text-primary-foreground hover:shadow-glow hover:scale-105",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-sm",
        destructive: "border-transparent bg-gradient-to-r from-destructive to-destructive/90 text-destructive-foreground hover:shadow-md hover:scale-105",
        outline: "text-foreground hover:bg-accent/50 hover:text-accent-foreground",
        success: "border-transparent bg-success text-success-foreground hover:bg-success/90",
        warning: "border-transparent bg-warning text-warning-foreground hover:bg-warning/90",
        info: "border-transparent bg-info text-info-foreground hover:bg-info/90",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge };
// eslint-disable-next-line react-refresh/only-export-components
export { badgeVariants };
