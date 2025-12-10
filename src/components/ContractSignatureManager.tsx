import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { FileSignature, CheckCircle2, Clock, Shield, AlertCircle, X, FileText, Upload } from "lucide-react";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { QualifiedSignatureFlow } from "@/components/signature/QualifiedSignatureFlow";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

// BLOCKED: DocuSeal/AES hidden until explicitly enabled
const DOCUSEAL_BLOCKED = true;

interface ContractSignature {
  id: string;
  workflow_status: string;
  signing_method_provider: string | null;
  signature_method: string | null;
  manager_signed_at: string | null;
  manager_signature_method: string | null;
  tenant_signed_at: string | null;
  tenant_signature_method: string | null;
  signed_document_url: string | null;
  initiated_at: string;
  expires_at: string | null;
  completed_at: string | null;
  kyc_enforced: boolean | null;
  docuseal_submission_id: string | null;
  docuseal_audit_log_url: string | null;
  manager_embed_slug: string | null;
  tenant_embed_slug: string | null;
  qualified_signature_provider: string | null;
  source_document_id: string | null;
}

interface ContractSignatureManagerProps {
  tenancyId: string;
  propertyId: string;
  isManager: boolean;
  contractMethod?: 'digital' | 'manual' | 'none' | null;
  onRefresh?: () => void;
}

