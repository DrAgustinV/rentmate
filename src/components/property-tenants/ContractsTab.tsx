import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { showToast } from "@/lib/toast";
import {
  Upload,
  FileText,
  ClipboardCheck,
  Settings,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatDate } from "@/lib/dateUtils";
import DocumentActionsMenu from "./DocumentActionsMenu";
import DocumentVersionHistoryModal from "./DocumentVersionHistoryModal";
import { cn } from "@/lib/utils";
import PropertyDocumentUpload from "@/components/PropertyDocumentUpload";
import PropertyDocumentVersionHistory from "@/components/PropertyDocumentVersionHistory";
import { ContractSignatureManager } from "@/components/ContractSignatureManager";
import { TenantOnboardingChecklist } from "./TenantOnboardingChecklist";
import { TenancyOverviewCard } from "./TenancyOverviewCard";
import { ContractCard } from "./ContractCard";
import { TenancyRequirement } from "@/hooks/useTenancyRequirements";
import { InspectionCard } from "@/components/inspection";

interface Tenant {
  id: string;
  tenant_id: string;
  tenancy_status: 'active' | 'ending_tenancy' | 'historic' | 'pending';
  started_at: string;
  ended_at: string | null;
  planned_ending_date?: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  notes: string | null;
  avatar_url?: string | null;
  kyc_status?: string | null;
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

interface TenancyDocument {
  id: string;
  document_title: string;
  file_name: string;
  file_path: string;
  file_size_bytes: number;
  created_at: string;
  uploaded_by: string;
  description: string | null;
  version: number;
  is_latest_version: boolean;
  parent_document_id: string | null;
}

interface ContractsTabProps {
  currentTenant: Tenant | null;
  propertyId: string;
  userRole: { isManager: boolean } | undefined;
  isReadOnly: boolean;
  // Tenancy setup props (manager only)
  pendingRequirement?: TenancyRequirement | null;
  canSetupNewTenancy?: boolean;
  hasEndingTenancy?: boolean;
  onStartSetup?: () => void;
  onSendInvitation?: (req: TenancyRequirement) => void;
  onCancelSetup?: (req: TenancyRequirement) => void;
  onResendInvitation?: (req: TenancyRequirement) => void;
  isDeleting?: boolean;
  isResending?: boolean;
  // Tenant management callbacks
  onEditTenant?: (tenant: Tenant) => void;
  onEndTenancy?: (tenant: Tenant) => void;
  onFinalizeTenancy?: (tenant: Tenant) => void;
  setCancellingInvitation?: (invitation: Invitation | null) => void;
  // Declined invitation callbacks
  onEditAndResend?: (invitation: Invitation) => void;
  onDismissInvitation?: (invitation: Invitation) => void;
  isDismissing?: boolean;
  // Edit handlers
  onEditRentalTerms?: () => void;
  onInviteInSelfManaged?: () => void;
}

export function ContractsTab({
  currentTenant,
  propertyId,
  userRole,
  isReadOnly,
  pendingRequirement,
  canSetupNewTenancy,
  hasEndingTenancy,
  onStartSetup,
  onSendInvitation,
  onCancelSetup,
  onResendInvitation,
  isDeleting,
  isResending,
  onEditTenant,
  onEndTenancy,
  onFinalizeTenancy,
  setCancellingInvitation,
  onEditAndResend,
  onDismissInvitation,
  isDismissing,
  onEditRentalTerms,
  onInviteInSelfManaged,
}: ContractsTabProps) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  
  const [sectionFilter, setSectionFilter] = useState<string>("all");

