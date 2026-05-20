import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { UserCircle, Settings, LogOut, Building2, Home, ShieldCheck, Lightbulb } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRole } from "@/contexts/RoleContext";
import { Badge } from "@/components/ui/badge";
import { shouldShowRoleSwitchTour, markRoleSwitchTourSeen } from "@/services/profileService";
import { useQuery } from "@tanstack/react-query";
import { GuideDialog } from "@/components/welcome/GuideDialog";

interface UserMenuProps {
  email: string;
  isManager: boolean;
  isAdmin: boolean;
  onSignOut: () => void;
}

export function UserMenu({ email, isManager, isAdmin, onSignOut }: UserMenuProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { activeRole, switchRole } = useRole();
  const [guideOpen, setGuideOpen] = useState(false);

  const isOnPropertiesPage = location.pathname.startsWith("/properties");
  const isOnRentalsPage = location.pathname.startsWith("/rentals");

  const handleStartTour = () => {
    if (isOnPropertiesPage || isOnRentalsPage) {
      navigate(`${location.pathname}?tour=true`);
    } else {
      navigate(isManager ? "/properties?tour=true" : "/rentals?tour=true");
    }
  };

  const { data: userId } = useQuery({
    queryKey: ["current-user-id"],
    queryFn: async () => {
      const { default: authService } = await import("@/services/authService");
      const user = await authService.getCurrentUser();
      return user?.id ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const canSwitchToManager = isManager && activeRole !== "manager";
  const canSwitchToTenant = activeRole !== "tenant";

  const handleSwitchRole = (role: "manager" | "tenant") => {
    const showTour = userId && shouldShowRoleSwitchTour(userId, role);
    if (showTour) {
      markRoleSwitchTourSeen(userId, role);
    }
    const target = role === "manager" ? "/properties" : "/rentals";
    const url = showTour ? `${target}?tour=true` : target;
    switchRole(role, url);
  };

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-white hover:text-white hover:bg-white/20"
          aria-label={t('header.myAccount')}
        >
          <UserCircle className="h-5 w-5" />
          <span className="text-sm hidden sm:inline">{email}</span>
          <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0 h-4 border-white/30 text-white/80">
            {activeRole === "manager" ? t('common.manager') || 'Manager' : t('common.tenant') || 'Tenant'}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-2">
          <UserCircle className="h-4 w-4" />
          {email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          {t('roles.currently') || 'Currently'}: <span className="font-medium text-foreground">
            {activeRole === "manager" ? t('common.manager') || 'Manager' : t('common.tenant') || 'Tenant'}
          </span>
        </div>

        {canSwitchToManager && (
          <DropdownMenuItem onClick={() => handleSwitchRole("manager")} className="gap-2">
            <Building2 className="h-4 w-4 text-blue-500" />
            <span>{t('roles.switchToManager') || 'Switch to Manager'}</span>
          </DropdownMenuItem>
        )}
        {canSwitchToTenant && (
          <DropdownMenuItem onClick={() => handleSwitchRole("tenant")} className="gap-2">
            <Home className="h-4 w-4 text-green-500" />
            <span>{t('roles.switchToTenant') || 'Switch to Tenant'}</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/account")}>
          <UserCircle className="mr-2 h-4 w-4" />
          {t('account.profile')}
        </DropdownMenuItem>
        {activeRole === "manager" && (
          <DropdownMenuItem onClick={() => navigate("/configuration")}>
            <Settings className="mr-2 h-4 w-4" />
            {t('configuration.title')}
          </DropdownMenuItem>
        )}
        {isAdmin && (
          <DropdownMenuItem onClick={() => navigate("/admin")}>
            <ShieldCheck className="mr-2 h-4 w-4" />
            {t('header.admin')}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setGuideOpen(true)}>
          <Lightbulb className="mr-2 h-4 w-4 text-yellow-500" />
          {t('header.help')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          {t('header.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <GuideDialog
      open={guideOpen}
      onOpenChange={setGuideOpen}
      onStartTour={handleStartTour}
    />
    </>
  );
}
