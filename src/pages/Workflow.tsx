import { AppLayout } from "@/components/layouts/AppLayout";
import { WorkflowDiagram } from "@/components/workflow/WorkflowDiagram";
import { useLanguage } from "@/contexts/LanguageContext";
import { GitBranch } from "lucide-react";

export default function Workflow() {
  const { t } = useLanguage();

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <GitBranch className="h-8 w-8 text-primary" />
          {t("workflow.pageTitle")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("workflow.pageDescription")}</p>
      </div>
      <WorkflowDiagram />
    </AppLayout>
  );
}
