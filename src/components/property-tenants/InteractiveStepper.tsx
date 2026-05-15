import { LucideIcon, CheckCircle2, Settings, History } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  key: string;
  label: string;
  icon: LucideIcon;
}

interface InteractiveStepperProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
  className?: string;
}

const steps: Step[] = [
  { key: "setup", label: "Setup", icon: Settings },
  { key: "active", label: "Active", icon: CheckCircle2 },
  { key: "ended", label: "Ended", icon: History },
];

export function InteractiveStepper({ 
  currentStep, 
  onStepClick,
  className 
}: InteractiveStepperProps) {
  return (
    <div className={cn("bg-gradient-to-r from-muted/50 to-muted/30 rounded-xl p-4 border", className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = currentStep > stepNumber;
          const isCurrent = currentStep === stepNumber;
          const isFuture = currentStep < stepNumber;
          const showAsCompleted = currentStep === 3 && stepNumber === 3;
          const Icon = step.icon;
          
          return (
            <div 
              key={step.key} 
              className={cn(
                "flex items-center flex-1",
                onStepClick && "cursor-pointer"
              )}
              onClick={() => onStepClick?.(stepNumber)}
            >
              <div className="flex flex-col items-center">
                <div 
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                    isCompleted || showAsCompleted ? "bg-green-500 text-white hover:bg-green-600" : "",
                    isCurrent && !showAsCompleted ? "bg-blue-500 text-white ring-4 ring-blue-500/20 hover:bg-blue-600" : "",
                    isFuture && !showAsCompleted ? "bg-muted text-muted-foreground hover:bg-muted/80" : ""
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className={cn(
                  "text-xs mt-2 text-center hidden sm:block",
                  isCurrent ? "font-semibold text-blue-600" : "text-muted-foreground"
                )}>
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div 
                  className={cn(
                    "flex-1 h-1 mx-2 rounded transition-colors",
                    isCompleted || (currentStep === 3 && index < steps.length - 1) ? "bg-green-500" : "bg-muted"
                  )} 
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}