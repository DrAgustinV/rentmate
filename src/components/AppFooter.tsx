import { Link } from "react-router-dom";

export function AppFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-muted/30 mt-auto">
      <div className="container py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand Section */}
          <div className="space-y-3">
            <div className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              FlatMate
            </div>
            <p className="text-sm text-muted-foreground">
              Modern Property Management Made Simple
            </p>
            <p className="text-xs text-muted-foreground">
              © {currentYear} FlatMate. All rights reserved.
            </p>
          </div>

          {/* Links Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Resources</h3>
            <nav className="flex flex-col gap-2">
              <Link to="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                About
              </Link>
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Terms of Service
              </Link>
              <Link to="/help" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Help & Support
              </Link>
            </nav>
          </div>

          {/* Contact/Info Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Support</h3>
            <div className="flex flex-col gap-2">
              <a
                href="mailto:support@flatmate.app"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                support@flatmate.app
              </a>
              <p className="text-xs text-muted-foreground">
                Version 1.0.0
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
