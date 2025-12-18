import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { LogOut, LogIn, History } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

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
}

export function TenantSwitcher({ tenants, selectedTenantId, onSelectTenant }: TenantSwitcherProps) {
  const { t } = useLanguage();
  const [showAllHistoric, setShowAllHistoric] = useState(false);

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
  const visibleHistoricTenants = showAllHistoric ? historicTenants : historicTenants.slice(0, 3);
  const hasMoreHistoric = historicTenants.length > 3;

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {departingTenant && (
        <button
          onClick={() => onSelectTenant(departingTenant.id)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
            selectedTenantId === departingTenant.id
              ? "border-amber-500 bg-amber-500/10 shadow-sm"
              : "border-border hover:border-amber-500/50 hover:bg-amber-500/5"
          )}
        >
          <LogOut className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-medium">{getTenantName(departingTenant)}</span>
          <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
            {t('tenancy.departing')}
          </Badge>
          {departingTenant.planned_ending_date && (
            <span className="text-xs text-muted-foreground">
              {format(new Date(departingTenant.planned_ending_date), 'MMM d')}
            </span>
          )}
        </button>
      )}

      {incomingTenant && (
        <button
          onClick={() => onSelectTenant(incomingTenant.id)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
            selectedTenantId === incomingTenant.id
              ? "border-green-500 bg-green-500/10 shadow-sm"
              : "border-border hover:border-green-500/50 hover:bg-green-500/5"
          )}
        >
          <LogIn className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium">{getTenantName(incomingTenant)}</span>
          <Badge variant="outline" className="text-xs border-green-500 text-green-600">
            {t('tenancy.incoming')}
          </Badge>
        </button>
      )}

      {visibleHistoricTenants.map((tenant) => (
        <button
          key={tenant.id}
          onClick={() => onSelectTenant(tenant.id)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
            selectedTenantId === tenant.id
              ? "border-muted-foreground bg-muted shadow-sm"
              : "border-border hover:border-muted-foreground/50 hover:bg-muted/50"
          )}
        >
          <History className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">{getTenantName(tenant)}</span>
          <Badge variant="outline" className="text-xs border-muted-foreground text-muted-foreground">
            {t('tenancy.historic')}
          </Badge>
          {tenant.ended_at && (
            <span className="text-xs text-muted-foreground">
              {format(new Date(tenant.ended_at), 'MMM yyyy')}
            </span>
          )}
        </button>
      ))}

      {hasMoreHistoric && !showAllHistoric && (
        <button
          onClick={() => setShowAllHistoric(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border hover:border-muted-foreground/50 hover:bg-muted/30 transition-all"
        >
          <span className="text-xs text-muted-foreground">
            +{historicTenants.length - 3} {t('tenancy.viewAllHistory')}
          </span>
        </button>
      )}
    </div>
  );
}
