import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { authService } from "@/services";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradeDialog } from "@/components/UpgradeDialog";

export function StripeConnectOnboarding() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);
  const { canUseFeature } = useSubscription();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  // Fetch current manager's Stripe account status
  const { data: stripeAccount, isLoading } = useQuery({
    queryKey: ["manager-stripe-account"],
    queryFn: async () => {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("manager_stripe_accounts")
        .select("*")
        .eq("manager_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  // Connect to Stripe mutation
  const connectMutation = useMutation({
    mutationFn: async () => {
      setIsConnecting(true);
      const { data, error } = await supabase.functions.invoke("create-stripe-connect-account");

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.url) {
        // Open Stripe onboarding in new tab
        window.open(data.url, "_blank");
        toast.success(t("payments.stripeOnboardingOpened"));
        // Refresh account status after 5 seconds
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["manager-stripe-account"] });
        }, 5000);
      }
      setIsConnecting(false);
    },
    onError: (error: any) => {
      console.error("Stripe Connect error:", error);
      toast.error(t("payments.stripeConnectError"));
      setIsConnecting(false);
    },
  });

  const getStatusBadge = () => {
    if (!stripeAccount) {
      return <Badge variant="secondary">{t("payments.notConnected")}</Badge>;
    }

    switch (stripeAccount.stripe_account_status) {
      case "active":
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {t("payments.connected")}
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            {t("payments.pendingOnboarding")}
          </Badge>
        );
      default:
        return <Badge variant="secondary">{t("payments.inactive")}</Badge>;
    }
  };

  const getActionButton = () => {
    const handleConnect = () => {
      // Check subscription access BEFORE calling mutation
      if (!canUseFeature('automated_payments_enabled')) {
        setShowUpgradeDialog(true);
        return;
      }
      connectMutation.mutate();
    };

    if (!stripeAccount) {
      return (
        <Button onClick={handleConnect} disabled={isConnecting}>
          {isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <ExternalLink className="mr-2 h-4 w-4" />
          {t("payments.connectStripe")}
        </Button>
      );
    }

    if (stripeAccount.stripe_account_status === "pending") {
      return (
        <Button onClick={handleConnect} disabled={isConnecting} variant="outline">
          {isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <ExternalLink className="mr-2 h-4 w-4" />
          {t("payments.completeOnboarding")}
        </Button>
      );
    }

    if (stripeAccount.stripe_account_status === "active") {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          {t("payments.stripeAccountActive")}
        </div>
      );
    }

    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("payments.stripeConnect")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t("payments.stripeConnect")}</CardTitle>
            <CardDescription>{t("payments.stripeConnectDescription")}</CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/50 p-4">
          <h4 className="font-semibold mb-2">{t("payments.howItWorks")}</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-1">1.</span>
              <span>{t("payments.step1ConnectStripe")}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1">2.</span>
              <span>{t("payments.step2CompleteOnboarding")}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1">3.</span>
              <span>{t("payments.step3StartCollecting")}</span>
            </li>
          </ul>
        </div>

        {stripeAccount?.stripe_account_id && (
          <div className="text-sm space-y-1">
            <p className="text-muted-foreground">
              {t("payments.accountId")}: <code className="text-xs">{stripeAccount.stripe_account_id}</code>
            </p>
            {stripeAccount.onboarding_completed_at && (
              <p className="text-muted-foreground">
                {t("payments.connectedOn")}:{" "}
                {new Date(stripeAccount.onboarding_completed_at).toLocaleDateString()}
              </p>
              )}
            </div>
          )}

          <div className="flex justify-end">{getActionButton()}</div>
        </CardContent>
        
        <UpgradeDialog
          open={showUpgradeDialog}
          onOpenChange={setShowUpgradeDialog}
          feature="Stripe Connect"
          description="for automated payment collection requires a Pro or Enterprise plan."
          requiredPlan="pro"
        />
      </Card>
    );
  }
