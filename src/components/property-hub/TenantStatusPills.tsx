import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TenantFilter } from "@/lib/tenantFilterUtils";

interface TenantStatusPillsProps {
  value: TenantFilter;
  onChange: (v: TenantFilter) => void;
}

const pills: { value: TenantFilter; label: string }[] = [
  { value: "current", label: "Current" },
  { value: "next", label: "Next" },
  { value: "historic", label: "Historic" },
  { value: "all", label: "All" },
];

export function TenantStatusPills({ value, onChange }: TenantStatusPillsProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
      {pills.map((pill) => (
        <Button
          key={pill.value}
          variant="ghost"
          size="sm"
          onClick={() => onChange(pill.value)}
          className={cn(
            "text-xs font-medium px-3 py-1.5 h-auto rounded-md",
            value === pill.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {pill.label}
        </Button>
      ))}
    </div>
  );
}
