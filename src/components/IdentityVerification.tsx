import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ShieldCheck, AlertCircle, QrCode, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface KYCStatus {
  kyc_status: string;
  dock_kyc_qr_code_url: string | null;
  kyc_verified_at: string | null;
  kyc_expires_at: string | null;
  dock_wallet_did: string | null;
}

export function IdentityVerification() {
  const [loading, setLoading] = useState(false);
  const [initiating, setInitiating] = useState(false);
  const [kycStatus, setKycStatus] = useState<KYCStatus | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchKYCStatus();
  }, []);

  const fetchKYCStatus = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("kyc_status, dock_kyc_qr_code_url, kyc_verified_at, kyc_expires_at, dock_wallet_did")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setKycStatus(data);
    } catch (error) {
      console.error("Error fetching KYC status:", error);
      toast({
        title: "Error",
        description: "Failed to load verification status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const initiateVerification = async () => {
    try {
      setInitiating(true);
      
      const { data, error } = await supabase.functions.invoke("initiate-kilt-kyc");

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Verification initiated",
          description: "Scan the QR code with Sporran wallet",
        });
        await fetchKYCStatus();
      } else {
        throw new Error(data.message || "Failed to initiate verification");
      }
    } catch (error) {
      console.error("Error initiating verification:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to initiate verification",
        variant: "destructive",
      });
    } finally {
      setInitiating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Verified</Badge>;
      case "pending":
        return <Badge variant="outline"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Pending</Badge>;
      case "in_progress":
        return <Badge variant="outline"><Loader2 className="w-3 h-3 mr-1 animate-spin" />In Progress</Badge>;
      case "rejected":
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case "expired":
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />Expired</Badge>;
      default:
        return <Badge variant="secondary">Not Started</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            Identity Verification
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5" />
          Identity Verification
        </CardTitle>
        <CardDescription>
          Verify your identity using KILT Protocol blockchain credentials
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Verification Status</p>
            <p className="text-xs text-muted-foreground">
              {kycStatus?.kyc_status === "verified" && kycStatus?.kyc_verified_at
                ? `Verified on ${new Date(kycStatus.kyc_verified_at).toLocaleDateString()}`
                : "Not verified"}
            </p>
          </div>
          {kycStatus && getStatusBadge(kycStatus.kyc_status)}
        </div>

        {kycStatus?.kyc_status === "verified" && kycStatus?.kyc_expires_at && (
          <Alert>
            <AlertDescription>
              Your verification expires on {new Date(kycStatus.kyc_expires_at).toLocaleDateString()}
            </AlertDescription>
          </Alert>
        )}

        {kycStatus?.kyc_status === "not_started" && (
          <Alert>
            <AlertDescription>
              Complete identity verification to increase trust with property managers and access exclusive features.
            </AlertDescription>
          </Alert>
        )}

        {(kycStatus?.kyc_status === "pending" || kycStatus?.kyc_status === "in_progress") && 
         kycStatus?.dock_kyc_qr_code_url && (
          <div className="space-y-4">
            <Alert>
              <QrCode className="w-4 h-4" />
              <AlertDescription>
                Scan this QR code with your Sporran wallet to complete verification
              </AlertDescription>
            </Alert>
            <div className="flex justify-center p-4 bg-muted rounded-lg">
              <img 
                src={kycStatus.dock_kyc_qr_code_url} 
                alt="Verification QR Code"
                className="w-48 h-48"
              />
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Don't have Sporran? Download from sporran.org
            </p>
          </div>
        )}

        {kycStatus?.kyc_status === "rejected" && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              Your verification was not successful. Please try again or contact support.
            </AlertDescription>
          </Alert>
        )}

        {(kycStatus?.kyc_status === "not_started" || 
          kycStatus?.kyc_status === "rejected" || 
          kycStatus?.kyc_status === "expired") && (
          <Button 
            onClick={initiateVerification} 
            disabled={initiating}
            className="w-full"
          >
            {initiating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {kycStatus?.kyc_status === "expired" ? "Renew Verification" : "Start Verification"}
          </Button>
        )}

        {kycStatus?.dock_wallet_did && (
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Wallet DID: <code className="text-xs">{kycStatus.dock_wallet_did}</code>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
