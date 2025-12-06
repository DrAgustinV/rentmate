import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Settings, LayoutDashboard, ShieldCheck, CheckCircle, FileCheck, Key } from "lucide-react";
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
    Autoplay({ delay: 4000, stopOnInteraction: false })
  );

  const carouselItems = [
    {
      image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&auto=format&fit=crop",
      title: t('landing.carousel.rent.title'),
      description: t('landing.carousel.rent.description'),
    },
    {
      image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&auto=format&fit=crop",
      title: t('landing.carousel.contracts.title'),
      description: t('landing.carousel.contracts.description'),
    },
    {
      image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop",
      title: t('landing.carousel.maintenance.title'),
      description: t('landing.carousel.maintenance.description'),
    },
    {
      image: "https://images.unsplash.com/photo-1633265486064-086b219458ec?w=800&auto=format&fit=crop",
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
              <Button size="lg" variant="outline" onClick={() => navigate("/auth?mode=signin")}>
                {t('landing.signIn')}
              </Button>
              <Button size="lg" onClick={() => navigate("/auth?mode=signup")} className="gap-2">
                {t('landing.getStarted')}
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
      </div>

      {/* Feature Carousel */}
      <div className="max-w-3xl mx-auto mb-20">
        <Carousel
          plugins={[autoplayPlugin.current]}
          opts={{
            align: "center",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-4">
            {carouselItems.map((item, index) => (
              <CarouselItem key={index} className="pl-4 basis-full">
                <div className="bg-card/90 backdrop-blur-sm border border-border rounded-xl overflow-hidden shadow-card hover-lift">
                  <div className="h-48 md:h-64 overflow-hidden">
                    <img 
                      src={item.image} 
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-6 md:p-8 text-center">
                    <h3 className="text-xl md:text-2xl font-semibold mb-3">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </div>
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
