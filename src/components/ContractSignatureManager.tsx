import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { FileSignature, CheckCircle2, Clock, Shield, Smartphone, AlertCircle, QrCode } from "lucide-react";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DocusealForm } from "@docuseal/react";

interface ContractSignature {
  id: string;
  workflow_status: string;
  signing_method: string | null;
  manager_signed_at: string | null;
  manager_signature_method: string | null;
  tenant_signed_at: string | null;
  tenant_signature_method: string | null;
  signed_document_url: string | null;
  initiated_at: string;
  expires_at: string | null;
  completed_at: string | null;
  dock_workflow_id: string | null;
  dock_contract_url: string | null;
  dock_manager_signature_proof: string | null;
  dock_tenant_signature_proof: string | null;
  kyc_enforced: boolean | null;
  docuseal_submission_id: string | null;
  docuseal_audit_log_url: string | null;
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
  const [loading, setLoading] = useState(false);
  const [signature, setSignature] = useState<ContractSignature | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [signingMethod, setSigningMethod] = useState<'mock' | 'dock' | 'docuseal'>('mock');
  const [managerKYCVerified, setManagerKYCVerified] = useState(false);
  const [tenantKYCVerified, setTenantKYCVerified] = useState(false);
  const [kycLoading, setKycLoading] = useState(true);
  const [docusealToken, setDocusealToken] = useState<string | null>(null);
  const [rentAgreement, setRentAgreement] = useState<any>(null);
  const [agreementLoading, setAgreementLoading] = useState(true);
  

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
      setInitialized(true);
    } catch (error) {
      console.error('Error loading signature:', error);
    }
  };

  const checkKYCStatus = async () => {
    try {
      setKycLoading(true);
      
      // Get manager profile
      const { data: property } = await supabase
        .from('properties')
        .select('manager_id')
        .eq('id', propertyId)
        .single();
      
      if (property) {
        const { data: managerProfile } = await supabase
          .from('profiles')
          .select('kyc_status, kyc_wallet_did')
          .eq('id', property.manager_id)
          .single();
        
        setManagerKYCVerified(
          managerProfile?.kyc_status === 'verified' && 
          !!managerProfile?.kyc_wallet_did
        );
      }
      
      // Get tenant profile
      const { data: tenancy } = await supabase
        .from('property_tenants')
        .select('tenant_id')
        .eq('id', tenancyId)
        .single();
      
      if (tenancy) {
        const { data: tenantProfile } = await supabase
          .from('profiles')
          .select('kyc_status, kyc_wallet_did')
          .eq('id', tenancy.tenant_id)
          .single();
        
        setTenantKYCVerified(
          tenantProfile?.kyc_status === 'verified' && 
          !!tenantProfile?.kyc_wallet_did
        );
      }
    } catch (error) {
      console.error('Error checking KYC:', error);
    } finally {
      setKycLoading(false);
    }
  };

  const checkRentAgreement = async () => {
    try {
      setAgreementLoading(true);
      const { data } = await supabase
        .from('rent_agreements')
        .select('id, contract_pdf_url')
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
      checkKYCStatus();
      checkRentAgreement();
    }
  }, [initialized]);

  // Reset states when signing method changes
  useEffect(() => {
    if (signature?.signing_method && signingMethod !== signature.signing_method) {
      setDocusealToken(null);
    }
  }, [signingMethod, signature?.signing_method]);

  const handleInitiateSignature = async () => {
    setLoading(true);
    try {
      let functionName = 'initiate-contract-signature';
      if (signingMethod === 'dock') {
        functionName = 'initiate-dock-contract-signature';
      } else if (signingMethod === 'docuseal') {
        functionName = 'initiate-docuseal-signature';
      }

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { tenancyId, propertyId }
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

  const generateDocusealToken = async (role: 'manager' | 'tenant') => {
    if (!signature?.docuseal_submission_id) return null;
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-docuseal-token', {
        body: { 
          signatureId: signature.id,
          role 
        }
      });

      if (error) throw error;
      if (!data?.success || !data?.token) {
        throw new Error('Failed to generate DocuSeal token');
      }

      return data.token;
    } catch (error) {
      console.error('Error generating DocuSeal token:', error);
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : 'Failed to generate signing token',
        variant: "destructive",
      });
      return null;
    }
  };

  const handleDocusealComplete = async () => {
    try {
      await loadSignature();
      onRefresh?.();
      toast({
        title: t('contractSignature.signed'),
        description: 'Document signed successfully',
      });
    } catch (error) {
      console.error('Error after DocuSeal completion:', error);
    }
  };

  const handleMockSign = async (role: 'manager' | 'tenant') => {
    if (!signature) return;
    
    setLoading(true);
    try {
      const methods = ['certificado_digital', 'clave'];
      const randomMethod = methods[Math.floor(Math.random() * methods.length)];

      const { data, error } = await supabase.functions.invoke('handle-signature-webhook', {
        body: {
          signatureId: signature.id,
          signerRole: role,
          signatureMethod: randomMethod,
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
    
    if (method === 'certificado_digital') {
      return (
        <Badge variant="outline" className="text-xs">
          <Shield className="h-3 w-3 mr-1" />
          {t('contractSignature.methods.certificadoDigital')}
        </Badge>
      );
    }
    if (method === 'clave') {
      return (
        <Badge variant="outline" className="text-xs">
          <Smartphone className="h-3 w-3 mr-1" />
          {t('contractSignature.methods.clave')}
        </Badge>
      );
    }
    if (method === 'verifiable_credential') {
      return (
        <Badge variant="outline" className="text-xs">
          <Shield className="h-3 w-3 mr-1" />
          Dock Labs VC
        </Badge>
      );
    }
    return <Badge variant="outline" className="text-xs">{method}</Badge>;
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
          {kycLoading && (
            <Alert>
              <AlertDescription>
                {t('contractSignature.checkingKYC')}
              </AlertDescription>
            </Alert>
          )}

          {!kycLoading && isManager && signingMethod === 'dock' && (!managerKYCVerified || !tenantKYCVerified) && (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <p className="font-semibold">{t('contractSignature.kycOptional')}</p>
                <p className="text-sm">{t('contractSignature.kycEnhancement')}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.location.href = '/settings?tab=identity'}
                  className="mt-2"
                >
                  {t('contractSignature.completeVerificationLink')}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {!agreementLoading && isManager && signingMethod === 'docuseal' && !rentAgreement?.contract_pdf_url && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-semibold">Rent Agreement Required</p>
                <p className="text-sm mt-1">
                  Please create a rent agreement with a PDF contract before using DocuSeal signatures.
                  You can upload a contract in the "Rent Agreement" section.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {isManager && (
            <>
              {/* Signing Method Selector */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Select Signing Method</Label>
                <RadioGroup value={signingMethod} onValueChange={(v) => setSigningMethod(v as 'mock' | 'dock')}>
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
                    <RadioGroupItem 
                      value="dock" 
                      id="dock" 
                      disabled={false}
                    />
                    <Label htmlFor="dock" className="flex-1 cursor-pointer">
                      <div className="font-medium">Dock Labs Verifiable Credentials</div>
                      <div className="text-sm text-muted-foreground">
                        Secure, verifiable digital signatures with optional blockchain identity verification
                      </div>
                      {!kycLoading && (
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {managerKYCVerified ? (
                            <Badge variant="outline" className="text-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Manager: {t('contractSignature.kycVerified')}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Manager: {t('contractSignature.kycNotVerified')}
                            </Badge>
                          )}
                          {tenantKYCVerified ? (
                            <Badge variant="outline" className="text-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Tenant: {t('contractSignature.kycVerified')}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Tenant: {t('contractSignature.kycNotVerified')}
                            </Badge>
                          )}
                        </div>
                      )}
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
                </RadioGroup>
              </div>

              <Button 
                onClick={handleInitiateSignature} 
                disabled={
                  loading || 
                  kycLoading || 
                  agreementLoading ||
                  (signingMethod === 'docuseal' && !rentAgreement?.contract_pdf_url)
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
  const isDockSignature = signature.signing_method === 'dock' || signature.dock_workflow_id;
  const isDocusealSignature = signature.signing_method === 'docuseal' || signature.docuseal_submission_id;

  // Generate DocuSeal token if needed
  useEffect(() => {
    const loadDocusealToken = async () => {
      if (isDocusealSignature && !isCompleted && signature?.docuseal_submission_id) {
        const role = isManager ? 'manager' : 'tenant';
        const token = await generateDocusealToken(role);
        setDocusealToken(token);
      }
    };
    
    loadDocusealToken();
  }, [isDocusealSignature, isCompleted, signature?.docuseal_submission_id, isManager]);

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
          {isDockSignature && (
            <Badge variant="outline" className="ml-2">
              <Shield className="h-3 w-3 mr-1" />
              Dock Labs
            </Badge>
          )}
          {isDocusealSignature && (
            <Badge variant="outline" className="ml-2">
              <FileSignature className="h-3 w-3 mr-1" />
              DocuSeal
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
      </CardHeader>
      <CardContent className="space-y-4">
        {/* DocuSeal Form - Show if DocuSeal signature and not completed */}
        {isDocusealSignature && !isCompleted && docusealToken && signature?.docuseal_submission_id && (
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-sm font-medium mb-3 flex items-center gap-2">
              <FileSignature className="h-4 w-4" />
              Sign Document Below
            </div>
            <DocusealForm
              src={`https://docuseal.com/d/${signature.docuseal_submission_id}`}
              token={docusealToken}
              onComplete={handleDocusealComplete}
              className="min-h-[600px] w-full"
            />
          </div>
        )}

        {/* Dock QR Code - Show if Dock signature and not completed */}
        {isDockSignature && !isCompleted && signature.dock_contract_url && (
          <div className="flex flex-col items-center gap-3 p-4 bg-muted rounded-lg">
            <div className="text-sm font-medium flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              Scan to Sign with Dock Wallet
            </div>
            <QRCodeSVG 
              value={signature.dock_contract_url} 
              size={200}
              level="H"
              includeMargin
            />
            <div className="text-xs text-muted-foreground text-center max-w-xs">
              Scan this QR code with your Dock Wallet app to review and sign the contract using verifiable credentials
            </div>
          </div>
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
                {isDockSignature && signature.dock_manager_signature_proof && (
                  <div className="flex items-center gap-1 text-green-600">
                    <Shield className="h-3 w-3" />
                    <span className="text-xs">Verified Credential</span>
                  </div>
                )}
              </div>
            )}
            {!managerSigned && isManager && !isDockSignature && (
              <Button 
                size="sm" 
                onClick={() => handleMockSign('manager')} 
                disabled={loading}
                className="mt-2"
              >
                {t('contractSignature.signNow')} (Mock)
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
                {isDockSignature && signature.dock_tenant_signature_proof && (
                  <div className="flex items-center gap-1 text-green-600">
                    <Shield className="h-3 w-3" />
                    <span className="text-xs">Verified Credential</span>
                  </div>
                )}
              </div>
            )}
            {!tenantSigned && !isManager && !isDockSignature && (
              <Button 
                size="sm" 
                onClick={() => handleMockSign('tenant')} 
                disabled={loading}
                className="mt-2"
              >
                {t('contractSignature.signNow')} (Mock)
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
              <Button size="sm" variant="outline" asChild>
                <a href={signature.signed_document_url} target="_blank" rel="noopener noreferrer">
                  {t('common.download')}
                </a>
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
    </Card>
  );
};
