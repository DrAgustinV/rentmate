import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ShieldCheck, AlertCircle, QrCode, CheckCircle2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useKiltKYC } from "@/hooks/useKiltKYC";
import { useLanguage } from "@/contexts/LanguageContext";
import { isKYCExpiringSoon } from "@/lib/validations/kyc.schema";

export function IdentityVerification() {
  const { t } = useLanguage();
  const {
    kycProfile,
    loading,
    initiating,
    isVerified,
    isPending,
    canInitiate,
    initiateVerification,
  } = useKiltKYC();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return (
          <Badge className="bg-green-500">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {t('kyc.status.verified')}
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
          {t('kyc.subtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
          {kycProfile && getStatusBadge(kycProfile.kyc_status)}
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

        {/* Not Started Alert */}
        {kycProfile?.kyc_status === "not_started" && (
          <Alert>
            <AlertDescription>
              {t('kyc.alerts.notStarted')}
            </AlertDescription>
          </Alert>
        )}

        {/* QR Code for Pending/In Progress */}
        {isPending && kycProfile?.kyc_qr_code_url && (
          <div className="space-y-4">
            <Alert>
              <QrCode className="w-4 h-4" />
              <AlertDescription>
                {t('kyc.scanQRCode')}
              </AlertDescription>
            </Alert>
            <div className="flex justify-center p-4 bg-white rounded-lg">
              <QRCodeSVG 
                value={kycProfile.kyc_qr_code_url} 
                size={192}
                level="H"
                includeMargin={true}
              />
            </div>
            <p className="text-xs text-center text-muted-foreground">
              {t('kyc.downloadSporran')}
            </p>
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
            onClick={initiateVerification} 
            disabled={initiating}
            className="w-full"
          >
            {initiating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {kycProfile?.kyc_status === "expired" 
              ? t('kyc.actions.renewVerification')
              : t('kyc.actions.startVerification')}
          </Button>
        )}

        {/* Wallet DID Display */}
        {kycProfile?.kyc_wallet_did && (
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              {t('kyc.walletDID')}: <code className="text-xs">{kycProfile.kyc_wallet_did}</code>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
