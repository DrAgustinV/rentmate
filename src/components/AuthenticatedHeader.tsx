import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import type { LucideIcon } from "lucide-react";
import { Building, Handshake, ShieldCheck, UserCircle, Settings, LogOut, Menu } from "lucide-react";
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

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

interface AuthenticatedHeaderProps {
  user: User;
  onSignOut: () => void;
}

export function AuthenticatedHeader({ user, onSignOut }: AuthenticatedHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAdmin, isManager } = useUserRoles(user.id);
  const pendingInvitations = usePendingInvitations(user.email);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const navLinks: NavItem[] = [
    { path: "/properties", label: t('properties.title'), icon: Building },
    { path: "/rentals", label: t('rentals.title'), icon: Handshake, badge: !isManager ? pendingInvitations : undefined },
  ];

  if (isAdmin) {
    navLinks.push({ path: "/admin", label: t('header.admin'), icon: ShieldCheck });
  }

  const closeMobile = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 w-full" style={{ backgroundColor: 'hsl(var(--header-background) / var(--header-background-opacity))' }}>
      <div className="container flex h-16 items-center justify-between">
        <LogoPill linkTo={isManager ? "/properties" : "/dashboard"} />

        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-white/80 ${isActive(link.path) ? "text-white" : "text-white/90"}`}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
              {link.badge ? (
                <Badge variant="destructive" className="ml-1">
                  {link.badge}
                </Badge>
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <UserMenu email={user.email} isManager={isManager} onSignOut={onSignOut} />
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
              </div>
              <div className="flex flex-col gap-2">
                {navLinks.map((link) => (
                  <Button
                    key={link.path}
                    variant={isActive(link.path) ? "default" : "ghost"}
                    className="justify-start gap-2"
                    onClick={() => {
                      navigate(link.path);
                      closeMobile();
                    }}
                  >
                    <link.icon className="h-4 w-4" />
                    {link.label}
                    {link.badge ? (
                      <Badge variant="destructive" className="ml-auto">
                        {link.badge}
                      </Badge>
                    ) : null}
                  </Button>
                ))}
              </div>
              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                <Button
                  variant={isActive("/account") ? "default" : "ghost"}
                  className="justify-start gap-2"
                  onClick={() => {
                    navigate("/account");
                    closeMobile();
                  }}
                >
                  <UserCircle className="h-4 w-4" />
                  {t('account.profile')}
                </Button>
                {isManager && (
                  <Button
                    variant={isActive("/configuration") ? "default" : "ghost"}
                    className="justify-start gap-2"
                    onClick={() => {
                      navigate("/configuration");
                      closeMobile();
                    }}
                  >
                    <Settings className="h-4 w-4" />
                    {t('configuration.title')}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="justify-start gap-2 text-destructive hover:text-destructive"
                  onClick={() => {
                    onSignOut();
                    closeMobile();
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  {t('header.signOut')}
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
