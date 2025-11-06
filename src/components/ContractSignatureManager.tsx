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
  kyc_enforced: boolean | null;
  docuseal_submission_id: string | null;
  docuseal_audit_log_url: string | null;
  manager_embed_slug: string | null;
  tenant_embed_slug: string | null;
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
  const [signingMethod, setSigningMethod] = useState<'mock' | 'docuseal'>('mock');
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
    }
  }, [initialized]);


  const handleInitiateSignature = async () => {
    setLoading(true);
    try {
      let functionName = 'initiate-contract-signature';
      if (signingMethod === 'docuseal') {
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
          {isManager && (
            <>
              {/* Signing Method Selector */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Select Signing Method</Label>
                <RadioGroup value={signingMethod} onValueChange={(v) => setSigningMethod(v as 'mock' | 'docuseal')}>
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
                </RadioGroup>
              </div>

              <Button 
                onClick={handleInitiateSignature} 
                disabled={loading || agreementLoading}
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
  const isDocusealSignature = signature.signing_method === 'docuseal' || signature.docuseal_submission_id;

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
        {isDocusealSignature && !isCompleted && (
          (() => {
            const embedSlug = isManager ? signature.manager_embed_slug : signature.tenant_embed_slug;
            if (!embedSlug) return null;
            
            return (
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm font-medium mb-3 flex items-center gap-2">
                  <FileSignature className="h-4 w-4" />
                  Sign Document Below
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
            {!managerSigned && isManager && !isDocusealSignature && (
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
              </div>
            )}
            {!tenantSigned && !isManager && !isDocusealSignature && (
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
