import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { FileSignature, CheckCircle2, Clock, Shield, Smartphone, AlertCircle, QrCode, X, Check, FileText } from "lucide-react";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DocusealForm } from "@docuseal/react";
import { QualifiedSignatureFlow } from "@/components/signature/QualifiedSignatureFlow";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { getProviderUI } from "@/lib/signature/providers.config";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  onRefresh?: () => void;
}

export const ContractSignatureManager = ({ 
  tenancyId, 
  propertyId, 
  isManager,
  onRefresh 
}: ContractSignatureManagerProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { canCreateSignature, isPro, subscription } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [signature, setSignature] = useState<ContractSignature | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [signingMethod, setSigningMethod] = useState<string>('mock');
  const [rentAgreement, setRentAgreement] = useState<any>(null);
  const [agreementLoading, setAgreementLoading] = useState(true);
  const [showSigningForm, setShowSigningForm] = useState(false);
  const [propertyCountry, setPropertyCountry] = useState<string | null>(null);
  const [qualifiedProviders, setQualifiedProviders] = useState<Array<{
    provider_code: string;
    provider_name: string;
    protocol_scheme: string;
    installation_url: string | null;
  }>>([]);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('');
  const [sourceDocument, setSourceDocument] = useState<{ document_title: string; file_name: string } | null>(null);

  // Use React Query for tenancy documents - shares query key with CopyTemplatesDialog
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
      return null;
    }
  };


  const checkRentAgreement = async () => {
    try {
      setAgreementLoading(true);
      const { data } = await supabase
        .from('rent_agreements')
        .select('id')
        .eq('tenancy_id', tenancyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      setRentAgreement(data);
    } catch (error) {
      console.error('Error checking rent agreement:', error);
    } finally {
      setAgreementLoading(false);
    }
  };

  useEffect(() => {
    if (!initialized) {
      loadSignature();
      checkRentAgreement();
      fetchPropertyCountryAndProvider();
    }
  }, [initialized]);

  useEffect(() => {
    console.log('🎯 qualifiedProviders state updated:', qualifiedProviders);
  }, [qualifiedProviders]);

  const fetchPropertyCountryAndProvider = async () => {
    try {
      console.log('🔍 Fetching property country for propertyId:', propertyId);
      
      // Fetch property country
      const { data: property } = await supabase
        .from('properties')
        .select('country')
        .eq('id', propertyId)
        .single();
      
      console.log('📍 Property country fetched:', property?.country);
      setPropertyCountry(property?.country || null);

    // Fetch ALL qualified providers for this country (using ISO code)
    if (property?.country) {
      console.log('🔎 Querying qualified_signature_providers with country_codes contains:', [property.country]);
      
      const { data: providers, error } = await supabase
        .from('qualified_signature_providers')
        .select('provider_code, provider_name, protocol_scheme, installation_url, country_codes, is_active')
        .contains('country_codes', [property.country])
        .eq('is_active', true)
        .order('provider_name');
      
      console.log('✅ Providers query result:', { providers, error });
      console.log('📋 Setting qualifiedProviders to:', providers || []);
      
      setQualifiedProviders(providers || []);
    }
    } catch (error) {
      console.error('❌ Error fetching property country:', error);
    }
  };


  const handleInitiateSignature = async () => {
    setLoading(true);
    try {
      let functionName = 'initiate-contract-signature';
      let providerCode = null;

      if (signingMethod === 'docuseal') {
        functionName = 'initiate-docuseal-signature';
      } else if (signingMethod.startsWith('qualified:')) {
        providerCode = signingMethod.split(':')[1];
        // YouSign has its own dedicated function
        if (providerCode === 'yousign') {
          functionName = 'initiate-yousign-signature';
        } else {
          functionName = 'initiate-qualified-signature';
        }
      }

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { 
          tenancyId, 
          propertyId,
          ...(providerCode && providerCode !== 'yousign' && { providerCode }),
          ...(selectedDocumentId && { documentId: selectedDocumentId })
        }
      });

      if (error) throw error;

      if (!data?.success) {
        const errorMsg = data?.error || 'Unknown error';
        
        // Parse backend errors into friendly messages
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
      const errorMsg = error.message || 'Failed to initiate signature';
      
      // Parse error messages
      if (errorMsg.includes('Manager KYC')) {
        toast({
          title: t('contractSignature.verificationRequired'),
          description: t('contractSignature.managerKYCRequired'),
          variant: "destructive",
        });
      } else if (errorMsg.includes('Tenant KYC')) {
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
    } finally {
      setLoading(false);
    }
  };


  const handleDocusealComplete = async () => {
    try {
      setShowSigningForm(false);
      
      // Call backend to finalize and update database with signature timestamps
      const { data, error } = await supabase.functions.invoke('finalize-docuseal-signature', {
        body: { signatureId: signature.id }
      });
      
      if (error) throw error;
      
      // Reload signature data to reflect updated timestamps
      await loadSignature();
      onRefresh?.();
      
      toast({
        title: t('contractSignature.signed'),
        description: data?.both_signed 
          ? 'Both parties have signed! Contract is complete.'
          : 'Document signed successfully',
      });
    } catch (error) {
      console.error('Error after DocuSeal completion:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to finalize signature. Please try again.',
        variant: 'destructive'
      });
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
        title: 'Signature Cancelled',
        description: 'You can now select a different signing method',
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

  const handleMockSign = async (role: 'manager' | 'tenant') => {
    if (!signature) return;
    
    setLoading(true);
    try {
      // Use SAS (Simple Advanced Signature) for mock signatures
      const signatureMethod = 'SAS';

      const { data, error } = await supabase.functions.invoke('handle-signature-webhook', {
        body: {
          signatureId: signature.id,
          signerRole: role,
          signatureMethod,
          ipAddress: '127.0.0.1',
        }
      });

      if (error) throw error;

      toast({
        title: t('contractSignature.signed'),
        description: data.message,
      });

      await loadSignature();
      onRefresh?.();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSignatureMethodBadge = (method: string | null) => {
    if (!method) return null;
    
    // Handle SAS/AES/QES signature methods
    switch (method) {
      case 'QES':
        return (
          <Badge variant="default" className="text-xs bg-primary">
            <Shield className="h-3 w-3 mr-1" />
            Qualified (QES)
          </Badge>
        );
      case 'AES':
        return (
          <Badge variant="outline" className="text-xs border-primary text-primary">
            <Shield className="h-3 w-3 mr-1" />
            Advanced (AES)
          </Badge>
        );
      case 'SAS':
        return (
          <Badge variant="outline" className="text-xs">
            <FileSignature className="h-3 w-3 mr-1" />
            Simple (SAS)
          </Badge>
        );
      default:
        return <Badge variant="outline" className="text-xs">{method}</Badge>;
    }
  };

  if (!signature) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            {t('contractSignature.title')}
          </CardTitle>
          <CardDescription>
            {t('contractSignature.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isManager && (
            <>
              {/* Signing Method Selector */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Select Signing Method</Label>
                <RadioGroup value={signingMethod} onValueChange={setSigningMethod}>
                  <div className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-accent">
                    <RadioGroupItem value="mock" id="mock" />
                    <Label htmlFor="mock" className="flex-1 cursor-pointer">
                      <div className="font-medium">Mock Signature (Testing)</div>
                      <div className="text-sm text-muted-foreground">
                        Quick signature for testing purposes
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-accent">
                    <RadioGroupItem value="docuseal" id="docuseal" />
                    <Label htmlFor="docuseal" className="flex-1 cursor-pointer">
                      <div className="font-medium">DocuSeal</div>
                      <div className="text-sm text-muted-foreground">
                        Professional e-signature workflow with audit trail
                      </div>
                    </Label>
                  </div>

                  {/* Show each qualified provider as a separate option */}
                  {qualifiedProviders.map((provider) => {
                    console.log('🎨 Rendering provider option:', provider);
                    const providerUI = getProviderUI(provider.provider_code);
                    const ProviderIcon = providerUI?.icon || Shield;
                    
                    return (
                      <div 
                        key={provider.provider_code}
                        className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-accent border-primary bg-primary/5"
                      >
                        <RadioGroupItem 
                          value={`qualified:${provider.provider_code}`} 
                          id={provider.provider_code} 
                        />
                        <Label htmlFor={provider.provider_code} className="flex-1 cursor-pointer">
                          <div className="font-medium flex items-center gap-2">
                            <ProviderIcon className="h-4 w-4 text-primary" />
                            {provider.provider_name}
                            {provider.provider_code === 'openapi' && (
                              <Badge variant="secondary" className="text-xs">
                                No installation required
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {providerUI?.description || 'Qualified electronic signature'}
                          </div>
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>
              </div>

              {/* Document Selector - Only shown for qualified signatures */}
              {signingMethod.startsWith('qualified:') && (
                <div className="space-y-3">
                  <Label htmlFor="document-select" className="text-base font-semibold">
                    Select Document to Sign
                  </Label>
                  <Select value={selectedDocumentId} onValueChange={setSelectedDocumentId}>
                    <SelectTrigger id="document-select" className="w-full">
                      <SelectValue placeholder="Choose a document..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tenancyDocuments.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No documents available
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
                  {signingMethod.startsWith('qualified:') && !selectedDocumentId && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Please select a document before initiating the signature
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              <Button 
                onClick={handleInitiateSignature} 
                disabled={
                  loading || 
                  agreementLoading || 
                  (signingMethod.startsWith('qualified:') && !selectedDocumentId)
                }
                className="w-full"
              >
                <FileSignature className="h-4 w-4 mr-2" />
                {loading ? t('common.loading') : t('contractSignature.initiate')}
              </Button>
            </>
          )}
          {!isManager && (
            <div className="text-sm text-muted-foreground">
              {t('contractSignature.waitingForManager')}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const isCompleted = signature.workflow_status === 'completed';
  const managerSigned = !!signature.manager_signed_at;
  const tenantSigned = !!signature.tenant_signed_at;
  const isDocusealSignature = signature.signing_method_provider === 'docuseal' || signature.docuseal_submission_id;
  const isQualifiedSignature = ['openapi', 'yousign'].includes(signature.signing_method_provider || '');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSignature className="h-5 w-5" />
          {t('contractSignature.title')}
          {isCompleted && (
            <Badge variant="default" className="ml-auto">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {t('contractSignature.status.completed')}
            </Badge>
          )}
          {!isCompleted && (
            <Badge variant="secondary" className="ml-auto">
              <Clock className="h-3 w-3 mr-1" />
              {t('contractSignature.status.inProgress')}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {t('contractSignature.initiated')}: {format(new Date(signature.initiated_at), 'PPP')}
          {isDocusealSignature && (
            <Badge variant="outline" className="ml-2">
              <FileSignature className="h-3 w-3 mr-1" />
              DocuSeal
            </Badge>
          )}
          {isQualifiedSignature && (
            <Badge variant="outline" className="ml-2">
              <Shield className="h-3 w-3 mr-1" />
              {signature.signing_method_provider?.toUpperCase()} ({signature.signature_method})
            </Badge>
          )}
          {isCompleted && signature.kyc_enforced && (
            <Badge variant="outline" className="ml-2 text-green-600">
              <Shield className="h-3 w-3 mr-1" />
              {t('contractSignature.blockchainVerified')}
            </Badge>
          )}
          {isCompleted && !signature.kyc_enforced && (
            <Badge variant="outline" className="ml-2 text-muted-foreground">
              <FileSignature className="h-3 w-3 mr-1" />
              {t('contractSignature.standardSignature')}
            </Badge>
          )}
        </CardDescription>
        {sourceDocument && (
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>Document: {sourceDocument.document_title}</span>
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
            Cancel and Choose Different Method
          </Button>
        )}

        {/* Qualified Signature Flow - Show for qualified signatures */}
        {isQualifiedSignature && !isCompleted && showSigningForm && (
          <QualifiedSignatureFlow
            tenancyId={tenancyId}
            propertyId={propertyId}
            providerCode={signature.signing_method_provider || 'yousign'}
            onComplete={() => {
              setShowSigningForm(false);
              loadSignature();
              onRefresh?.();
            }}
          />
        )}

        {/* DocuSeal Form - Show only if current user hasn't signed and form is visible */}
        {isDocusealSignature && !isCompleted && showSigningForm && (
          (() => {
            const embedSlug = isManager ? signature.manager_embed_slug : signature.tenant_embed_slug;
            const currentUserSigned = isManager ? managerSigned : tenantSigned;
            
            if (!embedSlug || currentUserSigned) return null;
            
            return (
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm font-medium mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSignature className="h-4 w-4" />
                    Sign Document Below
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setShowSigningForm(false)}
                  >
                    Close
                  </Button>
                </div>
                <DocusealForm
                  src={`https://docuseal.eu/s/${embedSlug}`}
                  onComplete={handleDocusealComplete}
                  className="min-h-[600px] w-full"
                />
              </div>
            );
          })()
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
              {t('contractSignature.managerSignature')}
            </div>
            {managerSigned && (
              <div className="text-sm text-muted-foreground space-y-1">
                <div>{format(new Date(signature.manager_signed_at!), 'PPP p')}</div>
                <div>{getSignatureMethodBadge(signature.manager_signature_method)}</div>
              </div>
            )}
            {!managerSigned && isManager && !isDocusealSignature && !isQualifiedSignature && (
              <Button 
                size="sm" 
                onClick={() => handleMockSign('manager')} 
                disabled={loading}
                className="mt-2"
              >
                {t('contractSignature.signNow')} (Mock)
              </Button>
            )}
            {!managerSigned && isManager && isDocusealSignature && !showSigningForm && (
              <Button 
                size="sm" 
                onClick={() => setShowSigningForm(true)} 
                className="mt-2"
              >
                <FileSignature className="h-4 w-4 mr-2" />
                Sign Document
              </Button>
            )}
            {!managerSigned && isManager && isQualifiedSignature && !showSigningForm && (
              <Button 
                size="sm" 
                onClick={() => setShowSigningForm(true)} 
                className="mt-2"
              >
                <Shield className="h-4 w-4 mr-2" />
                Sign with {signature.signing_method_provider?.toUpperCase()}
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
              {t('contractSignature.tenantSignature')}
            </div>
            {tenantSigned && (
              <div className="text-sm text-muted-foreground space-y-1">
                <div>{format(new Date(signature.tenant_signed_at!), 'PPP p')}</div>
                <div>{getSignatureMethodBadge(signature.tenant_signature_method)}</div>
              </div>
            )}
            {!tenantSigned && !isManager && !isDocusealSignature && !isQualifiedSignature && (
              <Button 
                size="sm" 
                onClick={() => handleMockSign('tenant')} 
                disabled={loading}
                className="mt-2"
              >
                {t('contractSignature.signNow')} (Mock)
              </Button>
            )}
            {!tenantSigned && !isManager && isDocusealSignature && !showSigningForm && (
              <Button 
                size="sm" 
                onClick={() => setShowSigningForm(true)} 
                className="mt-2"
              >
                <FileSignature className="h-4 w-4 mr-2" />
                Sign Document
              </Button>
            )}
            {!tenantSigned && !isManager && isQualifiedSignature && !showSigningForm && (
              <Button 
                size="sm" 
                onClick={() => setShowSigningForm(true)} 
                className="mt-2"
              >
                <Shield className="h-4 w-4 mr-2" />
                Sign with {signature.signing_method_provider?.toUpperCase()}
              </Button>
            )}
          </div>
        </div>

        {isCompleted && signature.signed_document_url && (
          <>
            <Separator />
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <div className="font-medium">{t('contractSignature.downloadContract')}</div>
                <div className="text-sm text-muted-foreground">
                  {t('contractSignature.signedOn')}: {format(new Date(signature.completed_at!), 'PPP')}
                </div>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={async () => {
                  // Open window immediately to preserve user gesture (prevents popup block)
                  const newWindow = window.open('', '_blank');
                  
                  // Extract path from URL if it's a full URL, or use as-is if it's just a path
                  let storagePath = signature.signed_document_url!;
                  if (storagePath.includes('/qualified-contracts/')) {
                    storagePath = storagePath.split('/qualified-contracts/')[1];
                  }
                  
                  const { data, error } = await supabase.storage
                    .from('qualified-contracts')
                    .createSignedUrl(storagePath, 3600); // 1 hour expiry
                  
                  if (error || !data?.signedUrl) {
                    newWindow?.close(); // Close the blank window on error
                    toast({
                      title: t('common.error'),
                      description: 'Failed to generate download link',
                      variant: 'destructive',
                    });
                    return;
                  }
                  
                  // Navigate the already-open window to the signed URL
                  if (newWindow) {
                    newWindow.location.href = data.signedUrl;
                  }
                }}
              >
                {t('common.download')}
              </Button>
            </div>
          </>
        )}

        {signature.expires_at && !isCompleted && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium text-yellow-900 dark:text-yellow-100">
                {t('contractSignature.expiresOn')}: {format(new Date(signature.expires_at), 'PPP')}
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
