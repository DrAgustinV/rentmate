import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useBrand } from "@/contexts/BrandContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ShieldCheck, CreditCard, Bell, Home, ArrowLeft } from "lucide-react";
import heroProperty from "@/assets/hero-property.jpg";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

export function AuthLayout({ children, title, description }: AuthLayoutProps) {
  const { brandName, logoUrl, logoAlt, tagline } = useBrand();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        {/* Background Image */}
        <img 
          src={heroProperty} 
          alt="Property" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/85 via-primary/70 to-accent/60" />
        
        {/* Content */}
        <div className="relative z-10 p-12 flex flex-col justify-between text-primary-foreground w-full">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt={logoAlt} className="h-10 w-10" />
            <span className="text-2xl font-bold">{brandName}</span>
          </div>
          
          {/* Value Propositions */}
          <div className="space-y-8">
            <h2 className="text-3xl font-bold leading-tight">
              {t('auth.valueProps.title')}
            </h2>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{t('auth.valueProps.secure.title')}</h3>
                  <p className="text-primary-foreground/80 text-sm">
                    {t('auth.valueProps.secure.description')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center flex-shrink-0">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{t('auth.valueProps.automated.title')}</h3>
                  <p className="text-primary-foreground/80 text-sm">
                    {t('auth.valueProps.automated.description')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center flex-shrink-0">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{t('auth.valueProps.realtime.title')}</h3>
                  <p className="text-primary-foreground/80 text-sm">
                    {t('auth.valueProps.realtime.description')}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Trust Badge */}
          <p className="text-sm text-primary-foreground/70">
            {t('auth.trustBadge')}
          </p>
        </div>
      </div>
      
      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col bg-background">
        {/* Mini Header */}
        <div className="p-4 flex justify-between items-center border-b border-border">
          <Link 
            to="/" 
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('auth.backToHome')}
          </Link>
          <Link 
            to="/pricing" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('header.pricing')}
          </Link>
        </div>
        
        {/* Centered Form */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            {/* Mobile Logo - Only shown on mobile */}
            <div className="flex items-center justify-center gap-3 mb-8 lg:hidden">
              <img src={logoUrl} alt={logoAlt} className="h-10 w-10" />
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {brandName}
              </span>
            </div>
            
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-2">{title}</h2>
              {description && <p className="text-muted-foreground">{description}</p>}
            </div>
            
            <div className="bg-card border border-border rounded-lg shadow-card p-6">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
