import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Sparkles, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSubscription } from "@/hooks/useSubscription";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { EnterpriseContactForm } from "@/components/EnterpriseContactForm";

export default function Pricing() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { subscription, isPro, isEnterprise } = useSubscription();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const [showEnterpriseForm, setShowEnterpriseForm] = useState(false);

  const plans = [
    {
      slug: "free",
      name: t("subscription.freePlan"),
      price: { monthly: 0, annual: 0 },
      description: "Perfect for getting started",
      features: [
        "Unlimited properties",
        "Basic property management",
        "Tenant invitations",
        "Maintenance tracking",
        "Ticket system",
        "0 digital signatures",
      ],
      limitations: [
        "No automated payments",
        "No digital signatures",
        "No KYC verification",
        "No document templates",
      ],
      cta: "Current Plan",
      available: true,
      popular: false,
    },
    {
      slug: "pro",
      name: t("subscription.proPlan"),
      price: { monthly: 29, annual: 290 },
      description: "Everything you need to scale",
      features: [
        "Unlimited properties",
        "100 digital signatures/year",
        "Automated payment collection",
        "Document templates",
        "KYC verification",
        "Priority support",
        "€2 per additional signature",
      ],
      cta: t("subscription.upgradeToPro"),
      available: false, // Coming Soon
      popular: true,
      trial: "14-day free trial",
    },
    {
      slug: "enterprise",
      name: t("subscription.enterprisePlan"),
      price: { monthly: null, annual: null },
      description: "Custom solutions for large operations",
      features: [
        "All Pro features",
        "9999 digital signatures/year",
        "White-labeling",
        "API access",
        "Advanced analytics",
        "Dedicated account manager",
        "Custom integrations",
        "SLA guarantee",
      ],
      cta: t("subscription.contactSales"),
      available: true,
      popular: false,
    },
  ];

  const handleSelectPlan = (planSlug: string) => {
    if (planSlug === "enterprise") {
      setShowEnterpriseForm(true);
    } else if (planSlug === "pro") {
      navigate("/account?tab=subscription");
    } else {
      // Free plan - already on it
      navigate("/account?tab=subscription");
    }
  };

  const isCurrentPlan = (planSlug: string) => {
    return subscription?.plan_slug === planSlug;
  };

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
              Choose the perfect plan for your property management needs
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
            {plans.map((plan) => {
              const isCurrent = isCurrentPlan(plan.slug);
              const price = plan.price[billingPeriod];

              return (
                <Card
                  key={plan.slug}
                  className={`relative ${
                    plan.popular
                      ? "border-primary shadow-lg scale-105"
                      : ""
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="gap-1">
                        <Crown className="h-3 w-3" />
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  {!plan.available && plan.slug !== "enterprise" && (
                    <div className="absolute top-4 right-4">
                      <Badge variant="secondary">
                        {t("subscription.comingSoon")}
                      </Badge>
                    </div>
                  )}

                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      {plan.slug === "enterprise" ? (
                        <Sparkles className="h-5 w-5 text-primary" />
                      ) : plan.slug === "pro" ? (
                        <Crown className="h-5 w-5 text-primary" />
                      ) : null}
                      <CardTitle>{plan.name}</CardTitle>
                    </div>
                    <CardDescription>{plan.description}</CardDescription>

                    <div className="mt-4">
                      {price !== null ? (
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
                        <div className="text-2xl font-bold">Custom pricing</div>
                      )}
                      {plan.trial && (
                        <Badge variant="outline" className="mt-2">
                          {plan.trial}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent>
                    <ul className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                      {plan.limitations && (
                        <>
                          {plan.limitations.map((limitation, index) => (
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
                      disabled={isCurrent || (!plan.available && plan.slug !== "enterprise")}
                      onClick={() => handleSelectPlan(plan.slug)}
                    >
                      {isCurrent ? (
                        "Current Plan"
                      ) : (
                        <>
                          {plan.cta}
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
            <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions</h2>
            <div className="max-w-2xl mx-auto space-y-4 text-left">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Can I change plans later?</h3>
                <p className="text-sm text-muted-foreground">
                  Yes, you can upgrade or downgrade your plan at any time. Changes take effect
                  immediately, and we'll prorate any charges.
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">What happens when I exceed my signature limit?</h3>
                <p className="text-sm text-muted-foreground">
                  Additional signatures are billed at €2 per signature. You'll be notified when you
                  reach 80% of your limit.
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Is there a free trial?</h3>
                <p className="text-sm text-muted-foreground">
                  Yes! Pro plan includes a 14-day free trial. No credit card required to start.
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
