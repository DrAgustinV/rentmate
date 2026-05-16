import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LogoPill } from "@/components/LogoPill";

export function AnonymousHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { path: "/", label: t('header.home'), isAnchor: false },
    { path: "#managers", label: t('header.forManagers'), isAnchor: true },
    { path: "#tenants", label: t('header.forTenants'), isAnchor: true },
    { path: "/pricing", label: t('header.pricing'), isAnchor: false },
  ];

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

  return (
    <header className="sticky top-0 z-50 w-full" style={{ backgroundColor: 'hsl(var(--header-background) / var(--header-background-opacity))' }}>
      <div className="container flex h-16 items-center justify-between">
        <LogoPill linkTo="/" />

        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) =>
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
                className={`text-sm font-medium transition-colors hover:text-white/80 ${isActive(link.path) ? "text-white" : "text-white/90"}`}
              >
                {link.label}
              </Link>
            )
          )}
        </nav>

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
          >
            {t('landing.getStarted')}
          </Button>
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
              <div className="mb-4">
                <LanguageSwitcher />
              </div>
              <div className="flex flex-col gap-2">
                {navLinks.map((link) =>
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
                )}
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
