import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { getProviderUI } from "@/lib/signature/providers.config";
import { FileSignature, Clock, AlertCircle, Download, ExternalLink, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useToast } from "@/hooks/use-toast";
import { OpenAPIOTPDialog } from "./OpenAPIOTPDialog";

interface QualifiedSignatureFlowProps {
  tenancyId: string;
  propertyId: string;
  providerCode: string;
  onComplete: () => void;
}

export const QualifiedSignatureFlow = ({
  tenancyId,
  propertyId,
  providerCode,
  onComplete,
}: QualifiedSignatureFlowProps) => {
  const { toast } = useToast();
  const [status, setStatus] = useState<'checking' | 'not_installed' | 'ready' | 'initiating' | 'waiting' | 'otp_required'>('checking');
  const [sessionData, setSessionData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOTPDialog, setShowOTPDialog] = useState(false);
  
  const providerUI = getProviderUI(providerCode);

  useEffect(() => {
    checkInstallation();
  }, []);

  const checkInstallation = async () => {
    if (!providerUI?.checkInstallation) {
      setStatus('ready');
      return;
    }

    try {
      const isInstalled = await providerUI.checkInstallation();
      setStatus(isInstalled ? 'ready' : 'not_installed');
    } catch (error) {
      console.error('Installation check failed:', error);
      setStatus('not_installed');
    }
  };

  const handleInitiateSignature = async () => {
    setStatus('initiating');
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('initiate-qualified-signature', {
        body: { tenancyId, propertyId, providerCode }
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to initiate signature');
      }

      setSessionData(data);

      // Check if OTP is required (OpenAPI flow)
      if (data.requiresOTP) {
        setStatus('otp_required');
        setShowOTPDialog(true);
        
        toast({
          title: "Verification Code Sent",
          description: "Please check your phone for the verification code",
        });
      } else {
        // Invoke protocol URL to launch native application (AutoFirma flow)
        if (data.protocolUrl) {
          window.location.href = data.protocolUrl;
        }

        setStatus('waiting');
        startPolling(data.sessionId);

        toast({
          title: "Signature Initiated",
          description: `${data.providerName} application should open automatically`,
        });
      }

    } catch (error: any) {
      console.error('Error initiating signature:', error);
      setError(error.message);
      setStatus('ready');
      
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleOTPSuccess = () => {
    setShowOTPDialog(false);
    toast({
      title: "Signature Complete",
      description: "Document signed successfully",
    });
    onComplete();
  };

  const startPolling = (sessionId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('contract_signatures')
          .select('manager_signed_at, tenant_signed_at, workflow_status')
          .eq('qualified_signature_session_id', sessionId)
          .single();

        if (data?.workflow_status === 'completed' || data?.manager_signed_at) {
          clearInterval(pollInterval);
          toast({
            title: "Signature Complete",
            description: "Document signed successfully",
          });
          onComplete();
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 3000);

    // Stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      if (status === 'waiting') {
        setStatus('ready');
        setError('Signature timeout. Please try again.');
      }
    }, 5 * 60 * 1000);
  };

  if (!providerUI) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Unknown signature provider: {providerCode}
        </AlertDescription>
      </Alert>
    );
  }

  const ProviderIcon = providerUI.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ProviderIcon className="h-5 w-5" />
          {providerUI.displayName}
        </CardTitle>
        <CardDescription>{providerUI.description}</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {status === 'checking' && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Checking if {providerUI.name} is installed...
            </AlertDescription>
          </Alert>
        )}

        {status === 'not_installed' && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="space-y-3">
              <p className="font-semibold">
                {providerUI.name} is not installed on your device
              </p>
              <p className="text-sm">
                You need to install {providerUI.name} to sign contracts with a qualified digital signature.
              </p>
              <Button variant="outline" size="sm" asChild>
                <a 
                  href={providerUI.installationGuideUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download {providerUI.name}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
              <Button 
                variant="link" 
                size="sm" 
                onClick={checkInstallation}
                className="text-xs"
              >
                I've installed it, check again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {status === 'ready' && (
          <>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Button 
              onClick={handleInitiateSignature} 
              className="w-full"
              size="lg"
            >
              <FileSignature className="h-4 w-4 mr-2" />
              Sign with {providerUI.name}
            </Button>
          </>
        )}

        {status === 'initiating' && (
          <Alert>
            <Clock className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Preparing signature workflow...
            </AlertDescription>
          </Alert>
        )}

        {status === 'waiting' && sessionData && (
          <div className="space-y-4">
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <p className="font-semibold mb-2">Waiting for signature...</p>
                <p className="text-sm text-muted-foreground">
                  {providerUI.name} application should have opened. Complete the signature there.
                </p>
              </AlertDescription>
            </Alert>

            {sessionData.protocolUrl && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Mobile Signing</span>
                  <Badge variant="outline">
                    <QrCode className="h-3 w-3 mr-1" />
                    Scan QR Code
                  </Badge>
                </div>
                
                <div className="flex justify-center p-4 bg-muted rounded-lg">
                  <QRCodeSVG 
                    value={sessionData.protocolUrl} 
                    size={200}
                    level="M"
                  />
                </div>
                
                <p className="text-xs text-center text-muted-foreground">
                  Scan this QR code with your mobile device to continue signing
                </p>
              </div>
            )}

            <Button 
              variant="outline" 
              onClick={() => window.location.href = sessionData.protocolUrl}
              className="w-full"
            >
              Open {providerUI.name} Again
            </Button>
          </div>
        )}

        {status === 'otp_required' && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold mb-2">Verification Code Sent</p>
              <p className="text-sm text-muted-foreground">
                Please enter the 6-digit code sent to your phone to complete the signature.
              </p>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>

      {showOTPDialog && sessionData && (
        <OpenAPIOTPDialog
          open={showOTPDialog}
          sessionId={sessionData.sessionId}
          phoneNumber={sessionData.phoneNumber || "your registered phone"}
          onSuccess={handleOTPSuccess}
          onCancel={() => {
            setShowOTPDialog(false);
            setStatus('ready');
          }}
        />
      )}
    </Card>
  );
};
