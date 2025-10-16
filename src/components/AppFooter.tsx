import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { BRAND_NAME, BRAND_TAGLINE, BRAND_EMAIL, BRAND_CONFIG } from "@/config/brand.config";

export function AppFooter() {
  const currentYear = new Date().getFullYear();
  const { t } = useLanguage();

  return (
    <footer className="border-t border-border bg-muted/30 mt-auto">
      <div className="container py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand Section */}
          <div className="space-y-3">
            <div className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {BRAND_NAME}
            </div>
            <p className="text-sm text-muted-foreground">
              {BRAND_TAGLINE}
            </p>
            <p className="text-xs text-muted-foreground">
              © {currentYear} {BRAND_NAME}. {t('footer.rights')}
            </p>
          </div>

          {/* Links Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Resources</h3>
            <nav className="flex flex-col gap-2">
              <Link to="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                {t('footer.about')}
              </Link>
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                {t('footer.privacy')}
              </Link>
              <Link to="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                {t('footer.terms')}
              </Link>
              <Link to="/help" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                {t('footer.help')}
              </Link>
            </nav>
          </div>

          {/* Contact/Info Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Support</h3>
            <div className="flex flex-col gap-2">
              <a
                href={`mailto:${BRAND_EMAIL}`}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {BRAND_EMAIL}
              </a>
              <p className="text-xs text-muted-foreground">
                Version {BRAND_CONFIG.version}
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
