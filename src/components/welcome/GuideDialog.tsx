import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Building,
  Settings,
  Users,
  DollarSign,
  FileText,
  BarChart3,
  Home,
  Shield,
  CreditCard,
  Wrench,
  Rocket,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartTour: () => void;
}

interface GuideStep {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  actionPath?: string;
}

interface StepContent {
  whatItIs: string;
  whatYouNeed: string[];
  whyItMatters: string;
  quickTip: string;
}

export function GuideDialog({ open, onOpenChange, onStartTour }: GuideDialogProps) {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const isOnPropertiesPage = location.pathname.startsWith("/properties");
  const isOnRentalsPage = location.pathname.startsWith("/rentals");

  const managerSteps: GuideStep[] = [
    {
      icon: Building,
      label: t("welcome.guide.step1AddProperty"),
      description: t("welcome.guide.step1AddPropertyDesc"),
      actionPath: "/properties?guideHighlight=add-property",
    },
    {
      icon: Settings,
      label: t("welcome.guide.step2Configuration"),
      description: t("welcome.guide.step2ConfigurationDesc"),
      actionPath: "/configuration?guideHighlight=defaults",
    },
    {
      icon: Users,
      label: t("welcome.guide.step3AddTenant"),
      description: t("welcome.guide.step3AddTenantDesc"),
      actionPath: "/properties?guideHighlight=add-tenant",
    },
    {
      icon: DollarSign,
      label: t("welcome.guide.step4ConfigureRent"),
      description: t("welcome.guide.step4ConfigureRentDesc"),
    },
    {
      icon: FileText,
      label: t("welcome.guide.step5UploadContract"),
      description: t("welcome.guide.step5UploadContractDesc"),
    },
    {
      icon: BarChart3,
      label: t("welcome.guide.step6TrackPayments"),
      description: t("welcome.guide.step6TrackPaymentsDesc"),
    },
  ];

  const tenantSteps: GuideStep[] = [
    {
      icon: Home,
      label: t("welcome.guide.step1AcceptInvite"),
      description: t("welcome.guide.step1AcceptInviteDesc"),
      actionPath: "/invitations",
    },
    {
      icon: Shield,
      label: t("welcome.guide.step2VerifyIdentity"),
      description: t("welcome.guide.step2VerifyIdentityDesc"),
      actionPath: "/account?guideHighlight=kyc",
    },
    {
      icon: FileText,
      label: t("welcome.guide.step3SignContract"),
      description: t("welcome.guide.step3SignContractDesc"),
    },
    {
      icon: CreditCard,
      label: t("welcome.guide.step4SetUpPayments"),
      description: t("welcome.guide.step4SetUpPaymentsDesc"),
    },
    {
      icon: Wrench,
      label: t("welcome.guide.step5SubmitRequests"),
      description: t("welcome.guide.step5SubmitRequestsDesc"),
    },
  ];

  const managerStepContents: StepContent[] = [
    {
      whatItIs: "Create a property listing with details and photos. This is the foundation of your rental business.",
      whatYouNeed: ["Property name/title", "Street address, city, postal code, country", "(Optional) Description and photos"],
      whyItMatters: "Properties organize your rentals. Each property can have multiple tenancies over time.",
      quickTip: "Add a property photo - listings with photos get 3x more tenant interest!",
    },
    {
      whatItIs: "Set default settings and templates that apply to all your properties.",
      whatYouNeed: ["Default security deposit amount", "Default KYC verification requirement", "Document templates"],
      whyItMatters: "Defaults auto-fill in the tenancy wizard, saving you time on every new tenancy.",
      quickTip: "Set your default security deposit once and never enter it again!",
    },
    {
      whatItIs: "Invite tenants to your property and configure verification requirements.",
      whatYouNeed: ["Tenant email address", "Email verification toggle", "KYC verification toggle"],
      whyItMatters: "Links tenants to properties; verification protects you from fraud.",
      quickTip: "Use self-manage mode to skip verification for hands-on management.",
    },
    {
      whatItIs: "Set the financial terms for the tenancy including rent amount and payment schedule.",
      whatYouNeed: ["Monthly rent amount", "Security deposit", "Payment day of month", "Currency"],
      whyItMatters: "Defines your earning terms and is tracked for payment monitoring.",
      quickTip: "Set payment day to 1st for consistent automatic bank transfers.",
    },
    {
      whatItIs: "Upload or generate a rental agreement and send for e-signature.",
      whatYouNeed: ["Contract document (PDF/DOC)", "Template selection", "Signatures from both parties"],
      whyItMatters: "Provides legal protection for both you and the tenant.",
      quickTip: "YouSign provides free digital signatures for most contracts.",
    },
    {
      whatItIs: "Monitor rent and utility payments, view history, and track due dates.",
      whatYouNeed: ["View payment history", "Filter by status (paid/pending/overdue)", "Set up auto-reminders"],
      whyItMatters: "Know who paid, who's overdue, and keep proof of payment for your records.",
      quickTip: "Enable auto-reminders to reduce late payments by 40%.",
    },
  ];

  const tenantStepContents: StepContent[] = [
    {
      whatItIs: "Join a rental property as a tenant by accepting your invitation.",
      whatYouNeed: ["Invitation email", "RentMate account (or create one)"],
      whyItMatters: "Connects you to the property and creates your official tenancy record.",
      quickTip: "Check your spam folder if you don't see the invitation email.",
    },
    {
      whatItIs: "Complete identity verification (KYC) to confirm you are who you say you are.",
      whatYouNeed: ["Government-issued ID", "Smartphone for selfie capture"],
      whyItMatters: "Required by many landlords; verifies your identity for the tenancy.",
      quickTip: "KYC verification is usually free and takes 5-10 minutes.",
    },
    {
      whatItIs: "Review and electronically sign your rental agreement.",
      whatYouNeed: ["Review contract terms", "Click to sign electronically"],
      whyItMatters: "Legally binds you to the lease terms and protects both parties.",
      quickTip: "Read the contract carefully before signing - it's a legal document!",
    },
    {
      whatItIs: "Configure how you'll pay rent each month.",
      whatYouNeed: ["Bank account or payment card", "Set up recurring payments"],
      whyItMatters: "Ensures rent is paid on time every month without manual intervention.",
      quickTip: "Auto-pay means you never miss a payment - set it and forget it!",
    },
    {
      whatItIs: "Report maintenance issues or submit support tickets to your landlord.",
      whatYouNeed: ["Describe the issue", "(Optional) Add photos"],
      whyItMatters: "Gets your maintenance requests to the landlord/manager quickly.",
      quickTip: "Photos help maintenance teams diagnose and fix issues faster.",
    },
  ];

  const isTenantGuide = isOnRentalsPage;
  const stepContents = isTenantGuide ? tenantStepContents : managerStepContents;
  const steps = isTenantGuide ? tenantSteps : managerSteps;
  const title = isTenantGuide ? t("welcome.guide.tenantTitle") : t("welcome.guide.managerTitle");
  const subtitle = isTenantGuide ? t("welcome.guide.tenantSubtitle") : t("welcome.guide.managerSubtitle");

  const handleStartTour = () => {
    onOpenChange(false);
    onStartTour();
  };

  const handleStepClick = (index: number) => {
    setExpandedStep(expandedStep === index ? null : index);
  };

  const handleActionClick = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-3">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Building className="h-7 w-7 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </DialogHeader>

        <div className="space-y-2 my-4">
          {steps.map((step, index) => {
            const isExpanded = expandedStep === index;
            const stepContent = stepContents[index];

            return (
              <div key={index} className="border rounded-lg overflow-hidden">
                <div
                  className={cn(
                    "flex items-center gap-3 p-3 cursor-pointer transition-colors",
                    isExpanded ? "bg-accent/50" : "hover:bg-accent/30"
                  )}
                  onClick={() => handleStepClick(index)}
                >
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">{index + 1}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <step.icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{step.label}</p>
                    {!isExpanded && (
                      <p className="text-xs text-muted-foreground truncate">{step.description}</p>
                    )}
                  </div>
                </div>

                {isExpanded && stepContent && (
                  <div className="px-4 pb-4 pt-0 border-t border-border bg-background/50">
                    <div className="mt-3 space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">
                          {t("welcome.guide.whatItIs")}
                        </p>
                        <p className="text-sm text-foreground/90">{stepContent.whatItIs}</p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">
                          {t("welcome.guide.whatYouNeed")}
                        </p>
                        <ul className="text-sm text-foreground/90 space-y-1">
                          {stepContent.whatYouNeed.map((item, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-primary mt-1">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">
                          {t("welcome.guide.whyItMatters")}
                        </p>
                        <p className="text-sm text-foreground/90">{stepContent.whyItMatters}</p>
                      </div>

                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-0.5">
                              {t("welcome.guide.quickTip")}
                            </p>
                            <p className="text-sm text-foreground/90">{stepContent.quickTip}</p>
                          </div>
                        </div>
                      </div>

                      {step.actionPath && (
                        <Button
                          size="sm"
                          className="w-full gap-2 mt-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActionClick(step.actionPath!);
                          }}
                        >
                          <ArrowRight className="h-4 w-4" />
                          {t("welcome.guide.takeAction")}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-center gap-3 pt-4 border-t border-border">
          <Button onClick={handleStartTour} className="gap-2">
            <Rocket className="h-4 w-4" />
            {t("welcome.guide.takeTour")}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("welcome.guide.close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}