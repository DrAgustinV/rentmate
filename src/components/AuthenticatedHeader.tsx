import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { UserCircle, Settings, LogOut, Menu, Lightbulb, Building, Handshake, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useLanguage } from "@/contexts/LanguageContext";
import { LogoPill } from "@/components/LogoPill";
import { UserMenu } from "@/components/UserMenu";
import { useUserRoles } from "@/hooks/useUserRoles";
import { usePendingInvitations } from "@/hooks/usePendingInvitations";
import { GuideDialog } from "@/components/welcome/GuideDialog";
import { useRole } from "@/contexts/RoleContext";

interface AuthenticatedHeaderProps {
  user: User;
  onSignOut: () => void;
}

export function AuthenticatedHeader({ user, onSignOut }: AuthenticatedHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const { isAdmin, isManager } = useUserRoles(user.id);
  const pendingInvitations = usePendingInvitations(user.email);
  const { activeRole } = useRole();

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const isOnPropertiesPage = location.pathname.startsWith("/properties");
  const isOnRentalsPage = location.pathname.startsWith("/rentals");

  const handleStartTour = () => {
    if (isOnPropertiesPage || isOnRentalsPage) {
      navigate(`${location.pathname}?tour=true`);
    } else {
      navigate(isManager ? "/properties?tour=true" : "/rentals?tour=true");
    }
  };

  const closeMobile = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 w-full" style={{ backgroundColor: 'hsl(var(--header-background) / var(--header-background-opacity))' }}>
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <LogoPill linkTo={activeRole === "manager" ? "/properties" : "/rentals"} />
          <Badge
            variant="secondary"
            className="hidden sm:inline-flex text-[10px] px-2 py-0 h-5"
          >
            {activeRole === "manager" ? t('common.manager') || 'Manager' : t('common.tenant') || 'Tenant'}
          </Badge>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <UserMenu email={user.email} isManager={isManager} isAdmin={isAdmin} onSignOut={onSignOut} />
        </div>

        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="sm" aria-label={t('header.menu')} className="text-white hover:bg-white/20">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>{t('header.menu')}</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-4 mt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <UserCircle className="h-4 w-4" />
                <span className="truncate">{user.email}</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                  {activeRole === "manager" ? t('common.manager') || 'Manager' : t('common.tenant') || 'Tenant'}
                </Badge>
              </div>
              <div className="flex flex-col gap-2">
                {activeRole === "manager" && (
                  <Button
                    variant={isActive("/properties") ? "default" : "ghost"}
                    className="justify-start gap-2"
                    onClick={() => { navigate("/properties"); closeMobile(); }}
                  >
                    <Building className="h-4 w-4" />
                    {t('properties.title')}
                  </Button>
                )}
                <Button
                  variant={isActive("/rentals") ? "default" : "ghost"}
                  className="justify-start gap-2"
                  onClick={() => { navigate("/rentals"); closeMobile(); }}
                >
                  <Handshake className="h-4 w-4" />
                  {t('rentals.title')}
                  {!isManager && pendingInvitations ? (
                    <Badge variant="destructive" className="ml-auto">{pendingInvitations}</Badge>
                  ) : null}
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start gap-2"
                  onClick={() => { setGuideOpen(true); closeMobile(); }}
                >
                  <Lightbulb className="h-4 w-4" />
                  {t('welcome.tips')}
                </Button>
              </div>
              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                <Button
                  variant={isActive("/account") ? "default" : "ghost"}
                  className="justify-start gap-2"
                  onClick={() => { navigate("/account"); closeMobile(); }}
                >
                  <UserCircle className="h-4 w-4" />
                  {t('account.profile')}
                </Button>
                {activeRole === "manager" && (
                  <>
                    <Button
                      variant={isActive("/configuration") ? "default" : "ghost"}
                      className="justify-start gap-2"
                      onClick={() => { navigate("/configuration"); closeMobile(); }}
                      data-tour="nav-configuration"
                    >
                      <Settings className="h-4 w-4" />
                      {t('configuration.title')}
                    </Button>
                    <Button
                      variant={isActive("/workflow") ? "default" : "ghost"}
                      className="justify-start gap-2"
                      onClick={() => { navigate("/workflow"); closeMobile(); }}
                    >
                      <GitBranch className="h-4 w-4" />
                      {t('workflow.title')}
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  className="justify-start gap-2 text-destructive hover:text-destructive"
                  onClick={() => { onSignOut(); closeMobile(); }}
                >
                  <LogOut className="h-4 w-4" />
                  {t('header.signOut')}
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <GuideDialog
          open={guideOpen}
          onOpenChange={setGuideOpen}
          onStartTour={handleStartTour}
        />
      </div>
    </header>
  );
}
