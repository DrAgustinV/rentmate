import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Users, Shield, ArrowRight, Settings, LayoutDashboard, ShieldCheck, CheckCircle, FileCheck, Key } from "lucide-react";
import heroProperty from "@/assets/hero-property.jpg";
import { useBrand } from "@/contexts/BrandContext";

const Index = () => {
  const navigate = useNavigate();
  const { brandName, logoUrl, logoAlt, tagline } = useBrand();

return (
  <div className="min-h-screen relative overflow-hidden">
    {/* Background Image with Overlay */}
    <div
      className="absolute inset-0 bg-cover bg-center opacity-50"
      style={{ backgroundImage: `url(${heroProperty})` }}
    />
    <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-primary/20" />
    <div className="container mx-auto px-4 py-16 relative z-10">
      <div className="text-center mb-16 animate-fade-in">
        <div className="flex justify-left mb-6">
          <img src={logoUrl} alt={logoAlt} className="h-10 w-10 md:h-15 md:w-15" />
        </div>
        <h1 className="text-5xl md:text-6xl font-bold mb-4 gradient-text">{brandName}</h1>
        <p className="text-xl text-muted-foreground mb-8">{tagline}</p>
        <div className="flex gap-4 justify-center">
          <Button size="lg" onClick={() => navigate("/auth?mode=signup")} className="gap-2">
            Get Started
            <ArrowRight className="h-5 w-5" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/auth?mode=signin")}>
            Sign In
          </Button>
        </div>
      </div>

      {/* For Property Managers */}
      <div className="text-center mb-8 mt-20">
        <h2 className="text-3xl font-bold mb-2">For Property Managers</h2>
      </div>
      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        <div className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-6 shadow-card hover-lift animate-slide-up">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Automated Operations</h3>
          <p className="text-muted-foreground">
            Streamline rent collection, maintenance, and document workflows.
          </p>
        </div>

        <div
          className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-6 shadow-card hover-lift animate-slide-up"
          style={{ animationDelay: "100ms" }}
        >
          <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-4">
            <LayoutDashboard className="h-6 w-6 text-accent" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Centralized Control</h3>
          <p className="text-muted-foreground">
            Manage your entire property portfolio and tenant communications from one dashboard.
          </p>
        </div>

        <div
          className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-6 shadow-card hover-lift animate-slide-up"
          style={{ animationDelay: "200ms" }}
        >
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Reduced Risk</h3>
          <p className="text-muted-foreground">
            Ensure compliance with verified tenant identities and legally-sound digital contracts.
          </p>
        </div>
      </div>

      {/* For Tenants */}
      <div className="text-center mb-8 mt-20">
        <h2 className="text-3xl font-bold mb-2">For Tenants</h2>
      </div>
      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
        <div
          className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-6 shadow-card hover-lift animate-slide-up"
          style={{ animationDelay: "300ms" }}
        >
          <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-4">
            <CheckCircle className="h-6 w-6 text-accent" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Effortless Renting</h3>
          <p className="text-muted-foreground">
            Handle payments, documents, and issue reporting all in one place.
          </p>
        </div>

        <div
          className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-6 shadow-card hover-lift animate-slide-up"
          style={{ animationDelay: "400ms" }}
        >
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <FileCheck className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Total Transparency</h3>
          <p className="text-muted-foreground">
            Track rent payments, maintenance requests, and communications clearly.
          </p>
        </div>

        <div
          className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-6 shadow-card hover-lift animate-slide-up"
          style={{ animationDelay: "500ms" }}
        >
          <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-4">
            <Key className="h-6 w-6 text-accent" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Move-In Ready</h3>
          <p className="text-muted-foreground">
            Securely verify your identity and sign contracts digitally for a faster start.
          </p>
        </div>
      </div>
    </div>
  </div>
  );
};

export default Index;
