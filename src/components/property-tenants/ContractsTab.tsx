import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Upload,
  Copy,
  Download,
  ChevronDown,
  Trash2,
} from "lucide-react";
import { formatDate } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import PropertyDocumentUpload from "@/components/PropertyDocumentUpload";
import PropertyDocumentVersionHistory from "@/components/PropertyDocumentVersionHistory";
import { ContractSignatureManager } from "@/components/ContractSignatureManager";
import { UseQueryResult } from "@tanstack/react-query";

interface Tenant {
  id: string;
  tenant_id: string;
  tenancy_status: 'active' | 'ending_tenancy' | 'historic';
  started_at: string;
  ended_at: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  notes: string | null;
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
  tenancyDocuments: TenancyDocument[] | undefined;
  groupedDocuments: Record<string, TenancyDocument[]> | undefined;
  userRole: { isManager: boolean } | undefined;
  isReadOnly: boolean;
  uploadDocumentOpen: boolean;
  setUploadDocumentOpen: (open: boolean) => void;
  copyTemplatesOpen: boolean;
  setCopyTemplatesOpen: (open: boolean) => void;
  selectedParentDoc: { id: string; title: string } | null;
  setSelectedParentDoc: (doc: { id: string; title: string } | null) => void;
  expandedDocuments: Set<string>;
  toggleDocumentExpansion: (title: string) => void;
  refetchDocuments: () => void;
  downloadDocument: (doc: TenancyDocument) => Promise<void>;
  deleteDocumentMutation: { mutate: (id: string) => void };
  onRefreshContract: () => void;
}

export function ContractsTab({
  currentTenant,
  propertyId,
  tenancyDocuments,
  groupedDocuments,
  userRole,
  isReadOnly,
  uploadDocumentOpen,
  setUploadDocumentOpen,
  copyTemplatesOpen,
  setCopyTemplatesOpen,
  selectedParentDoc,
  setSelectedParentDoc,
  expandedDocuments,
  toggleDocumentExpansion,
  refetchDocuments,
  downloadDocument,
  deleteDocumentMutation,
  onRefreshContract,
}: ContractsTabProps) {
  const { t } = useLanguage();

  const formatFileSize = (bytes: number) => {
    return `${(bytes / 1024).toFixed(2)} KB`;
  };

  const getUploaderName = (doc: TenancyDocument) => {
    return doc.uploaded_by ? "User" : "Unknown";
  };

  if (!currentTenant) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>{t("dialogs.manageTenants.noTenants")}</p>
        <p className="text-sm mt-2">{t("properties.inviteTenantToGetStarted")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Digital Contract Signature */}
      <div>
        <ContractSignatureManager
          tenancyId={currentTenant.id}
          propertyId={propertyId}
          isManager={userRole?.isManager || false}
          onRefresh={onRefreshContract}
        />
      </div>

      {/* Tenancy Documents */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{t("properties.tenancyDocuments")}</h3>
          <div className="flex items-center gap-2">
            {isReadOnly && (
              <Badge variant="secondary" className="text-xs">
                {t("properties.readOnlyAccess")}
              </Badge>
            )}
            {!isReadOnly && !uploadDocumentOpen && !selectedParentDoc && (
              <>
                {userRole?.isManager && (
                  <Button variant="outline" size="sm" onClick={() => setCopyTemplatesOpen(true)}>
                    <Copy className="h-4 w-4 mr-2" />
                    {t("properties.copyTemplates")}
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setUploadDocumentOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  {t("properties.uploadTenancyDocument")}
                </Button>
              </>
            )}
          </div>
        </div>

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
                      <div className="flex gap-2 flex-shrink-0">
                        <Button variant="outline" size="sm" onClick={() => downloadDocument(latestDoc)}>
                          <Download className="h-3 w-3" />
                        </Button>
                        {!isReadOnly && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedParentDoc({ id: latestDoc.id, title })}
                            >
                              <Upload className="h-3 w-3" />
                            </Button>
                            {userRole?.isManager && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteDocumentMutation.mutate(latestDoc.id)}
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
    </div>
  );
}
