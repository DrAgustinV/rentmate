import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight } from "lucide-react";

function StepPill({ label, tooltip, path }: { label: string; tooltip: string; path: string }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(path)}
      className="px-3 py-1 rounded-full text-xs font-medium bg-muted text-foreground cursor-pointer shrink-0 whitespace-nowrap hover:bg-accent hover:text-accent-foreground transition-colors"
      title={tooltip}
    >
      {label}
    </button>
  );
}

export function ManagerProgressGuide() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const { data: userId } = useQuery({
    queryKey: ["current-user-id"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.user?.id ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: hasProperties } = useQuery({
    queryKey: ["manager-has-properties", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase.from("properties").select("id").eq("manager_id", userId).limit(1);
      return (data?.length || 0) > 0;
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  });

  if (!userId) return null;

  const steps = [
    { id: "property", labelKey: "welcome.progress.stepAddProperty", actionLabelKey: "welcome.progress.stepAddPropertyAction", path: "/properties", whyItMattersKey: "welcome.guide.steps.addProperty.whyItMatters" },
    { id: "configuration", labelKey: "welcome.progress.stepConfiguration", actionLabelKey: "welcome.progress.stepConfigurationAction", path: "/configuration", whyItMattersKey: "welcome.guide.steps.configuration.whyItMatters" },
    // { id: "tenant", labelKey: "welcome.progress.stepAddTenant", actionLabelKey: "welcome.progress.stepAddTenantAction", path: "/properties", whyItMattersKey: "welcome.guide.steps.addTenant.whyItMatters" },
    // { id: "rent", labelKey: "welcome.progress.stepConfigureRent", actionLabelKey: "welcome.progress.stepConfigureRentAction", path: "/properties", whyItMattersKey: "welcome.guide.steps.configureRent.whyItMatters" },
    // { id: "contract", labelKey: "welcome.progress.stepUploadContract", actionLabelKey: "welcome.progress.stepUploadContractAction", path: "/properties", whyItMattersKey: "welcome.guide.steps.uploadContract.whyItMatters" },
    // { id: "payments", labelKey: "welcome.progress.stepTrackPayments", actionLabelKey: "welcome.progress.stepTrackPaymentsAction", path: "/properties", whyItMattersKey: "welcome.guide.steps.trackPayments.whyItMatters" },
    { id: "contract", labelKey: "welcome.progress.stepRepair", actionLabelKey: "welcome.progress.stepRepairAction", path: "/configuration?tab=repair-shops", whyItMattersKey: "welcome.guide.steps.repairShops.whyItMatters" },
    { id: "payments", labelKey: "welcome.progress.stepDocs", actionLabelKey: "welcome.progress.stepDocsAction", path: "/configuration?tab=templates", whyItMattersKey: "welcome.guide.steps.trackPayments.whyItMatters" },
    { id: "maintenance", labelKey: "welcome.progress.stepMaintenance", actionLabelKey: "welcome.progress.stepMaintenanceAction", path: "/configuration", whyItMattersKey: "welcome.guide.steps.maintenance.whyItMatters" },
  ];

  const nextAction = hasProperties === true
    ? { labelKey: "welcome.progress.stepAddTenantAction", path: "/properties" }
    : hasProperties === false
    ? { labelKey: "welcome.progress.stepAddPropertyAction", path: "/properties" }
    : null;

  return (
    <div className="border-b border-primary/20 bg-primary/5">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 overflow-x-auto">
            <span className="text-xs font-semibold text-primary whitespace-nowrap hidden sm:inline">
              {t("welcome.progress.title")}
            </span>
            <div className="flex items-center gap-0">
              {steps.map((step, idx) => (
                <div key={step.id} className="flex items-center">
                  <StepPill
                    label={t(step.labelKey)}
                    tooltip={t(step.whyItMattersKey)}
                    path={step.path}
                  />
                  {idx < steps.length - 1 && (
                    <ArrowRight className="h-3 w-3 text-muted-foreground mx-1 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {nextAction && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">
                {t("welcome.progress.next")}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 shrink-0 hidden sm:inline-flex"
                onClick={() => navigate(nextAction.path)}
              >
                {t(nextAction.labelKey)}
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
