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
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { useRef } from "react";
import { useBrandSettings, type CarouselItem as CarouselItemType } from "@/hooks/useBrandSettings";

// Default fallback carousel items
const defaultCarouselItems: CarouselItemType[] = [
  {
    image_url: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&auto=format&fit=crop",
    title: { en: "Simple Payment Tracking", es: "Seguimiento de Pagos Simple" },
    description: { en: "Track rent payments and never miss a due date", es: "Sigue los pagos de alquiler y nunca pierdas una fecha" },
  },
  {
    image_url: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&auto=format&fit=crop",
    title: { en: "Digital Contracts", es: "Contratos Digitales" },
    description: { en: "Sign contracts digitally with legal validity", es: "Firma contratos digitalmente con validez legal" },
  },
  {
    image_url: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop",
    title: { en: "Smart Maintenance", es: "Mantenimiento Inteligente" },
    description: { en: "Track and schedule property maintenance tasks", es: "Gestiona y programa tareas de mantenimiento" },
  },
  {
    image_url: "https://images.unsplash.com/photo-1633265486064-086b219458ec?w=800&auto=format&fit=crop",
    title: { en: "Verified Tenants", es: "Inquilinos Verificados" },
    description: { en: "ID verification for trusted tenancies", es: "Verificación de identidad para arrendamientos de confianza" },
  },
];

const Index = () => {
  const navigate = useNavigate();
  const { tagline } = useBrand();
  const { language, t } = useLanguage();
  const { settings } = useBrandSettings();
  
  const autoplayPlugin = useRef(
    Autoplay({ delay: 4000, stopOnInteraction: false })
  );

  // Use database carousel items with fallback to defaults
  const carouselItems = (settings?.carousel_items && settings.carousel_items.length > 0)
    ? settings.carousel_items
    : defaultCarouselItems;

return (
  <div className="min-h-screen flex flex-col">
    <AppHeader />
    
    {/* Background Video with Overlay */}
    <video
      autoPlay
      muted
      loop
      playsInline
      className="absolute inset-0 w-full h-full object-cover opacity-50"
    >
      <source src="/hero-bg.mp4" type="video/mp4" />
      Your browser does not support the video tag.
    </video>
    
    {/* Background Image with Overlay - COMMENTED OUT */}
    {/* <div
      className="absolute inset-0 bg-cover bg-center opacity-50"
      style={{ backgroundImage: `url(${heroProperty})` }}
    /> */}
    
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

      {/* Feature Carousel - COMMENTED OUT */}
      {/* <div className="max-w-5xl mx-auto mb-20 px-12">
        <Carousel
          plugins={[autoplayPlugin.current]}
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-3">
            {carouselItems.map((item, index) => {
              const title = item.title[language] || item.title['en'] || '';
              const description = item.description[language] || item.description['en'] || '';
              
              return (
                <CarouselItem key={index} className="pl-3 basis-full sm:basis-1/2 lg:basis-1/3">
                  <div className="bg-card/90 backdrop-blur-sm border border-border rounded-xl overflow-hidden shadow-card hover-lift h-full">
                    <div className="h-32 md:h-40 overflow-hidden">
                      <img 
                        src={item.image_url} 
                        alt={title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4 text-center">
                      <h3 className="text-base md:text-lg font-semibold mb-2 line-clamp-1">{title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
                    </div>
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselPrevious className="hidden sm:flex" />
          <CarouselNext className="hidden sm:flex" />
        </Carousel>
      </div> */}

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