  // Query tenancy requirements for contract method
  const { data: tenancyRequirements } = useQuery({
    queryKey: ["tenancy-requirements-for-contract", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return null;
      const { data, error } = await supabase
        .from("tenancy_requirements")
        .select("contract_method")
        .eq("tenancy_id", currentTenant.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!currentTenant?.id,
  });

  // Lazy-loaded query for tenancy documents
  const { data: tenancyDocuments, isLoading: docsLoading, refetch: refetchDocuments } = useQuery({
    queryKey: ["tenancy-documents", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      const { data, error } = await supabase
        .from("property_documents")
        .select("*")
        .eq("tenancy_id", currentTenant.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as TenancyDocument[];
    },
    enabled: !!currentTenant,
  });

  // Invitations query (manager only) - includes pending and recently declined
  const { data: invitations } = useQuery({
    queryKey: ["invitations", propertyId],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data, error } = await supabase
        .from("invitations")
        .select("id, email, status, expires_at, created_at, decline_reason, declined_at, tenancy_requirements_id")
        .eq("property_id", propertyId)
        .in("status", ["pending", "declined"])
        .or(`expires_at.gt.${new Date().toISOString()},declined_at.gt.${thirtyDaysAgo.toISOString()}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Invitation[];
    },
    enabled: !!propertyId && userRole?.isManager,
  });

  // Separate pending and declined invitations
  const pendingInvitations = invitations?.filter(inv => inv.status === 'pending') || [];
  const declinedInvitations = invitations?.filter(inv => inv.status === 'declined') || [];

  const deleteDocumentMutation = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase.from("property_documents").delete().eq("id", docId);
      if (error) throw error;
    },
    onSuccess: () => {
      showToast.success({ title: t("properties.propertyDocuments.deleteSuccess") });
      refetchDocuments();
    },
    onError: () => {
      showToast.error({ title: t("properties.propertyDocuments.deleteFailed") });
    },
  });

  const loadTenancyDocuments = async (tenancyId: string) => {
    if (tenancyDocsMap[tenancyId]) return;

    const { data, error } = await supabase
      .from("property_documents")
      .select("*")
      .eq("tenancy_id", tenancyId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTenancyDocsMap((prev) => ({ ...prev, [tenancyId]: data as TenancyDocument[] }));
    }
  };

  const formatFileSize = (bytes: number) => {
    return `${(bytes / 1024).toFixed(2)} KB`;
  };

  const getUploaderName = (doc: TenancyDocument) => {
    return doc.uploaded_by ? "User" : "Unknown";
  };

  const toggleDocumentExpansion = (docTitle: string) => {
    setExpandedDocuments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(docTitle)) {
        newSet.delete(docTitle);
      } else {
        newSet.add(docTitle);
      }
      return newSet;
    });
  };

  const downloadDocument = async (doc: TenancyDocument) => {
    try {
      const { data, error } = await supabase.storage.from('property-documents').download(doc.file_path);
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      showToast.error({ title: t("common.error") });
    }
  };

  const VIEWABLE_EXTENSIONS = ['.pdf', '.txt', '.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];

  const openDocument = async (doc: TenancyDocument) => {
    const extension = doc.file_name.toLowerCase().substring(doc.file_name.lastIndexOf('.'));
    const isViewable = VIEWABLE_EXTENSIONS.includes(extension);
    
    if (isViewable) {
      const newWindow = window.open('', '_blank');
      
      try {
        const { data, error } = await supabase.storage
          .from("property-documents")
          .createSignedUrl(doc.file_path, 3600);
        
        if (error || !data?.signedUrl) {
          newWindow?.close();
          showToast.error({ title: t("properties.openError") });
          return;
        }
        
        if (newWindow) {
          newWindow.location.href = data.signedUrl;
        }
      } catch (error: any) {
        newWindow?.close();
        showToast.error({ title: t("properties.openError") });
      }
    } else {
      downloadDocument(doc);
    }
  };

  const getTenantName = (tenant: Tenant) => {
    if (tenant.first_name && tenant.last_name) {
      return `${tenant.first_name} ${tenant.last_name}`;
    }
    if (tenant.first_name) return tenant.first_name;
    return tenant.email;
  };

  // Group documents by title
  const groupedDocuments = tenancyDocuments?.reduce((acc, doc) => {
    if (!acc[doc.document_title]) {
      acc[doc.document_title] = [];
    }
    acc[doc.document_title].push(doc);
    return acc;
  }, {} as Record<string, TenancyDocument[]>);

  // Get current tenant name for display
  const currentTenantName = currentTenant 
    ? (currentTenant.first_name && currentTenant.last_name 
        ? `${currentTenant.first_name} ${currentTenant.last_name}` 
        : currentTenant.email)
    : undefined;

  // Check if contract is locked (signing initiated or completed)
  const { data: contractSignature } = useQuery({
    queryKey: ["contract-signature-status", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return null;
      const { data } = await supabase
        .from("contract_signatures")
        .select("workflow_status")
        .eq("tenancy_id", currentTenant.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!currentTenant?.id,
  });

  const isContractLocked = !!contractSignature?.workflow_status;

  if (docsLoading && currentTenant) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  const getTenancyStep = () => {
    if (!currentTenant) return 0;
    if (pendingRequirement) {
      if (pendingRequirement.status === 'draft') return 1;
      if (pendingRequirement.status === 'sent') return 2;
    }
    if (currentTenant.tenancy_status === 'active') return 3;
    if (currentTenant.tenancy_status === 'ending_tenancy') return 4;
    if (currentTenant.tenancy_status === 'historic') return 5;
    return 0;
  };

  const tenancyStep = getTenancyStep();

  const steps = [
    { key: 1, label: t("tenancy.wizard.title"), icon: Settings },
    { key: 2, label: t("tenancy.sendInvitation"), icon: Send },
    { key: 3, label: t("tenancy.active"), icon: CheckCircle2 },
    { key: 4, label: t("tenancy.ending"), icon: Clock },
    { key: 5, label: t("tenancy.historic"), icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6">
      {/* Tenancy Progress Stepper */}
      {currentTenant && (
        <div className="bg-gradient-to-r from-muted/50 to-muted/30 rounded-xl p-4 border">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isCompleted = tenancyStep > step.key;
              const isCurrent = tenancyStep === step.key;
              const Icon = step.icon;
              
              return (
                <div key={step.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                      ${isCompleted ? 'bg-green-500 text-white' : ''}
                      ${isCurrent ? 'bg-blue-500 text-white ring-4 ring-blue-500/20' : ''}
                      ${!isCompleted && !isCurrent ? 'bg-muted text-muted-foreground' : ''}
                    `}>
                      {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <span className={`text-xs mt-2 text-center hidden sm:block ${isCurrent ? 'font-semibold text-blue-600' : 'text-muted-foreground'}`}>
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-1 mx-2 rounded ${isCompleted ? 'bg-green-500' : 'bg-muted'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Segmented Control for Section Filter */}
      <div className="flex items-center gap-2">
        <ToggleGroup type="single" value={sectionFilter} onValueChange={(val) => val && setSectionFilter(val)} className="bg-muted p-1 rounded-lg">
          <ToggleGroupItem value="all" className="px-4 py-2 data-[state=on]:bg-background data-[state=on]:shadow-sm" >
            {t("common.all")}
          </ToggleGroupItem>
          <ToggleGroupItem value="tenant" className="px-4 py-2 data-[state=on]:bg-background data-[state=on]:shadow-sm" >
            {t("propertyTenants.tabs.contracts")}
          </ToggleGroupItem>
          <ToggleGroupItem value="documents" className="px-4 py-2 data-[state=on]:bg-background data-[state=on]:shadow-sm" >
            {t("properties.contract")}
          </ToggleGroupItem>
          <ToggleGroupItem value="inspections" className="px-4 py-2 data-[state=on]:bg-background data-[state=on]:shadow-sm" >
            {t("inspections.title")}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* 0. Tenant Onboarding Checklist (tenant only, shows only when items pending) */}
      {(sectionFilter === "all" || sectionFilter === "tenant") && !userRole?.isManager && currentTenant && (
        <TenantOnboardingChecklist
          tenancyId={currentTenant.id}
          propertyId={propertyId}
          onScrollToContract={() => {
            document.getElementById("contract-signature-section")?.scrollIntoView({ behavior: "smooth" });
          }}
          onSwitchToPayments={() => {
            // Parent component handles tab switch
            const paymentsTab = document.querySelector('[data-value="payments"]');
            if (paymentsTab instanceof HTMLElement) paymentsTab.click();
          }}
        />
      )}

      {/* 1. Tenancy Overview Card (Combined) */}
      {(sectionFilter === "all" || sectionFilter === "tenant") && (
        <TenancyOverviewCard
          propertyId={propertyId}
          currentTenant={currentTenant}
          userRole={userRole}
          isReadOnly={isReadOnly}
          tenancyId={currentTenant?.id}
          tenancyStatus={currentTenant?.tenancy_status}
          pendingRequirement={pendingRequirement || null}
          canSetupNewTenancy={canSetupNewTenancy || false}
          onStartSetup={onStartSetup}
          onSendInvitation={onSendInvitation}
          onEdit={onEditRentalTerms}
        />
      )}

      {/* 3. Contract Card */}
      {(sectionFilter === "all" || sectionFilter === "documents") && currentTenant && (
        <ContractCard
          currentTenant={currentTenant}
          propertyId={propertyId}
          userRole={userRole}
          isReadOnly={isReadOnly}
          pendingRequirement={pendingRequirement || null}
          tenancyRequirements={tenancyRequirements}
        />
      )}

{/* 5. Property Inspections Card */}
      {(sectionFilter === "all" || sectionFilter === "inspections") && (currentTenant ? (
        <InspectionCard
          tenancyId={currentTenant.id}
          propertyId={propertyId}
          isManager={userRole?.isManager || false}
          isReadOnly={isReadOnly}
          tenancyStatus={currentTenant.tenancy_status}
          isSelfManaged={!currentTenant.tenant_id}
        />
      ) : (
        <Card className="card-shine">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">              
              <ClipboardCheck className="h-4 w-4" />
              {t("inspections.title") || "Property Inspections"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6 text-muted-foreground">
              <ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t("inspections.noInspections") || "No inspections yet"}</p>
              <p className="text-xs mt-1">Inspections will appear after tenancy starts</p>
            </div>
          </CardContent>
</Card>
      ))}

    </div>
  );
}
