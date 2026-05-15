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
    variant: "default", 
    className: "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/10", 
    icon: CheckCircle2,
    defaultLabel: "Active"
  },
  pending: { 
    variant: "default", 
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/10", 
    icon: Clock,
    defaultLabel: "Pending"
  },
  ending_tenancy: { 
    variant: "default", 
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/10", 
    icon: Clock,
    defaultLabel: "Ending"
  },
  historic: { 
    variant: "secondary", 
    className: "text-gray-600 border-gray-200", 
    icon: History,
    defaultLabel: "Historic"
  },
  draft: { 
    variant: "default", 
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20", 
    icon: FileText,
    defaultLabel: "Draft"
  },
  sent: { 
    variant: "default", 
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20", 
    icon: Send,
    defaultLabel: "Sent"
  },
  locked: { 
    variant: "default", 
    className: "bg-green-500/10 text-green-600 border-green-500/20", 
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
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20", 
    icon: FileText,
    defaultLabel: "Version"
  },
  completed: { 
    variant: "default", 
    className: "bg-green-600 hover:bg-green-700", 
    icon: CheckCircle2,
    defaultLabel: "Completed"
  },
  in_progress: { 
    variant: "outline", 
    className: "text-blue-600 border-blue-300", 
    icon: Clock,
    defaultLabel: "In Progress"
  },
  pending_signatures: { 
    variant: "outline", 
    className: "text-yellow-600 border-yellow-300", 
    icon: Clock,
    defaultLabel: "Pending Signatures"
  },
  open: { 
    variant: "default", 
    className: "bg-blue-500 hover:bg-blue-600", 
    icon: AlertCircle,
    defaultLabel: "Open"
  },
  resolved: { 
    variant: "default", 
    className: "bg-green-500 hover:bg-green-600", 
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