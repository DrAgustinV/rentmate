import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ButtonProps } from "@/components/ui/button";

interface TooltipButtonProps extends ButtonProps {
  tooltip: string;
  children: React.ReactNode;
}

/**
 * Button component with built-in tooltip support
 * Perfect for icon-only buttons that need hover explanations
 */
export function TooltipButton({ tooltip, children, ...buttonProps }: TooltipButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button {...buttonProps}>
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
