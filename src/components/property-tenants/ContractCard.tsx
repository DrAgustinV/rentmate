import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { showToast } from "@/lib/toast";
import { FileText } from "lucide-react";
import { formatDate } from "@/lib/dateUtils";
import DocumentActionsMenu from "./DocumentActionsMenu";
import DocumentVersionHistoryModal from "./DocumentVersionHistoryModal";
import PropertyDocumentUpload from "@/components/PropertyDocumentUpload";
import { ContractSignatureManager } from "@/components/ContractSignatureManager";
import { documentService, tenancyService } from "@/services";
import { STORAGE_BUCKETS } from "@/constants";

interface ContractBadgeProps {
  state: 'locked' | 'readonly' | 'version';
  label: string;
}

const ContractBadge = ({ state, label }: ContractBadgeProps) => {
  const config: Record<string, { className: string }> = {
    locked: { className: "bg-success/10 text-success border-success/20 hover:bg-success/10" },
    readonly: { className: "bg-muted text-muted-foreground" },
    version: { className: "bg-info/10 text-info border-info/20 hover:bg-info/10" },
  };
  const { className } = config[state];
  return (
    <Badge variant="default" className={`text-xs font-medium px-2.5 py-1 h-auto border ${className}`}>
      {state === 'locked' && <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70" />}
      {label}
    </Badge>
  );
};

interface Tenant {
  id: string;
  tenant_id: string;
  tenancy_status: string;
  email: string;
}

interface UserRole {
  isManager: boolean;
}

interface TenancyRequirement {
  contract_method?: string | null;
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
}

interface ContractCardProps {
  currentTenant: Tenant | null;
  propertyId: string;
  userRole: UserRole | undefined;
  isReadOnly: boolean;
  pendingRequirement?: TenancyRequirement | null;
  tenancyRequirements?: { contract_method?: string | null } | null;
  uploadDocumentOpen?: boolean;
  selectedParentDoc?: { id: string; title: string } | null;
  onSetUploadDocumentOpen?: (open: boolean) => void;
  onSetSelectedParentDoc?: (doc: { id: string; title: string } | null) => void;
}

const formatFileSize = (bytes: number) => {
  return `${(bytes / 1024).toFixed(2)} KB`;
};

export function ContractCard({
  currentTenant,
  propertyId,
  userRole,
  isReadOnly,
  pendingRequirement,
  tenancyRequirements,
  uploadDocumentOpen: propsUploadOpen,
  selectedParentDoc: propsSelectedDoc,
  onSetUploadDocumentOpen,
  onSetSelectedParentDoc,
}: ContractCardProps) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  
  const [localUploadDocumentOpen, setLocalUploadDocumentOpen] = useState(false);
  const [localSelectedParentDoc, setLocalSelectedParentDoc] = useState<{ id: string; title: string } | null>(null);
  
  const uploadDocumentOpen = propsUploadOpen ?? localUploadDocumentOpen;
  const selectedParentDoc = propsSelectedDoc ?? localSelectedParentDoc;
  const setUploadDocumentOpen = onSetUploadDocumentOpen || setLocalUploadDocumentOpen;
  const setSelectedParentDoc = onSetSelectedParentDoc || setLocalSelectedParentDoc;
  const [expandedDocuments, setExpandedDocuments] = useState<Set<string>>(new Set());
  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [selectedDocForVersions, setSelectedDocForVersions] = useState<{ title: string; versions: TenancyDocument[] } | null>(null);

  // Query for documents
  const { data: tenancyDocuments, refetch: refetchDocuments } = useQuery({
    queryKey: ["tenancy-documents", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      return tenancyService.getTenancyDocuments(currentTenant.id) as Promise<TenancyDocument[]>;
    },
    enabled: !!currentTenant,
  });

  // Query for contract signature status
  const { data: contractSignature } = useQuery({
    queryKey: ["contract-signature-status", currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return null;
      return tenancyService.getContractSignatureStatus(currentTenant.id);
    },
    enabled: !!currentTenant?.id,
  });

  const isContractLocked = !!contractSignature?.workflow_status;

  const deleteDocumentMutation = useMutation({
    mutationFn: async (docId: string) => {
      await documentService.deleteDocument(docId);
    },
    onSuccess: () => {
      showToast.success(t("properties.propertyDocuments.deleteSuccess"));
      refetchDocuments();
    },
    onError: () => {
      showToast.error(t("properties.propertyDocuments.deleteFailed"));
    },
  });

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
    } catch (error: unknown) {
      showToast.error(t("common.error"));
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
        
        if (newWindow) {
          newWindow.location.href = url;
        }
      } catch (error: unknown) {
        newWindow?.close();
        showToast.error(t("properties.openError"));
      }
    } else {
      downloadDocument(doc);
    }
  };

  // Group documents by title
  const groupedDocuments = tenancyDocuments?.reduce((acc, doc) => {
    if (!acc[doc.document_title]) {
      acc[doc.document_title] = [];
    }
    acc[doc.document_title].push(doc);
    return acc;
  }, {} as Record<string, TenancyDocument[]>);

  if (!currentTenant) return null;

  return (
    <>
    <Card className="card-shine" id="contract-signature-section">
      <CardContent className="space-y-6">
        {/* Digital Signature Section */}
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
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
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
            <div className="grid gap-3">
              {Object.entries(groupedDocuments).map(([title, docs]) => {
                const latestDoc = docs[0];
                const olderVersions = docs.slice(1);

                return (
                  <div key={title} className="group relative bg-muted/30 hover:bg-muted/50 rounded-xl p-4 transition-all duration-200 border border-transparent hover:border-muted-foreground/20">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-6 w-6 text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold truncate">{title}</h4>
                          {docs.length > 1 && (
                            <ContractBadge state="version" label={`${docs.length} ${t("properties.propertyDocuments.versions")}`} />
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <span className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">v{latestDoc.version}</span>
                          </span>
                          <span>{formatFileSize(latestDoc.file_size_bytes)}</span>
                          <span>·</span>
                          <span>{formatDate(latestDoc.created_at)}</span>
                        </div>
                        {latestDoc.description && (
                          <p className="text-xs text-muted-foreground mt-1 italic">{latestDoc.description}</p>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <DocumentActionsMenu
                          onView={() => openDocument(latestDoc)}
                          onDownload={() => downloadDocument(latestDoc)}
                          onUploadVersion={() => !isReadOnly && !isContractLocked && setSelectedParentDoc({ id: latestDoc.id, title })}
                          onDelete={() => !isReadOnly && !isContractLocked && userRole?.isManager && deleteDocumentMutation.mutate(latestDoc.id)}
                          canEdit={!isReadOnly && !isContractLocked && !!userRole?.isManager}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 px-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-2">{t("properties.noTenancyDocuments")}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>

    {/* Version History Modal */}
    {selectedDocForVersions && (
      <DocumentVersionHistoryModal
        open={versionModalOpen}
        onOpenChange={(open) => {
          setVersionModalOpen(open);
          if (!open) setSelectedDocForVersions(null);
        }}
        documentTitle={selectedDocForVersions.title}
        versions={selectedDocForVersions.versions}
        onView={(version) => openDocument(version)}
        onDownload={(version) => downloadDocument(version)}
      />
    )}
    </>
  );
}

export default ContractCard;
