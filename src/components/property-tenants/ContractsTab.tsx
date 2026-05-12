import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Upload,
  Download,
  Trash2,
  Eye,
  Clock,
  FileText,
  ClipboardCheck,
} from "lucide-react";
import { formatDate } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import PropertyDocumentUpload from "@/components/PropertyDocumentUpload";
import PropertyDocumentVersionHistory from "@/components/PropertyDocumentVersionHistory";
import { ContractSignatureManager } from "@/components/ContractSignatureManager";
import { RentalTermsCard } from "./RentalTermsCard";
import { ContactInfoCard } from "./ContactInfoCard";
import { TenantOnboardingChecklist } from "./TenantOnboardingChecklist";
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
  
  const [uploadDocumentOpen, setUploadDocumentOpen] = useState(false);
  const [selectedParentDoc, setSelectedParentDoc] = useState<{ id: string; title: string } | null>(null);
  const [expandedDocuments, setExpandedDocuments] = useState<Set<string>>(new Set());

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
      toast.success(t("properties.propertyDocuments.deleteSuccess"));
      refetchDocuments();
    },
    onError: () => {
      toast.error(t("properties.propertyDocuments.deleteFailed"));
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
      toast.error(t("common.error"));
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
          toast.error(t("properties.openError"));
          return;
        }
        
        if (newWindow) {
          newWindow.location.href = data.signedUrl;
        }
      } catch (error: any) {
        newWindow?.close();
        toast.error(t("properties.openError"));
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

  return (
    <div className="space-y-6">
      {/* 0. Tenant Onboarding Checklist (tenant only, shows only when items pending) */}
      {!userRole?.isManager && currentTenant && (
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

      {/* 1. Tenant Information Card (TOP) */}
      <ContactInfoCard
        propertyId={propertyId}
        currentTenant={currentTenant}
        userRole={userRole}
        isReadOnly={isReadOnly}
        onEditTenant={onEditTenant}
        onEndTenancy={onEndTenancy}
        onInvite={onInviteInSelfManaged}
        invitationStatus={pendingRequirement?.status as any || 'none'}
      />

      {/* 2. Rental Terms Card (SECOND) */}
      <RentalTermsCard
        propertyId={propertyId}
        tenancyId={currentTenant?.id}
        tenantEmail={currentTenant?.email}
        isManager={userRole?.isManager || false}
        isReadOnly={isReadOnly}
        tenancyStatus={currentTenant?.tenancy_status}
        pendingRequirement={pendingRequirement || null}
        canSetupNewTenancy={canSetupNewTenancy || false}
        hasEndingTenancy={hasEndingTenancy || false}
        currentTenantName={currentTenantName}
        onStartSetup={onStartSetup}
        onSendInvitation={onSendInvitation}
        onCancelSetup={onCancelSetup}
        onResendInvitation={onResendInvitation}
        isDeleting={isDeleting}
        isResending={isResending}
        onEdit={onEditRentalTerms}
      />

      {/* 3. Contract Card (THIRD) */}
      {currentTenant && (
        <Card className="card-shine" id="contract-signature-section">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t("properties.contract") || "Contract"}
              </CardTitle>
              <div className="flex items-center gap-2">
                {isContractLocked && (
                  <Badge variant="secondary" className="text-xs">
                    🔒 {t("properties.contractLocked") || "Locked"}
                  </Badge>
                )}
                {isReadOnly && !isContractLocked && (
                  <Badge variant="secondary" className="text-xs">
                    {t("properties.readOnlyAccess")}
                  </Badge>
                )}
                {!isReadOnly && !isContractLocked && !uploadDocumentOpen && !selectedParentDoc && userRole?.isManager && (
                  <Button variant="outline" size="sm" onClick={() => setUploadDocumentOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    {t("properties.uploadContract") || "Upload Contract"}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Uploaded Documents List */}
            <div className="space-y-4">
              {uploadDocumentOpen && !isReadOnly && !selectedParentDoc && (
                <PropertyDocumentUpload
                  propertyId={propertyId}
                  category="tenancy"
                  tenancyId={currentTenant.id}
                  onUploadComplete={() => {
                    refetchDocuments();
                    setUploadDocumentOpen(false);
                  }}
                />
              )}

              {selectedParentDoc && !isReadOnly && (
                <div className="space-y-3">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium">
                      {t("properties.propertyDocuments.uploadNewVersion")}: {selectedParentDoc.title}
                    </p>
                  </div>
                  <PropertyDocumentUpload
                    propertyId={propertyId}
                    category="tenancy"
                    tenancyId={currentTenant.id}
                    parentDocumentId={selectedParentDoc.id}
                    parentDocumentTitle={selectedParentDoc.title}
                    onUploadComplete={() => {
                      refetchDocuments();
                      setSelectedParentDoc(null);
                    }}
                  />
                  <Button variant="outline" onClick={() => setSelectedParentDoc(null)}>
                    {t("common.cancel")}
                  </Button>
                </div>
              )}

              {groupedDocuments && Object.keys(groupedDocuments).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(groupedDocuments).map(([title, docs]) => {
                    const latestDoc = docs[0];
                    const olderVersions = docs.slice(1);
                    const isExpanded = expandedDocuments.has(title);

                    return (
                      <div key={title} className="border rounded-lg">
                        <div className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium truncate">{title}</h4>
                                {docs.length > 1 && (
                                  <Badge variant="secondary" className="text-xs">
                                    {docs.length} {t("properties.propertyDocuments.versions")}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground space-y-0.5">
                                <p>
                                  v{latestDoc.version} · {formatFileSize(latestDoc.file_size_bytes)} ·{" "}
                                  {formatDate(latestDoc.created_at)}
                                </p>
                                {latestDoc.description && <p className="italic">{latestDoc.description}</p>}
                              </div>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <Button variant="outline" size="sm" onClick={() => openDocument(latestDoc)} title={t("common.open")}>
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => downloadDocument(latestDoc)} title={t("common.download")}>
                                <Download className="h-3 w-3" />
                              </Button>
                              {!isReadOnly && !isContractLocked && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedParentDoc({ id: latestDoc.id, title })}
                                    title={t("properties.uploadNewVersion") || "Upload new version"}
                                  >
                                    <Upload className="h-3 w-3" />
                                  </Button>
                                  {userRole?.isManager && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deleteDocumentMutation.mutate(latestDoc.id)}
                                      title={t("common.delete")}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          {olderVersions.length > 0 && (
                            <div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleDocumentExpansion(title)}
                                className="w-full justify-between"
                              >
                                <span className="text-xs">
                                  {isExpanded ? t("properties.propertyDocuments.previousVersions") : t("properties.propertyDocuments.seeVersions")}
                                </span>
                                <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
                              </Button>

                              {isExpanded && (
                                <PropertyDocumentVersionHistory
                                  versions={olderVersions}
                                  onDownload={downloadDocument}
                                  onOpen={openDocument}
                                  onDelete={userRole?.isManager ? (doc) => deleteDocumentMutation.mutate(doc.id) : undefined}
                                  formatFileSize={formatFileSize}
                                  getUploaderName={getUploaderName}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("properties.noTenancyDocuments")}</p>
              )}
            </div>

            {/* Separator between documents and signature */}
            <Separator />

            {/* Digital Signature Section (embedded) */}
            <ContractSignatureManager
              tenancyId={currentTenant?.id || ''}
              propertyId={propertyId}
              isManager={userRole?.isManager || false}
              contractMethod={
                pendingRequirement?.contract_method || 
                tenancyRequirements?.contract_method as 'digital' | 'manual' | 'none' | null | undefined
              }
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ["active-tenants", propertyId] })}
              asSection={true}
            />
          </CardContent>
        </Card>
      )}

{/* 5. Property Inspections Card */}
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
        <Card className="card-shine">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
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
      )}

    </div>
  );
}
