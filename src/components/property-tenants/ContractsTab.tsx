import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { CalendarX, CalendarCheck } from "lucide-react";
import { TenancyOverviewCard } from "@/components/property-tenants/TenancyOverviewCard";
import { formatDate } from "@/lib/dateUtils";

interface Tenant {
  id: string;
  tenant_id?: string;
  tenancy_status: "active" | "ending_tenancy" | "historic" | "pending";
  started_at?: string;
  ended_at?: string | null;
  planned_ending_date?: string | null;
  email?: string;
  first_name?: string | null;
  last_name?: string | null;
  notes?: string | null;
  avatar_url?: string | null;
  kyc_status?: string | null;
  manager_tenant_name?: string | null;
  manager_tenant_surname?: string | null;
  manager_tenant_phone?: string | null;
}

interface Invitation {
  id: string;
  email: string;
  status: string;
  expires_at: string;
  created_at: string;
  decline_reason?: string | null;
  declined_at?: string | null;
  tenancy_requirements_id?: string | null;
}

interface PendingRequirement {
  id: string;
  status: string;
  tenant_email?: string;
  tenancy_id?: string;
  rent_amount_cents?: number;
  security_deposit_cents?: number;
  currency?: string;
  payment_day?: number;
}

interface ContractsTabProps {
  allTenants: Tenant[];
  tenant: {
    currentTenant: (Tenant & { id: string; email: string }) | null;
    propertyId: string;
    userRole: { isManager?: boolean; isTenant?: boolean } | null;
    isReadOnly: boolean;
  };
  setupState?: {
    pendingRequirement?: PendingRequirement | null;
    canSetupNewTenancy?: boolean;
    hasEndingTenancy?: boolean;
    isDeleting?: boolean;
    isResending?: boolean;
    isDismissing?: boolean;
  };
  callbacks?: {
    onStartSetup?: () => void;
    onSendInvitation?: () => void;
    onCancelSetup?: () => void;
    onResendInvitation?: (id: string) => void;
    onEditTenant?: (tenant: Tenant) => void;
    onEndTenancy?: (tenant: Tenant) => void;
    onFinalizeTenancy?: (tenant: Tenant) => void;
    setCancellingInvitation?: (inv: Invitation | null) => void;
    onEditAndResend?: (inv: Invitation) => void;
    onDismissInvitation?: (inv: Invitation) => void;
    onBulkDismissDeclined?: (invs: Invitation[]) => void;
    onEditRentalTerms?: () => void;
    onInviteInSelfManaged?: () => void;
  };
}

function TenancyColumnHeader({
  status,
  tenantName,
  dateLabel,
  date,
}: {
  status: "ending" | "incoming";
  tenantName: string;
  dateLabel: string;
  date?: string;
}) {
  const cfg =
    status === "ending"
      ? {
          Icon: CalendarX,
          label: "Ending tenancy",
          bg: "bg-amber-50 dark:bg-amber-950/30",
          border: "border-amber-200 dark:border-amber-800",
          iconCls: "text-amber-600 dark:text-amber-400",
          textCls: "text-amber-700 dark:text-amber-300",
        }
      : {
          Icon: CalendarCheck,
          label: "Incoming tenancy",
          bg: "bg-blue-50 dark:bg-blue-950/30",
          border: "border-blue-200 dark:border-blue-800",
          iconCls: "text-blue-600 dark:text-blue-400",
          textCls: "text-blue-700 dark:text-blue-300",
        };

  return (
    <div className={`flex items-center gap-2 px-4 py-3 ${cfg.bg} border-b ${cfg.border}`}>
      <cfg.Icon className={`h-4 w-4 flex-shrink-0 ${cfg.iconCls}`} />
      <div className="flex flex-col min-w-0">
        <span className={`font-semibold text-sm ${cfg.textCls}`}>{cfg.label}</span>
        <span className="text-xs text-muted-foreground truncate">{tenantName}</span>
      </div>
      {date && (
        <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
          {dateLabel}: {formatDate(date)}
        </span>
      )}
    </div>
  );
}

