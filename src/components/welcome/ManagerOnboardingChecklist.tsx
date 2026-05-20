import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { getOnboardingProgress, updateOnboardingProgress } from "@/services/profileService";
import {
  CheckCircle2,
  Circle,
  Plus,
  Users,
  FileText,
  ChevronDown,
  ChevronUp,
  PartyPopper,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ManagerOnboardingChecklistProps {
  userId: string;
  onTourRequest?: () => void;
}

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  isCompleted: boolean;
  isEnabled: boolean;
  action?: () => void;
  actionLabel?: string;
}

export function ManagerOnboardingChecklist({ userId, onTourRequest }: ManagerOnboardingChecklistProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    const checkProgress = async () => {
      try {
        const [progress, propertiesResult, tenanciesResult, contractsResult] = await Promise.all([
          getOnboardingProgress(userId),
          supabase.from("properties").select("id").eq("manager_id", userId),
          supabase.from("property_tenants").select("id").eq("manager_id", userId).neq("tenancy_status", "historic"),
          supabase.from("property_documents").select("id").not.is("tenancy_id", null).eq("manager_id", userId),
        ]);

        const hasProperties = (propertiesResult.data?.length || 0) > 0;
        const hasTenancies = (tenanciesResult.data?.length || 0) > 0;
        const hasContracts = (contractsResult.data?.length || 0) > 0;

        const checklistItems: ChecklistItem[] = [
          {
            id: "property",
            label: t("welcome.checklist.addProperty"),
            description: t("welcome.checklist.addPropertyDesc"),
            isCompleted: hasProperties,
            isEnabled: true,
            action: () => {
              const propertyId = propertiesResult.data?.[0]?.id;
              if (propertyId) {
                navigate(`/properties/${propertyId}/tenants?action=newTenancy`);
              }
            },
            actionLabel: t("welcome.checklist.setupTenancy"),
          },
          {
            id: "tenancy",
            label: t("welcome.checklist.setupTenancy"),
            description: t("welcome.checklist.setupTenancyDesc"),
            isCompleted: hasTenancies,
            isEnabled: hasProperties,
          },
          {
            id: "contract",
            label: t("welcome.checklist.uploadContract"),
            description: t("welcome.checklist.uploadContractDesc"),
            isCompleted: hasContracts,
            isEnabled: hasTenancies,
          },
        ];

        setItems(checklistItems);
        setIsCollapsed(!!progress?.checklist_completed);
        setIsLoading(false);
      } catch (error) {
        setIsLoading(false);
      }
    };

    checkProgress();
  }, [userId, t, navigate]);

  const completedCount = items.filter((item) => item.isCompleted).length;
  const progress = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;
  const allComplete = completedCount === items.length && items.length > 0;

  const handleCollapse = async () => {
    setIsCollapsed(true);
  };

  const handleUnhide = async () => {
    setIsCollapsed(false);
  };

  if (isLoading || allComplete) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-primary/5 mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Circle className="h-5 w-5 text-primary" />
            {t("welcome.checklist.title")}
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {completedCount} / {items.length} {t("welcome.checklist.completed")}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCollapse}
              className="h-8 px-2"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Progress value={progress} className="h-2 mt-2" />
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex items-center justify-between p-3 rounded-lg border transition-colors",
              item.isCompleted
                ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                : "bg-background border-border"
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex-shrink-0",
                  item.isCompleted ? "text-green-600" : "text-muted-foreground"
                )}
              >
                {item.isCompleted ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Circle className="h-5 w-5" />
                )}
              </div>
              <div>
                <p
                  className={cn(
                    "font-medium text-sm",
                    item.isCompleted && "line-through text-muted-foreground"
                  )}
                >
                  {item.label}
                </p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            </div>
            {!item.isCompleted && item.isEnabled && item.action && (
              <Button size="sm" variant="outline" onClick={item.action}>
                {item.actionLabel}
                <Plus className="h-4 w-4 ml-1" />
              </Button>
            )}
            {!item.isCompleted && !item.isEnabled && (
              <span className="text-xs text-muted-foreground">
                {t("welcome.checklist.addPropertyDesc").split(".")[0]}...
              </span>
            )}
          </div>
        ))}
        {onTourRequest && (
          <div className="pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onTourRequest}
              className="text-primary"
            >
              {t("welcome.showMeAround")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ManagerOnboardingComplete({ onHide }: { onHide: () => void }) {
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) {
    return null;
  }

  return (
    <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 mb-6">
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <PartyPopper className="h-6 w-6 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-green-800 dark:text-green-200">
              {t("welcome.checklist.allDone")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("welcome.checklist.allDoneDesc")}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsVisible(false)}>
            {t("welcome.checklist.hideForNow")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}