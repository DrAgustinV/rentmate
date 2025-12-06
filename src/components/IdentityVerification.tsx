import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, AlertCircle, QrCode, CheckCircle2, Gift, ExternalLink, RefreshCw } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useKYC, KYCProvider, OpenAPIVerificationLevel } from "@/hooks/useKYC";
import { useLanguage } from "@/contexts/LanguageContext";
import { isKYCExpiringSoon } from "@/lib/validations/kyc.schema";
import { useToast } from "@/hooks/use-toast";

// Helper function to mask document ID for security
const maskDocumentId = (id: string | null) => {
  if (!id || id.length <= 4) return id || '';
  return '****' + id.slice(-4);
};

export function IdentityVerification() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const {
    kycProfile,
    loading,
    initiating,
    checkingStatus,
    isVerified,
    isPending,
    canInitiate,
    currentProvider,
    initiateVerification,
    cancelVerification,
    checkDiditStatus,
  } = useKYC();

  const [selectedProvider, setSelectedProvider] = useState<KYCProvider>('didit');
  const [selectedLevel, setSelectedLevel] = useState<OpenAPIVerificationLevel>('basic');

  const getStatusBadge = (status: string, provider?: string) => {
    // Show provider in badge for verified status - use "Government ID" for didit
    const providerLabel = provider === 'didit' 
      ? 'Government ID'
      : provider?.startsWith('openapi_') 
      ? 'Government ID'
      : provider === 'kilt' ? 'KILT' : '';

    switch (status) {
      case "verified":
        return (
          <Badge className="bg-green-500">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {t('kyc.status.verified')} {providerLabel && `(${providerLabel})`}
          </Badge>
        );
      case "pending":
      case "in_progress":
        return (
          <Badge variant="outline">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            {t(`kyc.status.${status === 'pending' ? 'pending' : 'inProgress'}`)}
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            {t('kyc.status.rejected')}
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="secondary">
            <AlertCircle className="w-3 h-3 mr-1" />
            {t('kyc.status.expired')}
          </Badge>
        );
      default:
        return <Badge variant="secondary">{t('kyc.status.notStarted')}</Badge>;
    }
  };

  const handleInitiate = async () => {
    await initiateVerification(selectedProvider, selectedLevel);
  };

  // Dynamic subtitle based on verification status
  const getSubtitle = () => {
    if (isVerified) return t('kyc.subtitleVerified');
    if (isPending) return t('kyc.subtitlePending');
    return t('kyc.subtitleNotVerified');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            {t('kyc.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const showExpiryWarning = isVerified && 
    kycProfile?.kyc_expires_at && 
    isKYCExpiringSoon(kycProfile.kyc_expires_at);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5" />
          {t('kyc.title')}
        </CardTitle>
        <CardDescription>
          {getSubtitle()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Display */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">{t('kyc.statusLabel')}</p>
            <p className="text-xs text-muted-foreground">
              {isVerified && kycProfile?.kyc_verified_at
                ? `${t('kyc.verifiedOn')} ${new Date(kycProfile.kyc_verified_at).toLocaleDateString()}`
                : t('kyc.notVerified')}
            </p>
          </div>
          {kycProfile && getStatusBadge(kycProfile.kyc_status, kycProfile.kyc_provider)}
        </div>

        {/* Expiry Alert */}
        {showExpiryWarning && (
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              {t('kyc.alerts.expiringSoon')}
            </AlertDescription>
          </Alert>
        )}

        {/* Verified - Show Expiry */}
        {isVerified && kycProfile?.kyc_expires_at && (
          <Alert>
            <AlertDescription>
              {t('kyc.expiresOn')} {new Date(kycProfile.kyc_expires_at).toLocaleDateString()}
            </AlertDescription>
          </Alert>
        )}

        {/* Provider Selection - Only show if can initiate */}
        {canInitiate && (
          <div className="space-y-4 pt-4 border-t">
            <Label className="text-base font-medium">Choose Verification Method</Label>
            
            <RadioGroup value={selectedProvider} onValueChange={(value) => setSelectedProvider(value as KYCProvider)}>
              {/* Government ID Option - FREE & Recommended */}
              <div className="flex items-start space-x-3 p-4 border-2 border-primary/50 rounded-lg hover:bg-muted/50 cursor-pointer bg-primary/5">
                <RadioGroupItem value="didit" id="didit" className="mt-1" />
                <div className="flex-1 space-y-2">
                  <Label htmlFor="didit" className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-green-600" />
                      <span className="font-medium">Full Identity Verification</span>
                      <Badge className="bg-green-500 text-white text-xs">Get Your Verified Badge</Badge>
                      <Badge variant="outline" className="text-xs">Recommended</Badge>
                    </div>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    ID verification with AI-powered document scanning
                  </p>
                  <p className="text-xs text-green-600 font-medium">
                    ✓ Fast and easy. Use your ID, passport or resident card.
                  </p>
                </div>
              </div>


              {/* KILT Option */}
              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="kilt" id="kilt" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="kilt" className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                      <span className="font-medium">KILT Protocol Identification</span>
                    </div>
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Blockchain-based decentralized identity (requires Sporran Wallet)
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>
        )}

        {/* Pending Verification with Cancel Option */}
        {isPending && (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Verification in progress via {
                  currentProvider === 'kilt' 
                    ? 'KILT Protocol' 
                    : currentProvider === 'didit'
                    ? 'Government ID verification'
                    : `Government ID verification (${kycProfile?.kyc_provider?.replace('openapi_', '')})`
                }
              </AlertDescription>
            </Alert>

            {kycProfile?.kyc_qr_code_url && (
              <div className="space-y-4">
                <Alert>
                  <QrCode className="w-4 h-4" />
                  <AlertDescription>
                    {currentProvider === 'kilt' 
                      ? t('kyc.scanQRCode')
                      : currentProvider === 'didit'
                      ? 'Click the button below or scan the QR code to verify your identity'
                      : 'Scan the QR code with your smartphone to complete verification'}
                  </AlertDescription>
                </Alert>
                
                {/* Direct link button for Government ID verification */}
                {currentProvider === 'didit' && (
                  <Button 
                    className="w-full" 
                    onClick={() => window.open(kycProfile.kyc_qr_code_url!, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Verification Page
                  </Button>
                )}
                
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <QRCodeSVG 
                    value={kycProfile.kyc_qr_code_url} 
                    size={192}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  {currentProvider === 'kilt' 
                    ? t('kyc.downloadSporran')
                    : currentProvider === 'didit'
                    ? 'Or scan with your phone camera to verify on mobile'
                    : 'Open the link on your mobile device to start the verification process'}
                </p>
              </div>
            )}

            {/* Check Status Button for Government ID verification */}
            {currentProvider === 'didit' && (
              <Button
                variant="outline"
                onClick={checkDiditStatus}
                disabled={checkingStatus}
                className="w-full"
              >
                {checkingStatus ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking Status...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Check Verification Status
                  </>
                )}
              </Button>
            )}

            <Alert>
              <AlertDescription className="space-y-3">
                <p className="text-sm">Want to try a different verification method?</p>
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      await cancelVerification();
                      toast({
                        title: "Verification Cancelled",
                        description: "You can now choose a different method.",
                      });
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: "Failed to cancel verification. Please try again.",
                        variant: "destructive",
                      });
                    }
                  }}
                  className="w-full"
                >
                  Cancel & Start New Verification
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Rejected Alert */}
        {kycProfile?.kyc_status === "rejected" && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              {t('kyc.alerts.rejected')}
            </AlertDescription>
          </Alert>
        )}

        {/* Expired Alert */}
        {kycProfile?.kyc_status === "expired" && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              {t('kyc.alerts.expired')}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Button */}
        {canInitiate && (
          <Button 
            onClick={handleInitiate}
            disabled={initiating}
            className="w-full"
          >
            {initiating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {kycProfile?.kyc_status === "expired" 
              ? t('kyc.actions.renewVerification')
              : t('kyc.actions.startVerification')}
          </Button>
        )}

        {/* Document ID Display - Masked for security */}
        {kycProfile?.kyc_wallet_did && (
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              {currentProvider === 'kilt' ? t('kyc.walletDID') : 'Document ID'}: 
              <code className="text-xs ml-1">{maskDocumentId(kycProfile.kyc_wallet_did)}</code>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
