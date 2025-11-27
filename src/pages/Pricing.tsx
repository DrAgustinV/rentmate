import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { EnterpriseContactForm } from "@/components/EnterpriseContactForm";

export default function Pricing() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { subscription } = useSubscription();
  const { plans, isLoading } = useSubscriptionPlans();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const [showEnterpriseForm, setShowEnterpriseForm] = useState(false);

  const handleSelectPlan = (planSlug: string) => {
    if (planSlug === "enterprise") {
      setShowEnterpriseForm(true);
    } else if (planSlug === "pro") {
      navigate("/account?tab=subscription");
    } else {
      navigate("/account?tab=subscription");
    }
  };

  const isCurrentPlan = (planSlug: string) => {
    return subscription?.plan === planSlug;
  };

  const getPlanIcon = (slug: string) => {
    if (slug === "enterprise") return <Sparkles className="h-5 w-5 text-primary" />;
    if (slug === "pro") return <Crown className="h-5 w-5 text-primary" />;
    return null;
  };

  const getPlanCTA = (slug: string, isCurrent: boolean, isAvailable: boolean) => {
    if (isCurrent) return t("subscription.currentPlan") || "Current Plan";
    if (slug === "enterprise") return t("subscription.contactSales");
    if (slug === "pro") return t("subscription.upgradeToPro");
    return t("subscription.currentPlan") || "Current Plan";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">
              {t("subscription.choosePlan")}
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              {t("pricing.subtitle")}
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-2 p-1 bg-muted rounded-lg">
              <Button
                variant={billingPeriod === "monthly" ? "default" : "ghost"}
                size="sm"
                onClick={() => setBillingPeriod("monthly")}
              >
                {t("subscription.monthly")}
              </Button>
              <Button
                variant={billingPeriod === "annual" ? "default" : "ghost"}
                size="sm"
                onClick={() => setBillingPeriod("annual")}
              >
                {t("subscription.annual")}
                <Badge variant="secondary" className="ml-2">
                  {t("subscription.save20")}
                </Badge>
              </Button>
            </div>
          </div>

          {/* Plans Grid */}
          <div className="grid md:grid-cols-3 gap-8">
            {plans?.map((plan) => {
              const isCurrent = isCurrentPlan(plan.slug);
              const priceMonthly = plan.price_monthly_cents / 100;
              const priceAnnual = plan.price_annual_cents / 100;
              const price = billingPeriod === "monthly" ? priceMonthly : priceAnnual;
              const isPopular = plan.slug === "pro";
              const isEnterprise = plan.slug === "enterprise";

              return (
                <Card
                  key={plan.id}
                  className={`relative ${
                    isPopular ? "border-primary shadow-lg scale-105" : ""
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="gap-1">
                        <Crown className="h-3 w-3" />
                        {t("pricing.mostPopular")}
                      </Badge>
                    </div>
                  )}

                  {!plan.is_available_for_signup && (
                    <div className="absolute top-4 right-4">
                      <Badge variant="secondary">
                        {t("subscription.comingSoon")}
                      </Badge>
                    </div>
                  )}

                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      {getPlanIcon(plan.slug)}
                      <CardTitle>{plan.name}</CardTitle>
                    </div>
                    <CardDescription>{plan.description}</CardDescription>

                    <div className="mt-4">
                      {!isEnterprise ? (
                        <>
                          <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-bold">€{price}</span>
                            <span className="text-muted-foreground">
                              {billingPeriod === "monthly"
                                ? t("subscription.perMonth")
                                : t("subscription.perYear")}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {billingPeriod === "monthly"
                              ? t("subscription.billedMonthly")
                              : t("subscription.billedAnnually")}
                          </p>
                        </>
                      ) : (
                        <div className="text-2xl font-bold">
                          {t("pricing.customPricing")}
                        </div>
                      )}
                      {plan.trial_days > 0 && plan.slug === "pro" && (
                        <Badge variant="outline" className="mt-2">
                          {plan.trial_days}-{t("pricing.dayFreeTrial")}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent>
                    <ul className="space-y-2">
                      {plan.localizedFeatures.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                      {plan.localizedLimitations.length > 0 && (
                        <>
                          {plan.localizedLimitations.map((limitation, index) => (
                            <li key={`limit-${index}`} className="flex items-start gap-2 text-muted-foreground">
                              <span className="text-sm">• {limitation}</span>
                            </li>
                          ))}
                        </>
                      )}
                    </ul>
                  </CardContent>

                  <CardFooter>
                    <Button
                      className="w-full"
                      variant={isCurrent ? "outline" : "default"}
                      disabled={isCurrent || (!plan.is_available_for_signup && !isEnterprise)}
                      onClick={() => handleSelectPlan(plan.slug)}
                    >
                      {isCurrent ? (
                        t("subscription.currentPlan") || "Current Plan"
                      ) : (
                        <>
                          {getPlanCTA(plan.slug, isCurrent, plan.is_available_for_signup)}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          {/* FAQ Section */}
          <div className="mt-16 text-center">
            <h2 className="text-2xl font-bold mb-4">
              {t("pricing.faq")}
            </h2>
            <div className="max-w-2xl mx-auto space-y-4 text-left">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">
                  {t("pricing.faqChangePlans")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("pricing.faqChangePlansAnswer")}
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">
                  {t("pricing.faqSignatureLimit")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("pricing.faqSignatureLimitAnswer")}
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">
                  {t("pricing.faqFreeTrial")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("pricing.faqFreeTrialAnswer")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <EnterpriseContactForm
        open={showEnterpriseForm}
        onOpenChange={setShowEnterpriseForm}
      />

      <AppFooter />
    </div>
  );
}
