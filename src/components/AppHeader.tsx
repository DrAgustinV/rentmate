import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Home, Menu, Settings, LogOut, UserCircle, Bell, ShieldCheck, Building, Handshake, FolderOpen, CreditCard } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBrand } from "@/contexts/BrandContext";

export function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useLanguage();
  const { brandName, logoUrl, logoAlt } = useBrand();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      checkAdminRole();
      checkManagerRole();
      fetchPendingInvitations();
    }
  }, [user]);

  const checkAdminRole = async () => {
    if (!user) return;
    const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    setIsAdmin(data || false);
  };

  const checkManagerRole = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("properties")
      .select("id")
      .eq("manager_id", user.id)
      .limit(1);
    setIsManager(data && data.length > 0);
  };

  const fetchPendingInvitations = async () => {
    if (!user || !user.email) return;
    const { count } = await supabase
      .from("invitations")
      .select("*", { count: "exact", head: true })
      .eq("email", user.email)
      .eq("status", "pending");
    setPendingInvitations(count || 0);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const isActive = (path: string) => 
    location.pathname === path || location.pathname.startsWith(path + '/');

  if (!user) return null;

  const navLinks = isManager
    ? [
        // { path: "/dashboard", label: t('header.dashboard'), icon: Home }, // Hidden for now
        { path: "/properties", label: t('properties.title'), icon: Building },
        { path: "/renting", label: t('renting.title'), icon: Handshake },
        { path: "/configuration", label: t('configuration.title'), icon: FolderOpen },
        { path: "/pricing", label: "Pricing", icon: CreditCard },
      ]
    : [
        // { path: "/dashboard", label: t('header.dashboard'), icon: Home }, // Hidden for now
        { path: "/renting", label: t('renting.title'), icon: Handshake, badge: pendingInvitations },
        { path: "/pricing", label: "Pricing", icon: CreditCard },
        { path: "/settings", label: t('header.settings'), icon: Settings },
      ];

  if (isAdmin) {
    navLinks.push({ path: "/admin", label: t('header.admin'), icon: ShieldCheck });
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to={isManager ? "/properties" : "/dashboard"} className="flex items-center gap-2">
          <img src={logoUrl} alt={logoAlt} className="h-8 w-8" />
          <div className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {brandName}
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary ${
                isActive(link.path) ? "text-primary" : "text-muted-foreground"
              }`}
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

        {/* User Menu (Desktop) */}
        <div className="hidden md:flex items-center gap-2">
          <LanguageSwitcher />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2"
                aria-label={t('header.myAccount')}
              >
                <UserCircle className="h-5 w-5" />
                <span className="text-sm">{user.email}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{t('header.myAccount')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/account")}>
                <UserCircle className="mr-2 h-4 w-4" />
                {t('account.profile')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <CreditCard className="mr-2 h-4 w-4" />
                {t('account.plansCredits')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                {t('header.signOut')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile Menu */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="sm" aria-label={t('header.menu')}>
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
              <div className="mb-4">
                <LanguageSwitcher />
              </div>
              <div className="flex flex-col gap-2">
                {navLinks.map((link) => (
                  <Button
                    key={link.path}
                    variant={isActive(link.path) ? "default" : "ghost"}
                    className="justify-start gap-2"
                    onClick={() => {
                      navigate(link.path);
                      setMobileMenuOpen(false);
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
                <Button
                  variant="ghost"
                  className="justify-start gap-2 text-destructive hover:text-destructive"
                  onClick={() => {
                    handleSignOut();
                    setMobileMenuOpen(false);
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
