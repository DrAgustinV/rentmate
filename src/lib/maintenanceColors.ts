export const priorityColors: Record<string, string> = {
  low: "bg-info/10 text-info border-info/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  high: "bg-warning/10 text-warning border-warning/20",
  urgent: "bg-destructive/10 text-destructive border-destructive/20",
};

export const typeColors: Record<string, string> = {
  maintenance: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  repair: "bg-destructive/10 text-destructive border-destructive/20",
  inspection: "bg-info/10 text-info border-info/20",
  cleaning: "bg-success/10 text-success border-success/20",
  other: "bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20",
};
