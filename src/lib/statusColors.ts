export const ticketStatusColors: Record<string, string> = {
  open: "bg-info/10 text-info border-info/20",
  in_progress: "bg-warning/10 text-warning border-warning/20",
  resolved: "bg-success/10 text-success border-success/20",
  cancelled: "bg-muted text-muted-foreground border-border",
};

export const ticketPriorityColors: Record<string, string> = {
  low: "bg-info/10 text-info border-info/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  high: "bg-warning/10 text-warning border-warning/20",
  urgent: "bg-destructive/10 text-destructive border-destructive/20",
};
