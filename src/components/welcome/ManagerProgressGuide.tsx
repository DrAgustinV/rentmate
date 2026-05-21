import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ArrowRight, Check, Loader2 } from "lucide-react";

function StepDot({ label, index, completed, isCurrent, onClick }: { label: string; index: number; completed: boolean; isCurrent: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-all shrink-0",
        completed && "bg-green-500 text-white",
        isCurrent && !completed && "bg-primary text-primary-foreground ring-2 ring-primary/30",
        !completed && !isCurrent && "bg-muted-foreground/30 text-muted-foreground",
      )}
      title={label}
    >
      {completed ? <Check className="h-3.5 w-3.5" /> : index + 1}
    </button>
  );
}

export function ManagerProgressGuide() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  console.log("=== ManagerProgressGuide rendering ===");

  const { data: userId } = useQuery({
    queryKey: ["current-user-id"],
    queryFn: async () => {
      console.log(">>> current-user-id query firing");
      const { data: { session } } = await supabase.auth.getSession();
      console.log(">>> session:", session?.user?.id);
      return session?.user?.id ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

  console.log(">>> userId from query:", userId);

  const { data: progress, isLoading, error } = useQuery({
    queryKey: ["manager-progress", userId],
    queryFn: async () => {
      console.log(">>> manager-progress query firing, userId:", userId);
      if (!userId) return null;

      try {
        const [propertiesResult, profileResult, tenanciesResult, contractsResult] = await Promise.allSettled([
          supabase.from("properties").select("id").eq("manager_id", userId),
          supabase.from("profiles").select("default_rent_settings").eq("id", userId).maybeSingle(),
          supabase.from("property_tenants").select("id").eq("manager_id", userId).neq("tenancy_status", "historic"),
          supabase.from("property_documents").select("id").not("tenancy_id", "is", null).eq("manager_id", userId),
        ]);

        console.log(">>> first batch results:", {
          p: propertiesResult.status,
          pr: profileResult.status,
          t: tenanciesResult.status,
          c: contractsResult.status
        });

        const hasProperties = propertiesResult.status === "fulfilled" ? (propertiesResult.value.data?.length || 0) > 0 : false;
        const propertyIds = propertiesResult.status === "fulfilled" ? propertiesResult.value.data?.map((p: { id: string }) => p.id) || [] : [];
        const hasConfig = profileResult.status === "fulfilled" ? profileResult.value.data?.default_rent_settings != null : false;

        let hasTenancies = false;
        let hasContracts = false;
        if (tenanciesResult.status === "fulfilled") {
          hasTenancies = (tenanciesResult.value.data?.length || 0) > 0;
        }
        if (contractsResult.status === "fulfilled") {
          hasContracts = (contractsResult.value.data?.length || 0) > 0;
        }

        let hasRentAgreements = false;
        let hasPayments = false;
        if (propertyIds.length > 0) {
          const [agreementsResult, paymentsResult] = await Promise.allSettled([
            supabase.from("rent_agreements").select("id").in("property_id", propertyIds).limit(1),
            supabase.from("payments").select("id").in("property_id", propertyIds).limit(1),
          ]);
          console.log(">>> second batch results:", {
            a: agreementsResult.status,
            pay: paymentsResult.status
          });
          if (agreementsResult.status === "fulfilled") hasRentAgreements = (agreementsResult.value.data?.length || 0) > 0;
          if (paymentsResult.status === "fulfilled") hasPayments = (paymentsResult.value.data?.length || 0) > 0;
        }

        const result = { hasProperties, hasConfig, hasTenancies, hasRentAgreements, hasContracts, hasPayments };
        console.log(">>> progress result:", result);
        return result;
      } catch (err) {
        console.error(">>> manager-progress error:", err);
        return null;
      }
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  });

  console.log(">>> render check - userId:", userId, "progress:", progress, "isLoading:", isLoading, "error:", error);

  if (!userId) {
    console.log(">>> returning null (no userId)");
    return null;
  }

  const steps = progress ? [
    { id: "property", labelKey: "welcome.progress.step1AddProperty", actionLabelKey: "welcome.progress.step1AddPropertyAction", path: "/properties", completed: progress.hasProperties },
    { id: "configuration", labelKey: "welcome.progress.step2Configuration", actionLabelKey: "welcome.progress.step2ConfigurationAction", path: "/configuration", completed: progress.hasConfig },
    { id: "tenant", labelKey: "welcome.progress.step3AddTenant", actionLabelKey: "welcome.progress.step3AddTenantAction", path: "/properties", completed: progress.hasTenancies },
    { id: "rent", labelKey: "welcome.progress.step4ConfigureRent", actionLabelKey: "welcome.progress.step4ConfigureRentAction", path: "/properties", completed: progress.hasRentAgreements },
    { id: "contract", labelKey: "welcome.progress.step5UploadContract", actionLabelKey: "welcome.progress.step5UploadContractAction", path: "/properties", completed: progress.hasContracts },
    { id: "payments", labelKey: "welcome.progress.step6TrackPayments", actionLabelKey: "welcome.progress.step6TrackPaymentsAction", path: "/properties", completed: progress.hasPayments },
  ] : null;

  console.log(">>> about to render - userId:", userId, "progress:", !!progress);

  if (!steps) {
    console.log(">>> steps is null, showing loading state. userId =", userId, "progress =", progress);
    return (
      <div className="border-b border-primary/20 bg-primary/5">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading guide...
          </div>
        </div>
      </div>
    );
  }

  const completedCount = steps.filter((s) => s.completed).length;
  if (completedCount === steps.length) return null;

  const currentIndex = steps.findIndex((s) => !s.completed);
  const currentStep = steps[currentIndex];

  return (
    <div className="border-b border-primary/20 bg-primary/5">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs font-semibold text-primary whitespace-nowrap hidden sm:inline">
              {t("welcome.progress.title")}
            </span>
            <div className="flex items-center gap-1.5">
              {steps.map((step, idx) => (
                <div key={step.id} className="flex items-center gap-1.5">
                  {idx > 0 && (
                    <div className={cn("w-4 h-0.5", steps[idx - 1].completed ? "bg-green-400" : "bg-muted-foreground/20")} />
                  )}
                  <StepDot
                    label={t(step.labelKey)}
                    index={idx}
                    completed={step.completed}
                    isCurrent={idx === currentIndex}
                    onClick={() => navigate(step.path)}
                  />
                </div>
              ))}
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {completedCount}/{steps.length}
            </span>
          </div>

          <div className="flex items-center gap-2 min-w-0">
            {currentStep && (
              <>
                <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">
                  {t("welcome.progress.next")}
                </span>
                <span className="text-xs font-medium whitespace-nowrap hidden sm:inline">
                  {t(currentStep.labelKey)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1 shrink-0 hidden sm:inline-flex"
                  onClick={() => navigate(currentStep.path)}
                >
                  {t(currentStep.actionLabelKey)}
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
