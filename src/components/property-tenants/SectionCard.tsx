import { useState, useEffect } from "react";
import { LucideIcon, ChevronDown } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title: string;
  icon: LucideIcon;
  description?: string;
  defaultOpen?: boolean;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function SectionCard({
  title,
  icon: Icon,
  description,
  defaultOpen = false,
  action,
  children,
  className,
}: SectionCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  // Sync state with defaultOpen prop when it changes
  useEffect(() => {
    setIsOpen(defaultOpen);
  }, [defaultOpen]);

  return (
    <Card className={cn("card-shine overflow-hidden", className)}>
      <CardHeader 
        className="pb-4 cursor-pointer select-none group"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center group-hover:from-primary/20 group-hover:to-primary/10 transition-colors">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {title}
              </CardTitle>
              {description && (
                <CardDescription className="mt-1">{description}</CardDescription>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {action && (
              <div onClick={(e) => {
                e.stopPropagation();
                if (!isOpen) setIsOpen(true);
              }}>
                {action}
              </div>
            )}
            <ChevronDown 
              className={cn(
                "h-5 w-5 text-muted-foreground transition-transform duration-200",
                !isOpen && "rotate-[-90deg]"
              )} 
            />
          </div>
        </div>
      </CardHeader>
      <div 
        className={cn(
          "transition-all duration-300 ease-in-out overflow-hidden",
          isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <CardContent className="pt-0 pb-6">
          {children}
        </CardContent>
      </div>
    </Card>
  );
}