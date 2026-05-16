import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { showToast } from "@/lib/toast";
import {
  Upload,
  FileText,
  ClipboardCheck,
  User,
  Plus,
  Pencil,
  Send,
} from "lucide-react";
import PropertyDocumentUpload from "@/components/PropertyDocumentUpload";
import { ContractSignatureManager } from "@/components/ContractSignatureManager";
import { TenantOnboardingChecklist } from "./TenantOnboardingChecklist";
import { TenancyOverviewCard } from "./TenancyOverviewCard";
import { ContractCard } from "./ContractCard";
import { TenancyRequirement } from "@/hooks/useTenancyRequirements";
import { InspectionCard } from "@/components/inspection";
import { documentService } from "@/services";
import { STORAGE_BUCKETS } from "@/constants";

import { SectionCard } from "./SectionCard";
import { InteractiveStepper } from "./InteractiveStepper";
import { EmptyState } from "@/components/EmptyState";
import { ContractsTabSkeleton } from "./ContractsTabSkeleton";
import { StatusBadge } from "./StatusBadge";

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

interface TenantContext {
  currentTenant: Tenant | null;
  propertyId: string;
  userRole: { isManager: boolean } | undefined;
  isReadOnly: boolean;
}

interface TenancySetupState {
  pendingRequirement?: TenancyRequirement | null;
  canSetupNewTenancy?: boolean;
  hasEndingTenancy?: boolean;
  isDeleting?: boolean;
  isResending?: boolean;
  isDismissing?: boolean;
}

interface ContractsTabCallbacks {
  onStartSetup?: () => void;
  onSendInvitation?: (req: TenancyRequirement) => void;
  onCancelSetup?: (req: TenancyRequirement) => void;
  onResendInvitation?: (req: TenancyRequirement) => void;
  onEditTenant?: (tenant: Tenant) => void;
  onEndTenancy?: (tenant: Tenant) => void;
  onFinalizeTenancy?: (tenant: Tenant) => void;
  setCancellingInvitation?: (invitation: Invitation | null) => void;
  onEditAndResend?: (invitation: Invitation) => void;
  onDismissInvitation?: (invitation: Invitation) => void;
  onEditRentalTerms?: () => void;
  onInviteInSelfManaged?: () => void;
  onDeleteTenancy?: (tenantId: string) => void;
}

interface ContractsTabProps {
  tenant: TenantContext;
  setupState?: TenancySetupState;
  callbacks?: ContractsTabCallbacks;
}

