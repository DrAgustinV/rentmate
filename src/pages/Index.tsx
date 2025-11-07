import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Users, Shield, ArrowRight } from "lucide-react";
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

      {/* First Row - Original 3 divs */}
      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-20">
        <div className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-6 shadow-card hover-lift animate-slide-up">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Home className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Manage Properties</h3>
          <p className="text-muted-foreground">
            Create and manage multiple properties with ease. Track all your rental units in one place.
          </p>
        </div>

        <div
          className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-6 shadow-card hover-lift animate-slide-up"
          style={{ animationDelay: "100ms" }}
        >
          <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-4">
            <Users className="h-6 w-6 text-accent" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Invite Tenants</h3>
          <p className="text-muted-foreground">
            Easily invite and manage tenants for your properties. Keep everyone connected and informed.
          </p>
        </div>

        <div
          className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-6 shadow-card hover-lift animate-slide-up"
          style={{ animationDelay: "200ms" }}
        >
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Secure & Reliable</h3>
          <p className="text-muted-foreground">
            Role-based access control ensures your data is protected and only accessible to authorized users.
          </p>
        </div>
      </div>

      {/* Second Row - New 3 divs */}
      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-12">
        <div
          className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-6 shadow-card hover-lift animate-slide-up"
          style={{ animationDelay: "300ms" }}
        >
          <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-4">
            <FileText className="h-6 w-6 text-accent" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Track Payments</h3>
          <p className="text-muted-foreground">
            Monitor rent payments and financial transactions. Get real-time updates on your property income.
          </p>
        </div>

        <div
          className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-6 shadow-card hover-lift animate-slide-up"
          style={{ animationDelay: "400ms" }}
        >
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <MessageSquare className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Communication Hub</h3>
          <p className="text-muted-foreground">
            Streamline communication between landlords and tenants with built-in messaging and announcements.
          </p>
        </div>

        <div
          className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-6 shadow-card hover-lift animate-slide-up"
          style={{ animationDelay: "500ms" }}
        >
          <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-4">
            <BarChart3 className="h-6 w-6 text-accent" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Analytics & Reports</h3>
          <p className="text-muted-foreground">
            Gain insights with detailed analytics and reports on property performance and tenant activity.
          </p>
        </div>
      </div>
    </div>
  </div>
);

export default Index;
