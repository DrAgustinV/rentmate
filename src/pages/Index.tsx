import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Settings, LayoutDashboard, ShieldCheck, CheckCircle, FileCheck, Key, Banknote, FileSignature, Wrench, UserCheck } from "lucide-react";
import heroProperty from "@/assets/hero-property.jpg";
import { useBrand } from "@/contexts/BrandContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { useRef } from "react";

const Index = () => {
  const navigate = useNavigate();
  const { tagline } = useBrand();
  const { t } = useLanguage();
  
  const autoplayPlugin = useRef(
    Autoplay({ delay: 3000, stopOnInteraction: false })
  );

  const carouselItems = [
    {
      icon: Banknote,
      title: t('landing.carousel.rent.title'),
      description: t('landing.carousel.rent.description'),
    },
    {
      icon: FileSignature,
      title: t('landing.carousel.contracts.title'),
      description: t('landing.carousel.contracts.description'),
    },
    {
      icon: Wrench,
      title: t('landing.carousel.maintenance.title'),
      description: t('landing.carousel.maintenance.description'),
    },
    {
      icon: UserCheck,
      title: t('landing.carousel.verification.title'),
      description: t('landing.carousel.verification.description'),
    },
  ];

return (
  <div className="min-h-screen flex flex-col">
    <AppHeader />
    
    {/* Background Image with Overlay */}
    <div
      className="absolute inset-0 bg-cover bg-center opacity-50"
      style={{ backgroundImage: `url(${heroProperty})` }}
    />
    <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-primary/20" />
    <div className="container mx-auto px-4 py-16 relative z-10 pt-24">
      <div className="text-center mb-16 animate-fade-in">
        {/* Promotional Headline */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold gradient-text mb-4">
          {t('landing.headline')}
        </h1>
        <p className="text-xl text-muted-foreground mb-8">{tagline}</p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Button size="lg" onClick={() => navigate("/auth?mode=signup")} className="gap-2">
            {t('landing.getStarted')}
            <ArrowRight className="h-5 w-5" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/pricing")}>
            {t('header.pricing')}
          </Button>
          <Button size="lg" variant="ghost" onClick={() => navigate("/auth?mode=signin")}>
            {t('landing.signIn')}
          </Button>
        </div>
      </div>

      {/* Feature Carousel */}
      <div className="max-w-4xl mx-auto mb-20">
        <Carousel
          plugins={[autoplayPlugin.current]}
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {carouselItems.map((item, index) => (
              <CarouselItem key={index} className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3">
                <div className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-6 h-full shadow-card hover-lift">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>

      {/* For Property Managers */}
      <div id="managers" className="text-center mb-8 scroll-mt-24">
        <h2 className="text-3xl font-bold mb-2">{t('landing.forManagers')}</h2>
      </div>
      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        <div className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-6 shadow-card hover-lift animate-slide-up">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">{t('landing.managers.automatedOps.title')}</h3>
          <p className="text-muted-foreground">
            {t('landing.managers.automatedOps.description')}
          </p>
        </div>

        <div
          className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-6 shadow-card hover-lift animate-slide-up"
          style={{ animationDelay: "100ms" }}
        >
          <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-4">
            <LayoutDashboard className="h-6 w-6 text-accent" />
          </div>
          <h3 className="text-xl font-semibold mb-2">{t('landing.managers.centralizedControl.title')}</h3>
          <p className="text-muted-foreground">
            {t('landing.managers.centralizedControl.description')}
          </p>
        </div>

        <div
          className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-6 shadow-card hover-lift animate-slide-up"
          style={{ animationDelay: "200ms" }}
        >
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">{t('landing.managers.reducedRisk.title')}</h3>
          <p className="text-muted-foreground">
            {t('landing.managers.reducedRisk.description')}
          </p>
        </div>
      </div>

      {/* For Tenants */}
      <div id="tenants" className="text-center mb-8 mt-20 scroll-mt-24">
        <h2 className="text-3xl font-bold mb-2">{t('landing.forTenants')}</h2>
      </div>
      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
        <div
          className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-6 shadow-card hover-lift animate-slide-up"
          style={{ animationDelay: "300ms" }}
        >
          <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-4">
            <CheckCircle className="h-6 w-6 text-accent" />
          </div>
          <h3 className="text-xl font-semibold mb-2">{t('landing.tenants.effortlessRenting.title')}</h3>
          <p className="text-muted-foreground">
            {t('landing.tenants.effortlessRenting.description')}
          </p>
        </div>

        <div
          className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-6 shadow-card hover-lift animate-slide-up"
          style={{ animationDelay: "400ms" }}
        >
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <FileCheck className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">{t('landing.tenants.totalTransparency.title')}</h3>
          <p className="text-muted-foreground">
            {t('landing.tenants.totalTransparency.description')}
          </p>
        </div>

        <div
          className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-6 shadow-card hover-lift animate-slide-up"
          style={{ animationDelay: "500ms" }}
        >
          <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-4">
            <Key className="h-6 w-6 text-accent" />
          </div>
          <h3 className="text-xl font-semibold mb-2">{t('landing.tenants.moveInReady.title')}</h3>
          <p className="text-muted-foreground">
            {t('landing.tenants.moveInReady.description')}
          </p>
        </div>
      </div>
    </div>
    
    <AppFooter />
  </div>
  );
};

export default Index;