export function ContractsTab({
  allTenants,
  tenant,
  setupState = {},
  callbacks = {},
}: ContractsTabProps) {
  const { t } = useLanguage();
  const [mobileFocusedId, setMobileFocusedId] = useState<string | null>(null);

  const { propertyId, userRole } = tenant;
  const {
    pendingRequirement,
    canSetupNewTenancy,
    isDeleting = false,
    isResending = false,
    isDismissing = false,
  } = setupState;

  const endingTenant =
    allTenants.find((t) => t.tenancy_status === "ending_tenancy") ?? null;

  const incomingTenant =
    allTenants.find(
      (t) =>
        t.tenancy_status === "pending" ||
        (t.tenancy_status === "active" && t.id !== endingTenant?.id)
    ) ?? null;

  const activeSoloTenant = !endingTenant
    ? (allTenants.find((t) => t.tenancy_status === "active") ?? null)
    : null;

  const isTransition = !!endingTenant;

  const mobileTenants = [endingTenant, incomingTenant].filter(Boolean) as Tenant[];
  const mobileFocused =
    mobileTenants.find((t) => t.id === mobileFocusedId) ?? mobileTenants[0] ?? null;

  const getDisplayName = (t: Tenant | null) => {
    if (!t) return "—";
    if (t.tenancy_status === "pending") return t.email || t.manager_tenant_name || "Pending";
    return (
      `${t.first_name || t.manager_tenant_name || ""} ${
        t.last_name || t.manager_tenant_surname || ""
      }`.trim() || t.email || "—"
    );
  };

  const toSafe = (t: Tenant) => ({
    ...t,
    id: t.id || "",
    email: t.email || "Pending",
    first_name: t.first_name ?? null,
    last_name: t.last_name ?? null,
  });

  const makeCardProps = (focusTenant: Tenant) => ({
    currentTenant: toSafe(focusTenant),
    propertyId,
    userRole,
    isReadOnly: false,
    tenancyId: focusTenant.id,
    tenancyStatus: focusTenant.tenancy_status,
    pendingRequirement:
      focusTenant.tenancy_status === "pending" ||
      focusTenant.tenancy_status === "ending_tenancy"
        ? pendingRequirement
        : null,
    canSetupNewTenancy:
      !focusTenant || ["pending", "ending_tenancy"].includes(focusTenant.tenancy_status),
    hasEndingTenancy: focusTenant.tenancy_status === "ending_tenancy",
    isDeleting,
    isResending,
    isDismissing,
    hideHeader: true,
    ...callbacks,
  });

  if (!endingTenant && !activeSoloTenant && !incomingTenant) {
    return (
      <TenancyOverviewCard
        currentTenant={null}
        propertyId={propertyId}
        userRole={userRole}
        isReadOnly={false}
        tenancyId={undefined}
        tenancyStatus={undefined}
        pendingRequirement={pendingRequirement ?? null}
        canSetupNewTenancy={canSetupNewTenancy ?? true}
        hasEndingTenancy={false}
        isDeleting={isDeleting}
        isResending={isResending}
        isDismissing={isDismissing}
        hideHeader={false}
        {...callbacks}
      />
    );
  }

  if (!isTransition && activeSoloTenant) {
    return (
      <TenancyOverviewCard
        currentTenant={toSafe(activeSoloTenant)}
        propertyId={propertyId}
        userRole={userRole}
        isReadOnly={false}
        tenancyId={activeSoloTenant.id}
        tenancyStatus={activeSoloTenant.tenancy_status}
        pendingRequirement={pendingRequirement ?? null}
        canSetupNewTenancy={canSetupNewTenancy ?? false}
        hasEndingTenancy={false}
        isDeleting={isDeleting}
        isResending={isResending}
        isDismissing={isDismissing}
        hideHeader={false}
        {...callbacks}
      />
    );
  }

  return (
    <div className="space-y-4">
      {mobileTenants.length > 0 && (
        <div className="flex md:hidden gap-2 p-1 bg-muted rounded-lg">
          {mobileTenants.map((t) => {
            const isEnding = t.tenancy_status === "ending_tenancy";
            const isFocused = mobileFocused?.id === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setMobileFocusedId(t.id)}
                className={[
                  "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-all",
                  isFocused
                    ? isEnding
                      ? "bg-white dark:bg-background text-amber-700 dark:text-amber-300 shadow-sm"
                      : "bg-white dark:bg-background text-blue-700 dark:text-blue-300 shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {isEnding ? (
                  <CalendarX className="h-3.5 w-3.5 flex-shrink-0" />
                ) : (
                  <CalendarCheck className="h-3.5 w-3.5 flex-shrink-0" />
                )}
                <span className="truncate max-w-[130px]">{getDisplayName(t)}</span>
              </button>
            );
          })}
          {!incomingTenant && canSetupNewTenancy && (
            <button
              onClick={callbacks.onStartSetup}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 border border-dashed border-blue-300 dark:border-blue-700"
            >
              <CalendarCheck className="h-3.5 w-3.5 flex-shrink-0" />
              <span>+ Incoming</span>
            </button>
          )}
        </div>
      )}

      {mobileFocused && (
        <div
          className={`md:hidden rounded-lg overflow-hidden border-2 ${
            mobileFocused.tenancy_status === "ending_tenancy"
              ? "border-amber-200 dark:border-amber-800"
              : "border-blue-200 dark:border-blue-800"
          }`}
        >
          <TenancyColumnHeader
            status={mobileFocused.tenancy_status === "ending_tenancy" ? "ending" : "incoming"}
            tenantName={getDisplayName(mobileFocused)}
            dateLabel={mobileFocused.tenancy_status === "ending_tenancy" ? "Ends" : "Starts"}
            date={
              mobileFocused.tenancy_status === "ending_tenancy"
                ? mobileFocused.planned_ending_date || mobileFocused.ended_at || undefined
                : mobileFocused.started_at || undefined
            }
          />
          <TenancyOverviewCard {...makeCardProps(mobileFocused)} />
        </div>
      )}

      <div className="hidden md:grid md:grid-cols-2 gap-4">
        {endingTenant && (
          <div className="rounded-lg overflow-hidden border-2 border-amber-200 dark:border-amber-800">
            <TenancyColumnHeader
              status="ending"
              tenantName={getDisplayName(endingTenant)}
              dateLabel="Ends"
              date={endingTenant.planned_ending_date || endingTenant.ended_at || undefined}
            />
            <TenancyOverviewCard {...makeCardProps(endingTenant)} />
          </div>
        )}

        {incomingTenant ? (
          <div className="rounded-lg overflow-hidden border-2 border-blue-200 dark:border-blue-800">
            <TenancyColumnHeader
              status="incoming"
              tenantName={getDisplayName(incomingTenant)}
              dateLabel="Starts"
              date={incomingTenant.started_at || undefined}
            />
            <TenancyOverviewCard {...makeCardProps(incomingTenant)} />
          </div>
        ) : canSetupNewTenancy ? (
          <div className="rounded-lg border-2 border-dashed border-blue-200 dark:border-blue-800 p-8 flex flex-col items-center justify-center gap-4 text-center min-h-[200px]">
            <div className="h-12 w-12 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
              <CalendarCheck className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="font-semibold text-sm">
                {t("tenancy.noIncomingTenancy") || "No incoming tenancy yet"}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                {t("tenancy.prepareNextHint") ||
                  "Prepare the next tenant while the current one is finishing."}
              </p>
            </div>
            <button
              onClick={callbacks.onStartSetup}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
            >
              + {t("tenancy.prepareNextTenancy") || "Prepare next tenancy"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}