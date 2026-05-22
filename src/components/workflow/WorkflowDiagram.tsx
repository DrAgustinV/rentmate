import { useNavigate } from "react-router-dom";
import {
  Settings,
  Building,
  Users,
  FileText,
  FileSignature,
  CreditCard,
  Wrench,
  ClipboardList,
  DoorClosed,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Phase = "setup" | "onboarding" | "operations" | "exit";

interface NodeDef {
  id: string;
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
  path: string;
  phase: Phase;
}

const nodes: NodeDef[] = [
  { id: "configuration", icon: Settings, titleKey: "workflow.configuration", descKey: "workflow.configurationDesc", path: "/configuration", phase: "setup" },
  { id: "property", icon: Building, titleKey: "workflow.property", descKey: "workflow.propertyDesc", path: "/properties", phase: "setup" },
  { id: "tenantKyc", icon: Users, titleKey: "workflow.tenantKyc", descKey: "workflow.tenantKycDesc", path: "/properties", phase: "onboarding" },
  { id: "rentAgreement", icon: FileText, titleKey: "workflow.rentAgreement", descKey: "workflow.rentAgreementDesc", path: "/properties", phase: "onboarding" },
  { id: "contract", icon: FileSignature, titleKey: "workflow.contract", descKey: "workflow.contractDesc", path: "/properties", phase: "onboarding" },
  { id: "payments", icon: CreditCard, titleKey: "workflow.payments", descKey: "workflow.paymentsDesc", path: "/properties", phase: "operations" },
  { id: "tickets", icon: Wrench, titleKey: "workflow.tickets", descKey: "workflow.ticketsDesc", path: "/properties", phase: "operations" },
  { id: "inspections", icon: ClipboardList, titleKey: "workflow.inspections", descKey: "workflow.inspectionsDesc", path: "/properties", phase: "operations" },
  { id: "endTenancy", icon: DoorClosed, titleKey: "workflow.endTenancy", descKey: "workflow.endTenancyDesc", path: "/properties", phase: "exit" },
];

const phaseTheme: Record<Phase, { border: string; icon: string; badge: string }> = {
  setup:    { border: "border-l-blue-500",    icon: "text-blue-600",    badge: "bg-blue-500/10 text-blue-600" },
  onboarding: { border: "border-l-emerald-500", icon: "text-emerald-600", badge: "bg-emerald-500/10 text-emerald-600" },
  operations: { border: "border-l-amber-500",  icon: "text-amber-600",  badge: "bg-amber-500/10 text-amber-600" },
  exit:     { border: "border-l-violet-500",  icon: "text-violet-600",  badge: "bg-violet-500/10 text-violet-600" },
};

const phaseLabelKey: Record<Phase, string> = {
  setup: "workflow.phaseSetup",
  onboarding: "workflow.phaseOnboarding",
  operations: "workflow.phaseOperations",
  exit: "workflow.phaseExit",
};

function WorkflowNode({ node }: { node: NodeDef }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const theme = phaseTheme[node.phase];
  const Icon = node.icon;

  return (
    <Card
      className={cn(
        "w-full max-w-md cursor-pointer border-l-4 transition-all duration-200 hover:shadow-lg active:scale-[0.98]",
        theme.border,
      )}
      onClick={() => navigate(node.path)}
    >
      <div className="flex items-start gap-4 p-4">
        <div className={cn("mt-0.5 shrink-0", theme.icon)}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">{t(node.titleKey)}</h3>
            <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider", theme.badge)}>
              {t(phaseLabelKey[node.phase])}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{t(node.descKey)}</p>
        </div>
      </div>
    </Card>
  );
}

function VConnector() {
  return (
    <div className="flex flex-col items-center py-1">
      <div className="w-0.5 h-6 bg-gradient-to-b from-muted-foreground/20 to-muted-foreground/40 rounded-full" />
      <ChevronDown className="h-4 w-4 text-muted-foreground/40 -mt-0.5" />
    </div>
  );
}

function BranchArrows() {
  return (
    <div className="flex items-center justify-center gap-4 sm:gap-6 w-full max-w-md py-1">
      <div className="flex-1 flex items-center justify-end">
        <div className="h-0.5 flex-1 bg-gradient-to-l from-muted-foreground/30 to-transparent max-w-[60px]" />
        <ArrowRight className="h-3 w-3 text-muted-foreground/40 -ml-1.5" />
      </div>
      <div className="flex-1 flex items-center justify-start">
        <ArrowRight className="h-3 w-3 text-muted-foreground/40 -mr-1.5" />
        <div className="h-0.5 flex-1 bg-gradient-to-r from-muted-foreground/30 to-transparent max-w-[60px]" />
      </div>
    </div>
  );
}

function PhaseLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 w-full max-w-md my-4">
      <div className="flex-1 h-px bg-muted-foreground/20" />
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">{label}</span>
      <div className="flex-1 h-px bg-muted-foreground/20" />
    </div>
  );
}

export function WorkflowDiagram() {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col items-center">
      {/* Setup phase */}
      <PhaseLabel label={t("workflow.phaseSetup")} />

      <WorkflowNode node={nodes[0]} />
      <VConnector />
      <WorkflowNode node={nodes[1]} />

      {/* Onboarding phase */}
      <PhaseLabel label={t("workflow.phaseOnboarding")} />

      <VConnector />
      <WorkflowNode node={nodes[2]} />
      <VConnector />
      <WorkflowNode node={nodes[3]} />
      <VConnector />
      <WorkflowNode node={nodes[4]} />

      {/* Branch: Contract → Payments + Tickets */}
      <BranchArrows />

      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full justify-center">
        <WorkflowNode node={nodes[5]} />
        <WorkflowNode node={nodes[6]} />
      </div>

      {/* Merge back to spine */}
      <div className="flex items-center justify-center gap-4 sm:gap-6 w-full max-w-md py-1">
        <div className="flex-1 flex items-center justify-end">
          <ArrowRight className="h-3 w-3 text-muted-foreground/40 -mr-1.5 rotate-180" />
          <div className="h-0.5 flex-1 bg-gradient-to-r from-muted-foreground/30 to-transparent max-w-[60px]" />
        </div>
        <div className="flex-1 flex items-center justify-start">
          <div className="h-0.5 flex-1 bg-gradient-to-l from-muted-foreground/30 to-transparent max-w-[60px]" />
          <ArrowRight className="h-3 w-3 text-muted-foreground/40 -ml-1.5 rotate-180" />
        </div>
      </div>

      <VConnector />

      {/* Operations phase */}
      <PhaseLabel label={t("workflow.phaseOperations")} />

      <WorkflowNode node={nodes[7]} />

      {/* Exit phase */}
      <PhaseLabel label={t("workflow.phaseExit")} />

      <VConnector />
      <WorkflowNode node={nodes[8]} />
    </div>
  );
}