export const ContractSignatureManager = ({ 
  tenancyId, 
  propertyId, 
  isManager,
  contractMethod,
  onRefresh 
}: ContractSignatureManagerProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { canCreateSignature, isPro } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [signature, setSignature] = useState<ContractSignature | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [showSigningForm, setShowSigningForm] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('');
  const [sourceDocument, setSourceDocument] = useState<{ document_title: string; file_name: string } | null>(null);

  // Use React Query for tenancy documents
  const { data: tenancyDocuments = [] } = useQuery({
    queryKey: ["tenancy-documents", tenancyId],
    queryFn: async () => {
      const { data } = await supabase
        .from('property_documents')
        .select('id, document_title, file_name')
        .eq('tenancy_id', tenancyId)
        .eq('document_category', 'tenancy')
        .eq('is_latest_version', true)
        .order('document_title');
      return data || [];
    },
    enabled: !!tenancyId,
  });

  const loadSignature = async () => {
    // Guard: don't fetch if tenancyId is empty
    if (!tenancyId) {
      setInitialized(true);
      return null;
    }
    
    try {
      const { data, error } = await supabase
        .from('contract_signatures')
        .select('*')
        .eq('tenancy_id', tenancyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setSignature(data);
      
      // Fetch source document info if exists
      if (data?.source_document_id) {
        const { data: doc } = await supabase
          .from('property_documents')
          .select('document_title, file_name')
          .eq('id', data.source_document_id)
          .single();
        
        if (doc) {
          setSourceDocument(doc);
        }
      } else {
        setSourceDocument(null);
      }
      
      // Initialize form visibility based on current user's signature status
      if (data) {
        const currentUserSigned = isManager ? !!data.manager_signed_at : !!data.tenant_signed_at;
        setShowSigningForm(!currentUserSigned);
      }
      
      setInitialized(true);
      return data;
    } catch (error) {
      console.error('Error loading signature:', error);
      setInitialized(true);
      return null;
    }
  };

  // Re-fetch when tenancyId changes (e.g., from empty to valid UUID)
  useEffect(() => {
    // Reset state when tenancyId changes
    setSignature(null);
    setSourceDocument(null);
    setInitialized(false);
    setSelectedDocumentId('');
    
    if (tenancyId) {
      loadSignature();
    }
  }, [tenancyId]);

  const handleInitiateSignature = async () => {
    if (!canCreateSignature) {
      setShowUpgradeDialog(true);
      return;
    }

    setLoading(true);
    try {
      // Digital signature uses YouSign
      const { data, error } = await supabase.functions.invoke('initiate-yousign-signature', {
        body: { 
          tenancyId, 
          propertyId,
          ...(selectedDocumentId && { documentId: selectedDocumentId })
        }
      });

      if (error) throw error;

      if (!data?.success) {
        const errorMsg = data?.error || 'Unknown error';
        
        if (errorMsg.includes('Manager KYC verification required')) {
          toast({
            title: t('contractSignature.verificationRequired'),
            description: t('contractSignature.managerKYCRequired'),
            variant: "destructive",
          });
        } else if (errorMsg.includes('Tenant KYC verification required')) {
          toast({
            title: t('contractSignature.verificationRequired'),
            description: t('contractSignature.tenantKYCRequired'),
            variant: "destructive",
          });
        } else {
          toast({
            title: t('common.error'),
            description: errorMsg,
            variant: "destructive",
          });
        }
        return;
      }

      toast({
        title: t('contractSignature.initiated'),
        description: data.message,
      });

      await loadSignature();
      onRefresh?.();
    } catch (error: any) {
      console.error('Error initiating signature:', error);
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to initiate signature',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSignature = async () => {
    if (!signature?.id) return;
    
    try {
      const { error } = await supabase
        .from('contract_signatures')
        .delete()
        .eq('id', signature.id);
      
      if (error) throw error;
      
      toast({
        title: t('contractSignature.cancelled') || 'Signature Cancelled',
        description: t('contractSignature.cancelledDesc') || 'You can now start a new signature process',
      });
      
      await loadSignature();
      onRefresh?.();
    } catch (error: any) {
      console.error('Error cancelling signature:', error);
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to cancel signature',
        variant: 'destructive',
      });
    }
  };

  const getSignatureMethodBadge = (method: string | null) => {
    if (!method) return null;
    
    switch (method) {
      case 'QES':
        return (
          <Badge variant="default" className="text-xs bg-primary">
            <Shield className="h-3 w-3 mr-1" />
            {t('contractSignature.qualified') || 'Qualified'} (QES)
          </Badge>
        );
      case 'AES':
        return (
          <Badge variant="outline" className="text-xs border-primary text-primary">
            <Shield className="h-3 w-3 mr-1" />
            {t('contractSignature.advanced') || 'Advanced'} (AES)
          </Badge>
        );
      case 'SAS':
        return (
          <Badge variant="outline" className="text-xs">
            <FileSignature className="h-3 w-3 mr-1" />
            {t('contractSignature.simple') || 'Simple'} (SAS)
          </Badge>
        );
      default:
        return <Badge variant="outline" className="text-xs">{method}</Badge>;
    }
  };

  // Contract method display labels (no vendor names)
  const getContractMethodDisplay = () => {
    switch (contractMethod) {
      case 'digital':
        return {
          title: t('tenancy.wizard.digitalSignature') || 'Digital Signature',
          description: t('contractSignature.digitalDesc') || 'Legally binding electronic signature',
          icon: <FileSignature className="h-5 w-5" />
        };
      case 'manual':
        return {
          title: t('tenancy.wizard.manualSignature') || 'Manual / Paper',
          description: t('contractSignature.manualDesc') || 'Sign physically and upload scanned copy',
          icon: <Upload className="h-5 w-5" />
        };
      case 'none':
        return {
          title: t('tenancy.wizard.skipContract') || 'Contract Skipped',
          description: t('contractSignature.skippedDesc') || 'No contract signing configured for this tenancy',
          icon: <FileText className="h-5 w-5" />
        };
      default:
        return {
          title: t('contractSignature.title') || 'Digital Contract Signature',
          description: t('contractSignature.description') || 'Manage contract signing for this tenancy',
          icon: <FileSignature className="h-5 w-5" />
        };
    }
  };

  const methodDisplay = getContractMethodDisplay();

  // Handle "none" contract method - show simple message
  if (contractMethod === 'none') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {methodDisplay.icon}
            {methodDisplay.title}
          </CardTitle>
          <CardDescription>
            {methodDisplay.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              {t('contractSignature.skippedInfo') || 'Contract signing was skipped for this tenancy. You can still upload contract documents manually in the Documents section.'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Handle "manual" contract method - show upload instructions
  if (contractMethod === 'manual' && !signature) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {methodDisplay.icon}
            {methodDisplay.title}
          </CardTitle>
          <CardDescription>
            {methodDisplay.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Upload className="h-4 w-4" />
            <AlertDescription>
              {t('contractSignature.manualInfo') || 'This tenancy uses manual/paper contract signing. Please sign the contract physically and upload the scanned signed copy in the Documents section above.'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // No signature exists yet - show initiation UI for digital signatures
  if (!signature) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {methodDisplay.icon}
            {methodDisplay.title}
          </CardTitle>
          <CardDescription>
            {methodDisplay.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isManager && (
            <>
              {/* Document Selector */}
              <div className="space-y-3">
                <Label htmlFor="document-select" className="text-base font-semibold">
                  {t('contractSignature.selectDocument') || 'Select Document to Sign'}
                </Label>
                <Select value={selectedDocumentId} onValueChange={setSelectedDocumentId}>
                  <SelectTrigger id="document-select" className="w-full">
                    <SelectValue placeholder={t('contractSignature.chooseDocument') || 'Choose a document...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {tenancyDocuments.length === 0 ? (
                      <SelectItem value="none" disabled>
                        {t('contractSignature.noDocuments') || 'No documents available'}
                      </SelectItem>
                    ) : (
                      tenancyDocuments.map((doc) => (
                        <SelectItem key={doc.id} value={doc.id}>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <div>
                              <div className="font-medium">{doc.document_title}</div>
                              <div className="text-xs text-muted-foreground">{doc.file_name}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {!selectedDocumentId && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {t('contractSignature.selectDocumentFirst') || 'Please upload and select a contract document before initiating the signature'}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <Button 
                onClick={handleInitiateSignature} 
                disabled={loading || !selectedDocumentId}
                className="w-full"
              >
                <FileSignature className="h-4 w-4 mr-2" />
                {loading ? t('common.loading') : (t('contractSignature.initiate') || 'Start Signature Process')}
              </Button>
            </>
          )}
          {!isManager && (
            <div className="text-sm text-muted-foreground">
              {t('contractSignature.waitingForManager') || 'Waiting for manager to initiate the signature process'}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Signature exists - show status
  const isCompleted = signature.workflow_status === 'completed';
  const managerSigned = !!signature.manager_signed_at;
  const tenantSigned = !!signature.tenant_signed_at;
  const isQualifiedSignature = ['yousign'].includes(signature.signing_method_provider || '');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSignature className="h-5 w-5" />
          {methodDisplay.title}
          {isCompleted && (
            <Badge variant="default" className="ml-auto">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {t('contractSignature.status.completed') || 'Completed'}
            </Badge>
          )}
          {!isCompleted && (
            <Badge variant="secondary" className="ml-auto">
              <Clock className="h-3 w-3 mr-1" />
              {t('contractSignature.status.inProgress') || 'In Progress'}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {t('contractSignature.initiated')}: {format(new Date(signature.initiated_at), 'PPP')}
        </CardDescription>
        {sourceDocument && (
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>{t('contractSignature.document') || 'Document'}: {sourceDocument.document_title}</span>
            <Badge variant="outline" className="text-xs">{sourceDocument.file_name}</Badge>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cancel Signature Button - Only for managers when signature is in progress */}
        {!isCompleted && isManager && (
          <Button
            variant="outline"
            onClick={handleCancelSignature}
            className="w-full"
          >
            <X className="h-4 w-4 mr-2" />
            {t('contractSignature.cancelAndRestart') || 'Cancel and Restart'}
          </Button>
        )}

        {/* Qualified Signature Flow */}
        {isQualifiedSignature && !isCompleted && showSigningForm && (
          <QualifiedSignatureFlow
            tenancyId={tenancyId}
            propertyId={propertyId}
            providerCode="yousign"
            onComplete={() => {
              setShowSigningForm(false);
              loadSignature();
              onRefresh?.();
            }}
          />
        )}

        {/* Manager Signature Status */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="font-medium flex items-center gap-2">
              {managerSigned ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <Clock className="h-4 w-4 text-muted-foreground" />
              )}
              {t('contractSignature.managerSignature') || 'Manager Signature'}
            </div>
            {managerSigned && (
              <div className="text-sm text-muted-foreground space-y-1">
                <div>{format(new Date(signature.manager_signed_at!), 'PPP p')}</div>
                <div>{getSignatureMethodBadge(signature.manager_signature_method)}</div>
              </div>
            )}
            {!managerSigned && isManager && isQualifiedSignature && !showSigningForm && (
              <Button 
                size="sm" 
                onClick={() => setShowSigningForm(true)} 
                className="mt-2"
              >
                <Shield className="h-4 w-4 mr-2" />
                {t('contractSignature.signNow') || 'Sign Now'}
              </Button>
            )}
          </div>
        </div>

        <Separator />

        {/* Tenant Signature Status */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="font-medium flex items-center gap-2">
              {tenantSigned ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <Clock className="h-4 w-4 text-muted-foreground" />
              )}
              {t('contractSignature.tenantSignature') || 'Tenant Signature'}
            </div>
            {tenantSigned && (
              <div className="text-sm text-muted-foreground space-y-1">
                <div>{format(new Date(signature.tenant_signed_at!), 'PPP p')}</div>
                <div>{getSignatureMethodBadge(signature.tenant_signature_method)}</div>
              </div>
            )}
            {!tenantSigned && !isManager && isQualifiedSignature && !showSigningForm && (
              <Button 
                size="sm" 
                onClick={() => setShowSigningForm(true)} 
                className="mt-2"
              >
                <Shield className="h-4 w-4 mr-2" />
                {t('contractSignature.signNow') || 'Sign Now'}
              </Button>
            )}
          </div>
        </div>

        {/* Download completed contract */}
        {isCompleted && signature.signed_document_url && (
          <>
            <Separator />
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <div className="font-medium">{t('contractSignature.downloadContract') || 'Download Signed Contract'}</div>
                <div className="text-sm text-muted-foreground">
                  {t('contractSignature.signedOn') || 'Signed on'}: {format(new Date(signature.completed_at!), 'PPP')}
                </div>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={async () => {
                  const newWindow = window.open('', '_blank');
                  
                  let storagePath = signature.signed_document_url!;
                  if (storagePath.includes('/qualified-contracts/')) {
                    storagePath = storagePath.split('/qualified-contracts/')[1];
                  }
                  
                  const { data, error } = await supabase.storage
                    .from('qualified-contracts')
                    .createSignedUrl(storagePath, 3600);
                  
                  if (error || !data?.signedUrl) {
                    newWindow?.close();
                    toast({
                      title: t('common.error'),
                      description: 'Failed to generate download link',
                      variant: 'destructive',
                    });
                    return;
                  }
                  
                  if (newWindow) {
                    newWindow.location.href = data.signedUrl;
                  }
                }}
              >
                {t('common.download') || 'Download'}
              </Button>
            </div>
          </>
        )}

        {signature.expires_at && !isCompleted && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium text-yellow-900 dark:text-yellow-100">
                {t('contractSignature.expiresOn') || 'Expires on'}: {format(new Date(signature.expires_at), 'PPP')}
              </div>
            </div>
          </div>
        )}
      </CardContent>
      
      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        feature="Digital Signatures"
        description="requires a Pro or Enterprise plan to create legally-binding electronic signatures for contracts."
        requiredPlan="pro"
      />
    </Card>
  );
};