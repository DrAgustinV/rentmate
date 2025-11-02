import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { FileSignature, CheckCircle2, Clock, Shield, Smartphone, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface ContractSignature {
  id: string;
  workflow_status: string;
  manager_signed_at: string | null;
  manager_signature_method: string | null;
  tenant_signed_at: string | null;
  tenant_signature_method: string | null;
  signed_document_url: string | null;
  initiated_at: string;
  expires_at: string | null;
  completed_at: string | null;
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

  if (!initialized) {
    loadSignature();
  }

  const handleInitiateSignature = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('initiate-contract-signature', {
        body: { tenancyId, propertyId }
      });

      if (error) throw error;

      toast({
        title: t('contractSignature.initiated'),
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
        <CardContent>
          {isManager ? (
            <Button onClick={handleInitiateSignature} disabled={loading}>
              <FileSignature className="h-4 w-4 mr-2" />
              {t('contractSignature.initiate')}
            </Button>
          ) : (
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
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
            {!managerSigned && isManager && (
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
            {!tenantSigned && !isManager && (
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
