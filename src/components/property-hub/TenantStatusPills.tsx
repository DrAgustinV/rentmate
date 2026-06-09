import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TenantFilter } from "@/lib/tenantFilterUtils";

interface TenantStatusPillsProps {
  value: TenantFilter;
  onChange: (v: TenantFilter) => void;
}

const pillKeys: { value: TenantFilter; key: string }[] = [
  { value: "current", key: "propertyHub.filter.current" },
  { value: "next", key: "propertyHub.filter.next" },
  { value: "historic", key: "propertyHub.filter.historic" },
  { value: "all", key: "propertyHub.filter.all" },
];

export function TenantStatusPills({ value, onChange }: TenantStatusPillsProps) {
  const { t } = useLanguage();

  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
      {pillKeys.map((pill) => (
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
          {t(pill.key)}
        </Button>
      ))}
    </div>
  );
}
