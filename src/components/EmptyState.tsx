import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  variant?: 'default' | 'error' | 'info';
}

export const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  action, 
  variant = 'default' 
}: EmptyStateProps) => {
  const iconColorClass = variant === 'error' 
    ? 'text-destructive' 
    : variant === 'info' 
    ? 'text-primary' 
    : 'text-muted-foreground';

  return (
    <Card>
      <CardContent className="py-12 text-center" role="status" aria-live="polite">
        <Icon 
          className={`mx-auto h-12 w-12 mb-4 ${iconColorClass} opacity-50`}
          aria-hidden="true"
        />
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        {description && <p className="text-muted-foreground mb-4">{description}</p>}
        {action && <div className="mt-6">{action}</div>}
      </CardContent>
    </Card>
  );
};
