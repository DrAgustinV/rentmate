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
import { Home, Menu, Settings, LogOut, UserCircle, Bell, ShieldCheck, Building, Handshake, FolderOpen, Users, DollarSign } from "lucide-react";
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

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, anchor: string) => {
    e.preventDefault();
    if (location.pathname !== '/') {
      navigate('/' + anchor);
    } else {
      const element = document.querySelector(anchor);
      element?.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  // Logo Pill Component - Shared between anonymous and authenticated
  const LogoPill = ({ linkTo }: { linkTo: string }) => (
    <Link to={linkTo} className="flex items-center">
      <div className="flex items-center gap-2 bg-white/90 rounded-full px-3 py-1.5 shadow-sm">
        {/* Circular RE monogram */}
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'hsl(var(--header-background))' }}
        >
          <span className="text-white font-bold text-sm">RE</span>
        </div>
        {/* Brand name */}
        <span 
          className="font-bold text-lg tracking-tight"
          style={{ color: 'hsl(var(--header-background))' }}
        >
          {brandName}
        </span>
      </div>
    </Link>
  );

  // Anonymous user navigation
  if (!user) {
    const anonNavLinks = [
      { path: "/", label: t('header.home'), isAnchor: false },
      { path: "#managers", label: t('header.forManagers'), isAnchor: true },
      { path: "#tenants", label: t('header.forTenants'), isAnchor: true },
      { path: "/pricing", label: t('header.pricing'), isAnchor: false },
    ];

    return (
      <header className="sticky top-0 z-50 w-full" style={{ backgroundColor: 'hsla(var(--header-background), var(--header-background-opacity))' }}>
        <div className="container flex h-16 items-center justify-between">
          {/* Logo Pill */}
          <LogoPill linkTo="/" />

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {anonNavLinks.map((link) => (
              link.isAnchor ? (
                <a
                  key={link.path}
                  href={link.path}
                  onClick={(e) => handleAnchorClick(e, link.path)}
                  className="text-sm font-medium transition-colors hover:text-white/80 text-white/90"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-sm font-medium transition-colors hover:text-white/80 ${
                    isActive(link.path) ? "text-white" : "text-white/90"
                  }`}
                >
                  {link.label}
                </Link>
              )
            ))}
          </nav>

          {/* Auth Buttons (Desktop) */}
          <div className="hidden md:flex items-center gap-2">
            <LanguageSwitcher />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/auth?mode=signin")}
              className="text-white hover:text-white hover:bg-white/20"
            >
              {t('landing.signIn')}
            </Button>
            <Button 
              size="sm" 
              onClick={() => navigate("/auth?mode=signup")}
              className="bg-white hover:bg-white/90"
              style={{ color: 'hsl(var(--header-background))' }}
            >
              {t('landing.getStarted')}
            </Button>
          </div>

          {/* Mobile Menu */}
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
                <div className="mb-4">
                  <LanguageSwitcher />
                </div>
                <div className="flex flex-col gap-2">
                  {anonNavLinks.map((link) => (
                    link.isAnchor ? (
                      <Button
                        key={link.path}
                        variant="ghost"
                        className="justify-start"
                        onClick={() => {
                          if (location.pathname !== '/') {
                            navigate('/' + link.path);
                          } else {
                            const element = document.querySelector(link.path);
                            element?.scrollIntoView({ behavior: 'smooth' });
                          }
                          setMobileMenuOpen(false);
                        }}
                      >
                        {link.label}
                      </Button>
                    ) : (
                      <Button
                        key={link.path}
                        variant={isActive(link.path) ? "default" : "ghost"}
                        className="justify-start"
                        onClick={() => {
                          navigate(link.path);
                          setMobileMenuOpen(false);
                        }}
                      >
                        {link.label}
                      </Button>
                    )
                  ))}
                </div>
                <div className="flex flex-col gap-2 pt-4 border-t border-border">
                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => {
                      navigate("/auth?mode=signin");
                      setMobileMenuOpen(false);
                    }}
                  >
                    {t('landing.signIn')}
                  </Button>
                  <Button
                    className="justify-start"
                    onClick={() => {
                      navigate("/auth?mode=signup");
                      setMobileMenuOpen(false);
                    }}
                  >
                    {t('landing.getStarted')}
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>
    );
  }

  // Authenticated user navigation - show Properties for ALL users
  const navLinks = [
    { path: "/properties", label: t('properties.title'), icon: Building },
    { path: "/rentals", label: t('rentals.title'), icon: Handshake, badge: !isManager ? pendingInvitations : undefined },
  ];
  
  if (isManager) {
    navLinks.push({ path: "/configuration", label: t('configuration.title'), icon: FolderOpen });
  }

  if (isAdmin) {
    navLinks.push({ path: "/admin", label: t('header.admin'), icon: ShieldCheck });
  }

  return (
    <header className="sticky top-0 z-50 w-full" style={{ backgroundColor: 'hsla(var(--header-background), var(--header-background-opacity))' }}>
      <div className="container flex h-16 items-center justify-between">
        {/* Logo Pill */}
        <LogoPill linkTo={isManager ? "/properties" : "/dashboard"} />

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-white/80 ${
                isActive(link.path) ? "text-white" : "text-white/90"
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2 text-white hover:text-white hover:bg-white/20"
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
