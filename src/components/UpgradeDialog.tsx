import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Check, Sparkles, AlertCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
  description?: string;
  requiredPlan?: "pro" | "enterprise";
}

export function UpgradeDialog({
  open,
  onOpenChange,
  feature,
  description,
  requiredPlan = "pro",
}: UpgradeDialogProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleUpgrade = () => {
    setIsNavigating(true);
    navigate("/account?tab=subscription");
    onOpenChange(false);
  };

  const planFeatures = {
    pro: [
      "Unlimited properties",
      "100 digital signatures per year",
      "Automated payment collection",
      "Document templates",
      "ID verification",
      "Priority support",
    ],
    enterprise: [
      "All Pro features",
      "9999 digital signatures per year",
      "White-labeling",
      "API access",
      "Advanced analytics",
      "Dedicated account manager",
    ],
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              {requiredPlan === "enterprise" ? (
                <Sparkles className="h-5 w-5 text-primary" />
              ) : (
                <Crown className="h-5 w-5 text-primary" />
              )}
            </div>
            <Badge variant="outline" className="capitalize">
              {requiredPlan} Feature
            </Badge>
          </div>
          <DialogTitle className="text-2xl">
            {t("subscription.upgradeRequired")}
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            <span className="font-medium text-foreground">{feature}</span>
            {description && (
              <>
                {" "}
                {description}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-muted/50 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                Upgrade to {requiredPlan === "enterprise" ? "Enterprise" : "Pro"} to unlock this feature and many more.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              {requiredPlan === "enterprise" ? "Enterprise" : "Pro"} plan includes:
            </p>
            <ul className="space-y-2">
              {planFeatures[requiredPlan].map((item, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleUpgrade} disabled={isNavigating}>
            {requiredPlan === "enterprise" ? (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {t("subscription.viewEnterprise")}
              </>
            ) : (
              <>
                <Crown className="mr-2 h-4 w-4" />
                {t("subscription.upgradeToPro")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
