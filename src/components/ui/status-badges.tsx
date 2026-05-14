import { memo } from "react";
import { Badge, badgeVariants, BadgeProps } from "@/components/ui/badge";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const occupancyBadgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200",
  {
    variants: {
      variant: {
        vacant: "border-transparent bg-blue-500 text-white hover:bg-blue-600",
        active: "border-transparent bg-green-500 text-white hover:bg-green-600",
        ending: "border-transparent bg-amber-500 text-white hover:bg-amber-600",
        historic: "border-transparent bg-gray-500 text-white hover:bg-gray-600",
      },
    },
    defaultVariants: {
      variant: "vacant",
    },
  }
);

interface OccupancyBadgeProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "variant">,
    VariantProps<typeof occupancyBadgeVariants> {
  status: "Vacant" | "Active" | "Ending" | "Historic";
}

export const OccupancyBadge = memo(function OccupancyBadge({ status, className, ...props }: OccupancyBadgeProps) {
  const variant = status.toLowerCase() as "vacant" | "active" | "ending" | "historic";
  return (
    <span className={cn(occupancyBadgeVariants({ variant }), className)} {...props}>
      {status}
    </span>
  );
});

const paymentBadgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200",
  {
    variants: {
      variant: {
        paid: "border-transparent bg-green-500 text-white hover:bg-green-600",
        due: "border-transparent bg-blue-500 text-white hover:bg-blue-600",
        partial: "border-transparent bg-amber-500 text-white hover:bg-amber-600",
        overdue: "border-transparent bg-red-500 text-white hover:bg-red-600",
        "no-rent": "border-transparent bg-gray-400 text-white hover:bg-gray-500",
        closed: "border-transparent bg-gray-400 text-white hover:bg-gray-500",
      },
    },
    defaultVariants: {
      variant: "due",
    },
  }
);

interface PaymentBadgeProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "variant">,
    VariantProps<typeof paymentBadgeVariants> {
  status: "Paid" | "Due" | "Partial" | "Overdue" | "No rent" | "Closed";
}

export const PaymentBadge = memo(function PaymentBadge({ status, className, ...props }: PaymentBadgeProps) {
  const variantKey = status.toLowerCase().replace(" ", "-") as "paid" | "due" | "partial" | "overdue" | "no-rent" | "closed";
  return (
    <span className={cn(paymentBadgeVariants({ variant: variantKey }), className)} {...props}>
      {status}
    </span>
  );
});

interface TicketCountProps extends React.HTMLAttributes<HTMLSpanElement> {
  count: number;
}

export const TicketCount = memo(function TicketCount({ count, className, ...props }: TicketCountProps) {
  if (count === 0) {
    return (
      <span className={cn("text-muted-foreground", className)} {...props}>
        0
      </span>
    );
  }
  return (
    <span className={cn("font-medium text-amber-600", className)} {...props}>
      {count}
    </span>
  );
});