import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle2,
  Circle,
  Mail,
  Shield,
  FileSignature,
  Banknote,
  ChevronRight,
  PartyPopper,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TenantOnboardingChecklistProps {
  tenancyId: string;
  propertyId: string;
  onScrollToContract?: () => void;
  onSwitchToPayments?: () => void;
}

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  isRequired: boolean;
  isCompleted: boolean;
  action?: () => void;
  actionLabel?: string;
}

export function TenantOnboardingChecklist({
  tenancyId,
  propertyId,
  onScrollToContract,
  onSwitchToPayments,
}: TenantOnboardingChecklistProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Fetch current user's profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["current-user-profile-checklist"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("email_verified, kyc_status")
        .eq("id", user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch tenancy requirements
  const { data: requirements, isLoading: requirementsLoading } = useQuery({
    queryKey: ["tenancy-requirements-checklist", tenancyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenancy_requirements")
        .select("require_email_verification, require_kyc_verification, contract_method")
        .eq("tenancy_id", tenancyId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenancyId,
  });

  // Fetch contract signature status
  const { data: contractSignature, isLoading: signatureLoading } = useQuery({
    queryKey: ["contract-signature-checklist", tenancyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_signatures")
        .select("workflow_status, tenant_signed_at")
        .eq("tenancy_id", tenancyId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenancyId,
  });

  // Fetch rent agreement for IBAN
  const { data: rentAgreement, isLoading: agreementLoading } = useQuery({
    queryKey: ["rent-agreement-checklist", tenancyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rent_agreements")
        .select("tenant_iban")
        .eq("tenancy_id", tenancyId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenancyId,
  });

  const isLoading = profileLoading || requirementsLoading || signatureLoading || agreementLoading;

  if (isLoading) {
    return null; // Don't show skeleton, just wait
  }

  // Build checklist items based on requirements
  const items: ChecklistItem[] = [];

  // Email verification
  if (requirements?.require_email_verification) {
    items.push({
      id: "email",
      label: t("onboarding.checklist.emailVerification"),
      description: t("onboarding.checklist.emailVerificationDesc"),
      isRequired: true,
      isCompleted: profile?.email_verified === true,
      action: !profile?.email_verified ? () => navigate("/account") : undefined,
      actionLabel: t("onboarding.checklist.verifyEmail"),
    });
  }

  // KYC verification
  if (requirements?.require_kyc_verification) {
    items.push({
      id: "kyc",
      label: t("onboarding.checklist.identityVerification"),
      description: t("onboarding.checklist.identityVerificationDesc"),
      isRequired: true,
      isCompleted: profile?.kyc_status === "verified",
      action: profile?.kyc_status !== "verified" ? () => navigate("/account") : undefined,
      actionLabel: t("onboarding.checklist.verifyIdentity"),
    });
  }

  // Contract signing
  if (requirements?.contract_method === "digital") {
    const isContractSigned = contractSignature?.tenant_signed_at != null;
    items.push({
      id: "contract",
      label: t("onboarding.checklist.contractSigning"),
      description: t("onboarding.checklist.contractSigningDesc"),
      isRequired: true,
      isCompleted: isContractSigned,
      action: !isContractSigned ? onScrollToContract : undefined,
      actionLabel: t("onboarding.checklist.signContract"),
    });
  }

  // IBAN setup (only if automated payments)
  // For now, always show if there's a rent agreement
  if (rentAgreement) {
    items.push({
      id: "iban",
      label: t("onboarding.checklist.bankSetup"),
      description: t("onboarding.checklist.bankSetupDesc"),
      isRequired: false, // Optional
      isCompleted: !!rentAgreement.tenant_iban,
      action: !rentAgreement.tenant_iban ? onSwitchToPayments : undefined,
      actionLabel: t("onboarding.checklist.setupBank"),
    });
  }

  // Don't show checklist if no items or all complete
  if (items.length === 0) return null;

  const completedCount = items.filter((item) => item.isCompleted).length;
  const progress = Math.round((completedCount / items.length) * 100);
  const allComplete = completedCount === items.length;

  // Don't show if all items are complete
  if (allComplete) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {allComplete ? (
              <PartyPopper className="h-5 w-5 text-green-500" />
            ) : (
              <Circle className="h-5 w-5 text-primary" />
            )}
            {t("onboarding.checklist.title")}
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {completedCount} / {items.length} {t("onboarding.checklist.completed")}
          </span>
        </div>
        <Progress value={progress} className="h-2 mt-2" />
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex items-center justify-between p-3 rounded-lg border transition-colors",
              item.isCompleted
                ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                : "bg-background border-border"
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex-shrink-0",
                  item.isCompleted ? "text-green-600" : "text-muted-foreground"
                )}
              >
                {item.isCompleted ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : item.id === "email" ? (
                  <Mail className="h-5 w-5" />
                ) : item.id === "kyc" ? (
                  <Shield className="h-5 w-5" />
                ) : item.id === "contract" ? (
                  <FileSignature className="h-5 w-5" />
                ) : (
                  <Banknote className="h-5 w-5" />
                )}
              </div>
              <div>
                <p
                  className={cn(
                    "font-medium text-sm",
                    item.isCompleted && "line-through text-muted-foreground"
                  )}
                >
                  {item.label}
                  {!item.isRequired && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({t("common.optional")})
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            </div>
            {!item.isCompleted && item.action && (
              <Button size="sm" variant="outline" onClick={item.action} className="flex-shrink-0">
                {item.actionLabel}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