export function ContractsTab({
  tenant: { currentTenant, propertyId, userRole, isReadOnly },
  setupState = {},
  callbacks = {},
}: ContractsTabProps) {
  const {
    pendingRequirement,
    canSetupNewTenancy,
    hasEndingTenancy,
    isDeleting,
    isResending,
    isDismissing,
  } = setupState;
  const {
    onStartSetup,
    onSendInvitation,
    onCancelSetup,
    onResendInvitation,
    onEditTenant,
    onEndTenancy,
    onFinalizeTenancy,
    setCancellingInvitation,
    onEditAndResend,
    onDismissInvitation,
    onEditRentalTerms,
    onInviteInSelfManaged,
    onDeleteTenancy,
  } = callbacks;
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  
  const [uploadDocumentOpen, setUploadDocumentOpen] = useState(false);
  const [selectedParentDoc, setSelectedParentDoc] = useState<{ id: string; title: string } | null>(null);
  const [tenancyDocsMap] = useState<Record<string, TenancyDocument[]>>({});
  const [expandedDocuments, setExpandedDocuments] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['tenant']) // Default: tenant section open
  );

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleStepClick = (step: number) => {
    const stepToSection: Record<number, string> = {
      1: 'tenant',
      2: 'tenant',
      3: 'historic',
    };
    const section = stepToSection[step];
    if (section && !expandedSections.has(section)) {
      setExpandedSections(prev => new Set([...prev, section]));
    }
    document.getElementById(`section-${section}`)?.scrollIntoView({ behavior: 'smooth' });
  };

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

  // Invitations query (manager only)
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

  const pendingInvitations = invitations?.filter(inv => inv.status === 'pending') || [];
  const declinedInvitations = invitations?.filter(inv => inv.status === 'declined') || [];

  const deleteDocumentMutation = useMutation({
    mutationFn: async (docId: string) => {
      await documentService.deleteDocument(docId);
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
      // Note: This would need a setter in a real implementation
    }
  };

  const formatFileSize = (bytes: number) => `${(bytes / 1024).toFixed(2)} KB`;

  const getUploaderName = (doc: TenancyDocument) => doc.uploaded_by ? "User" : "Unknown";

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
      const data = await documentService.downloadFile(STORAGE_BUCKETS.PROPERTY_DOCUMENTS, doc.file_path);
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
        const url = await documentService.getSignedUrl(STORAGE_BUCKETS.PROPERTY_DOCUMENTS, doc.file_path);
        if (newWindow) newWindow.location.href = url;
      } catch (error: any) {
        newWindow?.close();
        showToast.error({ title: t("properties.openError") });
      }
    } else {
      downloadDocument(doc);
    }
  };

  const getTenantName = (tenant: Tenant) => {
    if (tenant.first_name && tenant.last_name) return `${tenant.first_name} ${tenant.last_name}`;
    if (tenant.first_name) return tenant.first_name;
    return tenant.email;
  };

  const groupedDocuments = tenancyDocuments?.reduce((acc, doc) => {
    if (!acc[doc.document_title]) acc[doc.document_title] = [];
    acc[doc.document_title].push(doc);
    return acc;
  }, {} as Record<string, TenancyDocument[]>);

  const currentTenantName = currentTenant 
    ? (currentTenant.first_name && currentTenant.last_name 
        ? `${currentTenant.first_name} ${currentTenant.last_name}` 
        : currentTenant.email)
    : undefined;

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
  const isPendingDraft = pendingRequirement?.status === 'draft';
  const isPendingSent = pendingRequirement?.status === 'sent';

  if (docsLoading && currentTenant) {
    return <ContractsTabSkeleton />;
  }

  const getTenancyStep = () => {
    if (!currentTenant) return 0;
    if (pendingRequirement) return 1;
    if (currentTenant.tenancy_status === 'active') return 2;
    if (currentTenant.tenancy_status === 'ending_tenancy' || currentTenant.tenancy_status === 'historic') return 3;
    return 1;
  };

  const tenancyStep = getTenancyStep();

  const isSectionOpen = (section: string) => expandedSections.has(section);

  return (
    <div className="space-y-6">
      {/* Interactive Tenancy Progress Stepper - always visible */}
      <InteractiveStepper 
        currentStep={tenancyStep}
        onStepClick={handleStepClick}
      />

      {/* Tenant Onboarding Checklist (tenant only) */}
      {!userRole?.isManager && currentTenant && (
        <TenantOnboardingChecklist
          tenancyId={currentTenant.id}
          propertyId={propertyId}
          onScrollToContract={() => {
            setExpandedSections(prev => new Set([...prev, 'contract']));
            document.getElementById("section-contract")?.scrollIntoView({ behavior: "smooth" });
          }}
          onSwitchToPayments={() => {
            const paymentsTab = document.querySelector('[data-value="payments"]');
            if (paymentsTab instanceof HTMLElement) paymentsTab.click();
          }}
        />
      )}

      {/* Section 1: Tenant Overview */}
      <div id="section-tenant">
        <SectionCard
          title={t("propertyTenants.tabs.contracts") || "Tenant & Tenancy"}
          icon={User}
          description={currentTenant ? getTenantName(currentTenant) : t("tenancy.setupTenancy")}
          defaultOpen={true}
          action={
            pendingRequirement && userRole?.isManager && !isReadOnly ? (
              <div className="flex items-center gap-2">
                {isPendingDraft && <StatusBadge status="draft" />}
                {isPendingSent && <StatusBadge status="sent" />}
                {isPendingDraft && onStartSetup && (
                  <Button variant="outline" size="sm" className="h-8" onClick={onStartSetup}>
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    {t("common.edit")}
                  </Button>
                )}
                {onSendInvitation && (
                  <Button variant="outline" size="sm" className="h-8" onClick={onSendInvitation as any}>
                    <Send className="h-3.5 w-3.5 mr-1" />
                    {t("tenancy.sendInvitation")}
                  </Button>
                )}
              </div>
            ) : !isReadOnly && canSetupNewTenancy && !currentTenant && onStartSetup ? (
              <Button size="sm" onClick={onStartSetup}>
                <Plus className="h-4 w-4 mr-1" />
                {t("tenancy.setupTenancy")}
              </Button>
            ) : undefined
          }
        >
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
            onDeleteTenancy={onDeleteTenancy}
          />
        </SectionCard>
      </div>




      {/* Section 2: Contract & Documents */}
      {currentTenant && (
        <div id="section-contract">
          <SectionCard
            title={t("properties.contract") || "Contract & Documents"}
            icon={FileText}
            description={t("propertyTenants.contract.description") || "Manage contract and uploads"}
            defaultOpen={false}
            action={
              !isReadOnly && !isContractLocked && !uploadDocumentOpen && !selectedParentDoc && userRole?.isManager && (
                <Button variant="outline" size="sm" className="h-8" onClick={() => setUploadDocumentOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  {t("properties.uploadContract") || "Upload Contract"}
                </Button>
              )
            }
          >
            <ContractCard
              currentTenant={currentTenant}
              propertyId={propertyId}
              userRole={userRole}
              isReadOnly={isReadOnly}
              pendingRequirement={pendingRequirement || null}
              tenancyRequirements={tenancyRequirements}
              uploadDocumentOpen={uploadDocumentOpen}
              selectedParentDoc={selectedParentDoc}
              onSetUploadDocumentOpen={setUploadDocumentOpen}
              onSetSelectedParentDoc={setSelectedParentDoc}
            />
          </SectionCard>
        </div>
      )}




      {/* Section 3: Property Inspections */}
{/* Section 3: Property Inspections */}
{currentTenant && (
  <div id="section-inspections">
    <SectionCard
      title={t("inspections.title") || "Property Inspections"}
      icon={ClipboardCheck}
      description={
        currentTenant 
          ? (t("inspections.description") || "Move-in and move-out reports")
          : (t("inspections.afterTenancyStart") || "Available after tenancy starts")
      }
      defaultOpen={false}
      action={
        userRole?.isManager && !isReadOnly && currentTenant ? (
          <Button size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-1" />
            {t("inspections.newInspection")}
          </Button>
        ) : undefined
      }
    >
      {currentTenant ? (
        <InspectionCard
          tenancyId={currentTenant.id}
          propertyId={propertyId}
          isManager={userRole?.isManager || false}
          isReadOnly={isReadOnly}
          tenancyStatus={currentTenant.tenancy_status}
          isSelfManaged={!currentTenant.tenant_id}
        />
      ) : (
        <EmptyState
          icon={ClipboardCheck}
          title={t("inspections.noInspections") || "No inspections yet"}
          description={t("inspections.availableAfterTenancy") || "Inspections will appear after a tenancy is set up"}
          action={
            userRole?.isManager && !isReadOnly && canSetupNewTenancy && onStartSetup ? (
              <Button onClick={onStartSetup}>
                <Plus className="h-4 w-4 mr-2" />
                {t("tenancy.setupTenancy")}
              </Button>
            ) : undefined
          }
        />
      )}
    </SectionCard>
  </div>
)}    </div>
  );
}