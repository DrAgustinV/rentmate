import { LucideIcon, CheckCircle2, Clock, AlertCircle, XCircle, FileText, Send, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType = 
  | 'active' 
  | 'pending' 
  | 'ending_tenancy' 
  | 'historic' 
  | 'draft' 
  | 'sent'
  | 'locked'
  | 'readonly'
  | 'version'
  | 'completed'
  | 'in_progress'
  | 'pending_signatures'
  | 'open'
  | 'resolved'
  | 'cancelled';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  showDot?: boolean;
  className?: string;
}

const statusConfig: Record<StatusType, { 
  variant: "default" | "secondary" | "outline" | "destructive";
  className: string;
  icon: LucideIcon;
  defaultLabel: string;
}> = {
  active: { 
    variant: "outline", 
    className: "text-muted-foreground", 
    icon: CheckCircle2,
    defaultLabel: "Active"
  },
  pending: { 
    variant: "outline", 
    className: "text-muted-foreground", 
    icon: Clock,
    defaultLabel: "Pending"
  },
  ending_tenancy: { 
    variant: "outline", 
    className: "text-muted-foreground", 
    icon: Clock,
    defaultLabel: "Active (leaving)"
  },
  historic: { 
    variant: "outline", 
    className: "text-muted-foreground", 
    icon: History,
    defaultLabel: "Ended"
  },
  draft: { 
    variant: "default", 
    className: "bg-warning/10 text-warning border-warning/20", 
    icon: FileText,
    defaultLabel: "Draft"
  },
  sent: { 
    variant: "default", 
    className: "bg-info/10 text-info border-info/20", 
    icon: Send,
    defaultLabel: "Sent"
  },
  locked: { 
    variant: "default", 
    className: "bg-success/10 text-success border-success/20", 
    icon: CheckCircle2,
    defaultLabel: "Locked"
  },
  readonly: { 
    variant: "secondary", 
    className: "text-muted-foreground", 
    icon: FileText,
    defaultLabel: "Read Only"
  },
  version: { 
    variant: "default", 
    className: "bg-info/10 text-info border-info/20", 
    icon: FileText,
    defaultLabel: "Version"
  },
  completed: { 
    variant: "default", 
    className: "bg-success hover:bg-success/80", 
    icon: CheckCircle2,
    defaultLabel: "Completed"
  },
  in_progress: { 
    variant: "outline", 
    className: "text-info border-info/30", 
    icon: Clock,
    defaultLabel: "In Progress"
  },
  pending_signatures: { 
    variant: "outline", 
    className: "text-warning border-warning/30", 
    icon: Clock,
    defaultLabel: "Pending Signatures"
  },
  open: { 
    variant: "default", 
    className: "bg-info hover:bg-info/80", 
    icon: AlertCircle,
    defaultLabel: "Open"
  },
  resolved: { 
    variant: "default", 
    className: "bg-success hover:bg-success/80", 
    icon: CheckCircle2,
    defaultLabel: "Resolved"
  },
  cancelled: { 
    variant: "secondary", 
    className: "text-muted-foreground", 
    icon: XCircle,
    defaultLabel: "Cancelled"
  },
};

export function StatusBadge({ 
  status, 
  label, 
  showDot = true,
  className 
}: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;
  
  return (
    <Badge 
      variant={config.variant} 
      className={cn(
        "text-xs font-medium px-2.5 py-1 h-auto border",
        config.className,
        className
      )}
    >
      {showDot && <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70" />}
      {label || config.defaultLabel}
    </Badge>
  );
}