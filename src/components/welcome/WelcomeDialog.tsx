import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { Building, Home, Rocket, Compass } from "lucide-react";
import { updateOnboardingProgress, getOnboardingProgress } from "@/services/profileService";

interface WelcomeDialogProps {
  userId: string;
  onTourRequest?: () => void;
}

export function WelcomeDialog({ userId, onTourRequest }: WelcomeDialogProps) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<"manager" | "tenant" | "new">("new");
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const progress = await getOnboardingProgress(userId);
        if (progress?.welcome_seen) return;
      } catch {
        // Fall through to show dialog if fetch fails
      }

      const timer = setTimeout(async () => {
        try {
          const { supabase } = await import("@/integrations/supabase/client");
          const [propsResult, tenanciesResult] = await Promise.all([
            supabase.from("properties").select("id").eq("manager_id", userId).limit(1),
            supabase.from("property_tenants").select("id").eq("tenant_id", userId).limit(1),
          ]);

          if (propsResult.data && propsResult.data.length > 0) {
            setRole("manager");
          } else if (tenanciesResult.data && tenanciesResult.data.length > 0) {
            setRole("tenant");
          } else {
            setRole("new");
          }
          setOpen(true);
        } catch {
          // Silently fail
        }
      }, 800);

      return () => clearTimeout(timer);
    };

    checkOnboarding();
  }, [userId]);

  const handleClose = async () => {
    setOpen(false);
    try {
      await updateOnboardingProgress(userId, { welcome_seen: true });
    } catch {
      // Silent fail - don't block UI
    }
  };

  const handleStartSetup = () => {
    handleClose();
    if (role === "manager" || role === "new") {
      navigate("/properties");
    } else {
      navigate("/rentals");
    }
  };

  const handleTakeTour = () => {
    handleClose();
    if (onTourRequest) {
      onTourRequest();
    } else {
      // Fallback: navigate to properties where tour can be triggered
      navigate("/properties");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-3">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              {role === "tenant" ? (
                <Home className="h-8 w-8 text-primary" />
              ) : (
                <Building className="h-8 w-8 text-primary" />
              )}
            </div>
          </div>
          <DialogTitle className="text-xl">
            {t("welcome.title")}
          </DialogTitle>
          {role !== "tenant" && (
            <p className="text-sm text-muted-foreground mt-2">
              {t("welcome.checklistPrompt")}
            </p>
          )}
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4">
          <Button 
            onClick={handleStartSetup} 
            className="w-full gap-2 h-11"
          >
            <Rocket className="h-4 w-4" />
            {t("welcome.startSetup")}
          </Button>
          <Button 
            onClick={handleTakeTour} 
            variant="outline" 
            className="w-full gap-2 h-11"
          >
            <Compass className="h-4 w-4" />
            {t("welcome.takeTour")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}