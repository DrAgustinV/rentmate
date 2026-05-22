import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { FileSignature, CheckCircle2, Clock, Shield, AlertCircle, X, FileText, Upload, Bell, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { QualifiedSignatureFlow } from "@/components/signature/QualifiedSignatureFlow";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { documentService, tenancyService } from "@/services";
import { STORAGE_BUCKETS } from "@/constants";

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
  // Reminder tracking fields
  last_reminder_sent_at: string | null;
  reminder_count: number | null;
}

interface ContractSignatureManagerProps {
  tenancyId: string;
  propertyId: string;
  isManager: boolean;
  contractMethod?: 'digital' | 'manual' | 'none' | null;
  onRefresh?: () => void;
  /** When true, renders as section without Card wrapper (for embedding in parent Card) */
  asSection?: boolean;
}

export const ContractSignatureManager = ({ 
  tenancyId, 
  propertyId, 
  isManager,
  contractMethod,
  onRefresh,
  asSection = false
}: ContractSignatureManagerProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { canCreateSignature, isPro } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [reminderLoading, setReminderLoading] = useState(false);
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

  // Auto-select document when only one exists or when signature has source_document_id
  useEffect(() => {
    // If signature exists and has a source document, pre-select it
    if (signature?.source_document_id && tenancyDocuments && tenancyDocuments.length > 0) {
      const matchingDoc = tenancyDocuments.find(doc => doc.id === signature.source_document_id);
      if (matchingDoc) {
        setSelectedDocumentId(matchingDoc.id);
        return;
      }
    }
    
    // If only one document exists, auto-select it
    if (tenancyDocuments && tenancyDocuments.length === 1 && !selectedDocumentId) {
      setSelectedDocumentId(tenancyDocuments[0].id);
    }
  }, [tenancyDocuments, signature?.source_document_id, selectedDocumentId]);

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
  }, [tenancyId, loadSignature]);

  const handleInitiateSignature = async () => {
    if (!canCreateSignature) {
      setShowUpgradeDialog(true);
      return;
    }

    setLoading(true);
    try {
      // Digital signature uses YouSign
      const data = await tenancyService.initiateYousignSignature({
        tenancy_id: tenancyId,
        agreement_id: rentAgreementId,
      });

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
    } catch (error: unknown) {
      console.error('Error initiating signature:', error);
      const message = error instanceof Error ? error.message : 'Failed to initiate signature';
      toast({
        title: t('common.error'),
        description: message,
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
    } catch (error: unknown) {
      console.error('Error cancelling signature:', error);
      const message = error instanceof Error ? error.message : 'Failed to cancel signature';
      toast({
        title: t('common.error'),
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleSendReminder = async () => {
    if (!signature?.id) return;
    
    setReminderLoading(true);
    try {
      const data = await tenancyService.sendYousignReminder({ tenancy_id: tenancyId });

      if (!data?.success) {
        toast({
          title: t('common.error'),
          description: data?.error || t('contractSignature.reminder.error'),
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t('contractSignature.reminder.reminderSent'),
        description: t('contractSignature.reminder.success'),
      });

      // Refresh signature data to update reminder count
      await loadSignature();
    } catch (error: unknown) {
      console.error('Error sending reminder:', error);
      const message = error instanceof Error ? error.message : t('contractSignature.reminder.error');
      toast({
        title: t('common.error'),
        description: message,
        variant: "destructive",
      });
    } finally {
      setReminderLoading(false);
    }
  };

  // Check if reminder can be sent (1-hour cooldown, max 3 reminders)
  const canSendReminder = () => {
    if ((signature?.reminder_count ?? 0) >= 3) return false;
    if (!signature?.last_reminder_sent_at) return true;
    const lastSent = new Date(signature.last_reminder_sent_at);
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return lastSent < hourAgo;
  };

  // Get time until next reminder is available
  const getNextReminderTime = () => {
    if (!signature?.last_reminder_sent_at) return null;
    const lastSent = new Date(signature.last_reminder_sent_at);
    const nextAvailable = new Date(lastSent.getTime() + 60 * 60 * 1000);
    const now = new Date();
    if (nextAvailable <= now) return null;
    const diffMinutes = Math.ceil((nextAvailable.getTime() - now.getTime()) / (60 * 1000));
    return `${diffMinutes} min`;
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
          // description: t('contractSignature.manualDesc') || 'Sign physically and upload scanned copy',
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
    const content = (
      <>
        <div className="flex items-center gap-2 mb-2">
          {methodDisplay.icon}
          <h4 className="font-semibold">{methodDisplay.title}</h4>
        </div>
        <p className="text-sm text-muted-foreground mb-3">{methodDisplay.description}</p>
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            {t('contractSignature.skippedInfo') || 'Contract signing was skipped for this tenancy. You can still upload contract documents manually above.'}
          </AlertDescription>
        </Alert>
      </>
    );

    if (asSection) return <div className="space-y-3">{content}</div>;
    
    return (
      <Card className="card-shine">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {methodDisplay.icon}
            {methodDisplay.title}
          </CardTitle>
          <CardDescription>{methodDisplay.description}</CardDescription>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    );
  }

  // Handle "manual" contract method - show upload instructions
  if (contractMethod === 'manual' && !signature) {
    const content = (
      <>
        <div className="flex items-center gap-2 mb-2">
          {methodDisplay.icon}
          <h4 className="font-semibold">{methodDisplay.title}</h4>
        </div>
        <p className="text-sm text-muted-foreground mb-3">{methodDisplay.description}</p>

      </>
    );

    if (asSection) return <div className="space-y-3">{content}</div>;

    return (
      <Card className="card-shine">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {methodDisplay.icon}
            {methodDisplay.title}
          </CardTitle>
          {/* <CardDescription>{methodDisplay.description}</CardDescription> */}
        </CardHeader>
        <CardContent className="space-y-4">{content}</CardContent>
      </Card>
    );
  }

  // No signature exists yet - show initiation UI for digital signatures
  if (!signature) {
    const content = (
      <div className="space-y-4">
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

            <div className="relative">
              <Button 
                onClick={handleInitiateSignature} 
                disabled={loading || !selectedDocumentId || !canCreateSignature}
                className="w-full"
              >
                <FileSignature className="h-4 w-4 mr-2" />
                {loading ? t('common.loading') : (t('contractSignature.initiate') || 'Start Signature Process')}
              </Button>
              {!canCreateSignature && !isPro && (
                <Badge 
                  variant="secondary" 
                  className="absolute -top-2 -right-2 text-xs bg-amber-500/10 text-amber-600 border-amber-500/30"
                >
                  Pro
                </Badge>
              )}
            </div>
          </>
        )}
        {!isManager && (
          <div className="text-sm text-muted-foreground">
            {t('contractSignature.waitingForManager') || 'Waiting for manager to initiate the signature process'}
          </div>
        )}
      </div>
    );

    if (asSection) {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            {methodDisplay.icon}
            <h4 className="font-semibold">{methodDisplay.title}</h4>
          </div>
          <p className="text-sm text-muted-foreground">{methodDisplay.description}</p>
          {content}
        </div>
      );
    }

    return (
      <Card className="card-shine">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {methodDisplay.icon}
            {methodDisplay.title}
          </CardTitle>
          <CardDescription>{methodDisplay.description}</CardDescription>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    );
  }

  // Signature exists - show status
  const isCompleted = signature.workflow_status === 'completed';
  const managerSigned = !!signature.manager_signed_at;
  const tenantSigned = !!signature.tenant_signed_at;
  const isQualifiedSignature = ['yousign'].includes(signature.signing_method_provider || '');

  const signatureContent = (
    <div className="space-y-4">
      {/* Qualified Signature Flow with integrated Cancel button */}
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
          onCancel={isManager ? handleCancelSignature : undefined}
        />
      )}

      {/* Signature Status - Compact Single Line Layout */}
      <div className="pt-2 border-t">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Label + Badges */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t('contracts.signatureStatus')}:</span>
            <Badge 
              variant={managerSigned ? "default" : "outline"} 
              className={`text-xs ${managerSigned ? 'bg-green-600 hover:bg-green-600' : ''}`}
            >
              {managerSigned ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
              {t('contracts.manager')}
            </Badge>
            <Badge 
              variant={tenantSigned ? "default" : "outline"} 
              className={`text-xs ${tenantSigned ? 'bg-green-600 hover:bg-green-600' : ''}`}
            >
              {tenantSigned ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
              {t('contracts.tenant')}
            </Badge>
          </div>
          
          {/* Expiration - Inline */}
          {signature.expires_at && !isCompleted && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>|</span>
              <Clock className="h-3 w-3" />
              <span>{format(new Date(signature.expires_at), 'MMM d, yyyy')}</span>
            </div>
          )}
          
          {/* Action Buttons - Inline */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Initiate Signature Button (when manager hasn't signed yet) */}
            {!managerSigned && isManager && isQualifiedSignature && !showSigningForm && (
              <Button size="sm" variant="default" onClick={() => setShowSigningForm(true)}>
                <Shield className="h-3 w-3 mr-1" />
                {t('contractSignature.signNow') || 'Sign Now'}
              </Button>
            )}
            {/* Sign Button for Tenant */}
            {!tenantSigned && !isManager && isQualifiedSignature && !showSigningForm && (
              <Button size="sm" variant="default" onClick={() => setShowSigningForm(true)}>
                <Shield className="h-3 w-3 mr-1" />
                {t('contractSignature.signNow') || 'Sign Now'}
              </Button>
            )}
            {/* Send Reminder Button */}
            {!isCompleted && managerSigned && !tenantSigned && isManager && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSendReminder}
                disabled={reminderLoading || !canSendReminder()}
                title={!canSendReminder() ? t('contractSignature.reminder.cooldownMessage').replace('{time}', getNextReminderTime() || '') : ''}
              >
                {reminderLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Bell className="h-3 w-3" />
                )}
                <span className="ml-1 hidden sm:inline">{t('contractSignature.reminder.sendReminder')}</span>
              </Button>
            )}
          </div>
        </div>
        
        {/* Reminder count info - subtle text below */}
        {!isCompleted && managerSigned && !tenantSigned && isManager && signature.reminder_count !== null && signature.reminder_count > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            {t('contractSignature.reminder.reminderCount')
              .replace('{count}', String(signature.reminder_count))
              .replace('{max}', '3')}
          </p>
        )}
      </div>

      {/* Download completed contract */}
      {isCompleted && signature.signed_document_url && (
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
              
              try {
                const url = await documentService.getSignedUrl(STORAGE_BUCKETS.QUALIFIED_CONTRACTS, storagePath);
                
                if (newWindow) {
                  newWindow.location.href = url;
                }
              } catch (error) {
                newWindow?.close();
                toast({
                  title: t('common.error'),
                  description: 'Failed to generate download link',
                  variant: 'destructive',
                });
              }
            }}
          >
            {t('common.download') || 'Download'}
          </Button>
        </div>
      )}
    </div>
  );

  // Section header with status badge
  const sectionHeader = (
    <div className="flex items-center gap-2 mb-2">
      <FileSignature className="h-5 w-5" />
      <h4 className="font-semibold">{methodDisplay.title}</h4>
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
    </div>
  );

  const sectionMeta = (
    <>
      <p className="text-sm text-muted-foreground">
        {t('contractSignature.initiated')}: {format(new Date(signature.initiated_at), 'PPP')}
      </p>
      {sourceDocument && (
        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span>{t('contractSignature.document') || 'Document'}: {sourceDocument.document_title}</span>
          <Badge variant="outline" className="text-xs">{sourceDocument.file_name}</Badge>
        </div>
      )}
    </>
  );

  if (asSection) {
    return (
      <div className="space-y-3">
        {sectionHeader}
        {sectionMeta}
        {signatureContent}
        <UpgradeDialog
          open={showUpgradeDialog}
          onOpenChange={setShowUpgradeDialog}
          feature="Digital Signatures"
          description="requires a Pro or Enterprise plan to create legally-binding electronic signatures for contracts."
          requiredPlan="pro"
        />
      </div>
    );
  }

  return (
    <Card className="card-shine">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileSignature className="h-4 w-4" />
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
      <CardContent>{signatureContent}</CardContent>
      
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
