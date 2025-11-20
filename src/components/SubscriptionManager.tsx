import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Crown, Sparkles, ExternalLink, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function SubscriptionManager() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { subscription, isLoading, refresh } = useSubscription();
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Create checkout session
  const createCheckout = useMutation({
    mutationFn: async (billingPeriod: "monthly" | "annual") => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("create-subscription-checkout", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { planSlug: "pro", billingPeriod },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.url) {
        window.open(data.url, "_blank");
        toast.success("Opening Stripe checkout...");
        // Refresh subscription after 5 seconds
        setTimeout(() => refresh(), 5000);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create checkout session");
    },
  });

  // Open customer portal
  const openPortal = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("customer-portal-session", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.url) {
        window.open(data.url, "_blank");
        toast.success("Opening Stripe billing portal...");
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to open billing portal");
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Unable to load subscription data</p>
          <Button onClick={() => refresh()} variant="outline" className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isPro = subscription.plan === "pro";
  const isEnterprise = subscription.plan === "enterprise";
  const isFree = subscription.plan === "free";
  const isActive = subscription.status === "active" || subscription.status === "trialing";
  const signaturesPercent = subscription.usage.signatures_used && subscription.features.digital_signatures_per_year
    ? (subscription.usage.signatures_used / subscription.features.digital_signatures_per_year) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {isEnterprise && <Sparkles className="h-5 w-5 text-primary" />}
                {isPro && <Crown className="h-5 w-5 text-primary" />}
                {t("subscription.currentPlan")}
              </CardTitle>
              <CardDescription>
                {subscription.plan_name}
              </CardDescription>
            </div>
            <Badge
              variant={isActive ? "default" : "secondary"}
              className="capitalize"
            >
              {subscription.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Alerts */}
          {subscription.status === "trialing" && subscription.trial_end && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Trial ends on {format(new Date(subscription.trial_end), "PPP")}
              </AlertDescription>
            </Alert>
          )}

          {subscription.grace_period_ends_at && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Payment failed. Grace period ends on{" "}
                {format(new Date(subscription.grace_period_ends_at), "PPP")}
              </AlertDescription>
            </Alert>
          )}

          {subscription.current_period_end && subscription.status === 'canceled' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Subscription ends on {format(new Date(subscription.current_period_end), "PPP")}
              </AlertDescription>
            </Alert>
          )}

          {/* Plan Details */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium mb-2">Features</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  {subscription.features.digital_signatures_per_year} signatures/year
                </li>
                {subscription.features.automated_payments_enabled && (
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Automated payments
                  </li>
                )}
                {subscription.features.kyc_verification_enabled && (
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    KYC verification
                  </li>
                )}
              </ul>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Billing</p>
              {subscription.current_period_end && (
                <p className="text-sm text-muted-foreground">
                  Renews on {format(new Date(subscription.current_period_end), "PPP")}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Usage Stats */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Digital Signatures</p>
                <p className="text-sm text-muted-foreground">
                  {subscription.usage.signatures_used} / {subscription.features.digital_signatures_per_year}
                </p>
              </div>
              <Progress value={signaturesPercent} className="h-2" />
              {subscription.usage.remaining <= 20 && subscription.features.digital_signatures_per_year > 0 && (
                <p className="text-sm text-orange-600 mt-1">
                  {subscription.usage.remaining} signatures remaining
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            {isFree ? (
              <>
                <Button
                  onClick={() => createCheckout.mutate("monthly")}
                  disabled={createCheckout.isPending}
                  className="flex-1"
                >
                  <Crown className="mr-2 h-4 w-4" />
                  Upgrade to Pro (Monthly)
                </Button>
                <Button
                  onClick={() => createCheckout.mutate("annual")}
                  disabled={createCheckout.isPending}
                  variant="outline"
                  className="flex-1"
                >
                  <Crown className="mr-2 h-4 w-4" />
                  Upgrade to Pro (Annual - Save 20%)
                </Button>
              </>
            ) : (
              <Button
                onClick={() => openPortal.mutate()}
                disabled={openPortal.isPending}
                variant="outline"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                {t("subscription.manageSubscription")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Options for Free Users */}
      {isFree && (
        <Card>
          <CardHeader>
            <CardTitle>Why Upgrade to Pro?</CardTitle>
            <CardDescription>
              Unlock powerful features to scale your property management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">100 Digital Signatures per Year</p>
                  <p className="text-sm text-muted-foreground">
                    Create legally-binding contracts with tenants
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Automated Payment Collection</p>
                  <p className="text-sm text-muted-foreground">
                    Collect rent automatically via Stripe Connect
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">KYC Verification</p>
                  <p className="text-sm text-muted-foreground">
                    Verify tenant identities with blockchain-based KYC
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Priority Support</p>
                  <p className="text-sm text-muted-foreground">
                    Get help faster with dedicated support
                  </p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
