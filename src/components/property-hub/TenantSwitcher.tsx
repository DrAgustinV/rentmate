import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { LogOut, LogIn, History } from "lucide-react";
import { format } from "date-fns";

interface Tenant {
  id: string;
  tenant_id: string;
  tenancy_status: 'active' | 'ending_tenancy' | 'historic';
  started_at: string;
  ended_at: string | null;
  planned_ending_date?: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

interface TenantSwitcherProps {
  tenants: Tenant[];
  selectedTenantId: string;
  onSelectTenant: (tenantId: string) => void;
  onViewHistoric?: () => void;
}

export function TenantSwitcher({ tenants, selectedTenantId, onSelectTenant, onViewHistoric }: TenantSwitcherProps) {
  const { t } = useLanguage();

  const getTenantName = (tenant: Tenant) => {
    if (tenant.first_name && tenant.last_name) {
      return `${tenant.first_name} ${tenant.last_name}`;
    }
    if (tenant.first_name) return tenant.first_name;
    return tenant.email;
  };

  const departingTenant = tenants.find(t => t.tenancy_status === 'ending_tenancy');
  const incomingTenant = tenants.find(t => t.tenancy_status === 'active');
  const historicTenants = tenants.filter(t => t.tenancy_status === 'historic');

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {/* {departingTenant && (
        <button
          onClick={() => onSelectTenant(departingTenant.id)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
            selectedTenantId === departingTenant.id
              ? "border-warning bg-warning/10 shadow-sm"
              : "border-border hover:border-warning/50 hover:bg-warning/5"
          )}
        >
          <LogOut className="h-4 w-4 text-warning" />
          <span className="text-sm font-medium">{getTenantName(departingTenant)}</span>
          <Badge variant="outline" className="text-xs border-warning text-warning">
            {t('tenancy.departing')}
          </Badge>
          {departingTenant.planned_ending_date && (
            <span className="text-xs text-muted-foreground">
              {format(new Date(departingTenant.planned_ending_date), 'MMM d')}
            </span>
          )}
        </button>
      )} */}

      {incomingTenant && (
        <button
          onClick={() => onSelectTenant(incomingTenant.id)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
            selectedTenantId === incomingTenant.id
              ? "border-success bg-success/10 shadow-sm"
              : "border-border hover:border-success/50 hover:bg-success/5"
          )}
        >
          <LogIn className="h-4 w-4 text-success" />
          <span className="text-sm font-medium">{getTenantName(incomingTenant)}</span>
          <Badge variant="outline" className="text-xs border-success text-success">
            {t('tenancy.incoming')}
          </Badge>
        </button>
      )}

      {/* {historicTenants.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={onViewHistoric}
          className="flex items-center gap-2"
        >
          <History className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {t("propertyTenants.tabs.historic")} ({historicTenants.length})
          </span>
        </Button>
      )} */}
    </div>
  );
}
