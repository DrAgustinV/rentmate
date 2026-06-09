import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  variant?: 'default' | 'error' | 'info';
  size?: 'compact' | 'default' | 'large';
}

const sizeConfig = {
  compact: { icon: 'h-8 w-8', padding: 'py-8', title: 'text-base' },
  default: { icon: 'h-12 w-12', padding: 'py-12', title: 'text-lg' },
  large: { icon: 'h-16 w-16', padding: 'py-16', title: 'text-xl' },
} as const;

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  variant = 'default',
  size = 'default',
}: EmptyStateProps) => {
  const iconColorClass = variant === 'error'
    ? 'text-destructive'
    : variant === 'info'
    ? 'text-primary'
    : 'text-muted-foreground';

  const dims = sizeConfig[size];

  return (
    <Card>
      <CardContent
        className={cn(dims.padding, "text-center animate-fade-in")}
        role="status"
        aria-live="polite"
      >
        <Icon
          className={cn("mx-auto mb-4 opacity-50", dims.icon, iconColorClass)}
          aria-hidden="true"
        />
        <h3 className={cn("font-semibold mb-2", dims.title)}>{title}</h3>
        {description && <p className="text-muted-foreground mb-4">{description}</p>}
        {action && <div className="mt-6">{action}</div>}
      </CardContent>
    </Card>
  );
};
